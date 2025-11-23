import express from "express";
import prisma from "../prisma.js";
import { authenticateUser, AuthRequest } from "../middleware/auth.js";
import { getMultipleImageUrls } from "../utils/storageAdapter.js";

const router = express.Router();

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
      orders.map(async (order: any) => {
        const orderItemsWithSignedUrls = await Promise.all(
          order.orderItems.map(async (item: any) => {
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

// GET /orders/count - return the number of orders for current user
router.get("/count", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ error: "User not authenticated" });
    // If caller requests capturedOnly, count only orders with paymentStatus 'captured'
    const capturedOnly =
      String(req.query.capturedOnly || "").toLowerCase() === "true";
    const where: any = { userId };
    if (capturedOnly) where.paymentStatus = "captured";
    const count = await prisma.order.count({ where });
    res.json({ count });
  } catch (err) {
    console.error("Error fetching orders count:", err);
    res.status(500).json({ error: "Failed to fetch orders count" });
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
      order.orderItems.map(async (item: any) => {
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
