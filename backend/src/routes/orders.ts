import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateUser, AuthRequest } from "../middleware/auth.js";
import { getMultipleImageUrls } from "../utils/storageAdapter.js";

const router = express.Router();
const prisma = new PrismaClient();

// POST /orders/checkout - Checkout and create order from cart
router.post("/checkout", authenticateUser, async (req: AuthRequest, res) => {
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

    // Calculate total amount
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // Create order with order items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          status: "pending",
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

      // Clear cart after successful order creation
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return newOrder;
    });

    // Fetch the complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Order created successfully",
      order: completeOrder,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    res.status(500).json({ error: "Failed to process checkout" });
  }
});

// GET /orders - Get all orders for user
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                section: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate signed URLs for product images
    const ordersWithSignedUrls = await Promise.all(
      orders.map(async (order) => {
        const orderItemsWithSignedUrls = await Promise.all(
          order.orderItems.map(async (item) => {
            const signedImageUrls = await getMultipleImageUrls(
              item.product.images || []
            );
            return {
              ...item,
              product: {
                ...item.product,
                images: signedImageUrls,
              },
            };
          })
        );
        return {
          ...order,
          orderItems: orderItemsWithSignedUrls,
        };
      })
    );

    res.json({ orders: ordersWithSignedUrls });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /orders/:orderId - Get specific order details
router.get("/:orderId", authenticateUser, async (req: AuthRequest, res) => {
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
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Generate signed URLs for product images
    const orderItemsWithSignedUrls = await Promise.all(
      order.orderItems.map(async (item) => {
        const signedImageUrls = await getMultipleImageUrls(
          item.product.images || []
        );
        return {
          ...item,
          product: {
            ...item.product,
            images: signedImageUrls,
          },
        };
      })
    );

    res.json({
      order: {
        ...order,
        orderItems: orderItemsWithSignedUrls,
      },
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
