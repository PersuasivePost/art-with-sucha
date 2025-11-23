import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import prisma from "../prisma.js";
import { sendAllNotifications } from "../utils/notifications.js";
import { authenticateUser } from "../middleware/auth.js";
const router = express.Router();
// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});
// POST /payment/create-order - Create Razorpay order
router.post("/create-order", authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Get all cart items
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: true,
            },
        });
        if (cartItems.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }
        // Calculate total amount (sum of items) and include mandatory delivery charge
        const itemsTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const DELIVERY_CHARGE = 100; // compulsory delivery fee in INR
        const totalAmount = itemsTotal + DELIVERY_CHARGE;
        // Ensure user has provided phone (mobno) and address before allowing checkout
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.mobno || !user.address) {
            return res.status(400).json({
                error: "Please add your phone number and address in your profile before checkout",
            });
        }
        // Convert amount to paise (smallest currency unit for INR)
        const amountInPaise = Math.round(totalAmount * 100);
        // Create order in database first
        const order = await prisma.$transaction(async (tx) => {
            // Create order
            const newOrder = await tx.order.create({
                data: {
                    userId,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    status: "pending",
                    paymentStatus: "pending",
                },
            });
            // Create order items
            await tx.orderItem.createMany({
                data: cartItems.map((item) => ({
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.product.price,
                })),
            });
            return newOrder;
        });
        // Create Razorpay order
        const options = {
            amount: amountInPaise, // Amount in paise
            currency: "INR",
            receipt: `order_rcptid_${order.id}`,
            notes: {
                orderId: order.id.toString(),
                userId: userId.toString(),
            },
        };
        const razorpayOrder = await razorpayInstance.orders.create(options);
        // Update order with Razorpay order ID
        await prisma.order.update({
            where: { id: order.id },
            data: {
                razorpayOrderId: razorpayOrder.id,
            },
        });
        // Return order details for checkout
        res.status(201).json({
            success: true,
            order: {
                id: order.id,
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount,
                currency: "INR",
                user: {
                    name: user.name,
                    email: user.email,
                    contact: user.mobno,
                },
            },
        });
    }
    catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            error: "Failed to create order",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// POST /payment/verify - Verify Razorpay payment signature
router.post("/verify", authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        // CRITICAL LOGGING - track who is calling verify
        console.log("=== PAYMENT VERIFY CALLED ===");
        console.log("User ID:", userId);
        console.log("Razorpay Order ID:", razorpay_order_id);
        console.log("Razorpay Payment ID:", razorpay_payment_id);
        console.log("Request Headers:", req.headers);
        console.log("Request IP:", req.ip);
        console.log("=============================");
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                error: "Missing payment verification details",
            });
        }
        // Find the order in database
        const order = await prisma.order.findFirst({
            where: {
                razorpayOrderId: razorpay_order_id,
                userId,
            },
        });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        // Verify signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
        const generatedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
        if (generatedSignature !== razorpay_signature) {
            // Signature verification failed
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: "failed",
                    status: "cancelled",
                },
            });
            return res.status(400).json({
                error: "Payment verification failed. Invalid signature.",
                success: false,
            });
        }
        // Signature is valid - BUT verify payment status with Razorpay before marking as paid
        try {
            // Fetch the actual payment from Razorpay to verify it's captured
            const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
            console.log("=== RAZORPAY PAYMENT STATUS ===");
            console.log("Payment ID:", razorpay_payment_id);
            console.log("Status:", payment.status);
            console.log("Method:", payment.method);
            console.log("Amount:", payment.amount);
            console.log("Captured:", payment.captured);
            console.log("==============================");
            // Only mark as paid if Razorpay confirms payment status is "captured"
            if (payment.status !== "captured") {
                console.log(`🚫 PAYMENT REJECTED - Status: ${payment.status} (not captured)`);
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        paymentStatus: "failed",
                        status: "cancelled",
                    },
                });
                return res.status(400).json({
                    error: `Payment not captured. Current status: ${payment.status}`,
                    success: false,
                });
            }
            console.log("✅ PAYMENT VERIFIED AND CAPTURED - Proceeding to mark as paid");
        }
        catch (fetchError) {
            console.error("Error fetching payment from Razorpay:", fetchError);
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: "failed",
                    status: "cancelled",
                },
            });
            return res.status(400).json({
                error: "Failed to verify payment with Razorpay",
                success: false,
            });
        }
        // Payment is genuinely captured - update order and clear cart
        await prisma.$transaction(async (tx) => {
            // Update order with payment details
            await tx.order.update({
                where: { id: order.id },
                data: {
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    paymentStatus: "captured",
                    status: "paid",
                },
            });
            // Clear user's cart
            await tx.cartItem.deleteMany({
                where: { userId },
            });
        });
        // Fetch full order with items and user to send notifications
        try {
            const fullOrder = await prisma.order.findUnique({
                where: { id: order.id },
                include: { user: true, orderItems: { include: { product: true } } },
            });
            if (fullOrder) {
                // Fire notifications (await to ensure delivery; replace with queue in future)
                await sendAllNotifications(fullOrder).catch((e) => console.error("sendAllNotifications error:", e));
            }
        }
        catch (err) {
            console.error("Failed to send notifications:", err);
        }
        res.json({
            success: true,
            message: "Payment verified successfully",
            orderId: order.id,
            paymentId: razorpay_payment_id,
        });
    }
    catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({
            error: "Payment verification failed",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// POST /payment/failure - Handle payment failure
router.post("/failure", authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { razorpay_order_id, error } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!razorpay_order_id) {
            return res.status(400).json({ error: "Missing order details" });
        }
        // Find and update the order
        const order = await prisma.order.findFirst({
            where: {
                razorpayOrderId: razorpay_order_id,
                userId,
            },
        });
        if (order) {
            // Mark order as failed immediately when payment failure is reported
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: "failed",
                    status: "cancelled",
                },
            });
        }
        res.json({
            success: false,
            message: "Payment failed",
            error: error || "Payment was not completed",
        });
    }
    catch (error) {
        console.error("Error handling payment failure:", error);
        res.status(500).json({ error: "Failed to process payment failure" });
    }
});
// GET /payment/status/:orderId - Get payment status for an order
router.get("/status/:orderId", authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { orderId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!orderId) {
            return res.status(400).json({ error: "Order ID is required" });
        }
        const order = await prisma.order.findFirst({
            where: {
                id: parseInt(orderId),
                userId,
            },
            select: {
                id: true,
                totalAmount: true,
                status: true,
                paymentStatus: true,
                razorpayOrderId: true,
                razorpayPaymentId: true,
                createdAt: true,
            },
        });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json({
            success: true,
            order,
        });
    }
    catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({ error: "Failed to fetch payment status" });
    }
});
export default router;
//# sourceMappingURL=payment.js.map