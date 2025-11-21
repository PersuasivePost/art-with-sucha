import express from "express";
import prisma from "../prisma.js";
import { authenticateUser, AuthRequest } from "../middleware/auth.js";
import { getMultipleImageUrls } from "../utils/storageAdapter.js";

const router = express.Router();

// POST /cart/add - Add item to cart or update quantity if exists
router.post("/add", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!productId || !quantity || quantity < 1) {
      return res
        .status(400)
        .json({ error: "Valid productId and quantity are required" });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: parseInt(productId),
        },
      },
    });

    let cartItem;
    if (existingCartItem) {
      // Update quantity (add to existing)
      cartItem = await prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: existingCartItem.quantity + parseInt(quantity),
        },
        include: {
          product: true,
        },
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId: parseInt(productId),
          quantity: parseInt(quantity),
        },
        include: {
          product: true,
        },
      });
    }

    // Generate signed URLs for product images
    const signedImageUrls = await getMultipleImageUrls(
      cartItem.product.images || []
    );

    res.status(200).json({
      message: "Item added to cart successfully",
      cartItem: {
        ...cartItem,
        product: {
          ...cartItem.product,
          images: signedImageUrls,
        },
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// GET /cart - Get user's cart
router.get("/", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            section: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate signed URLs for all product images
    const cartItemsWithSignedUrls = await Promise.all(
      cartItems.map(async (item: any) => {
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

    // Calculate totals
    const totalItems = cartItemsWithSignedUrls.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );
    const totalAmount = cartItemsWithSignedUrls.reduce(
      (sum: number, item: any) => sum + item.product.price * item.quantity,
      0
    );

    res.json({
      cartItems: cartItemsWithSignedUrls,
      totalItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// PUT /cart/update/:cartItemId - Update cart item quantity
router.put(
  "/update/:cartItemId",
  authenticateUser,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.userId;
      const { cartItemId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!cartItemId) {
        return res.status(400).json({ error: "Cart item ID is required" });
      }

      if (!quantity || quantity < 1) {
        return res
          .status(400)
          .json({ error: "Valid quantity is required (minimum 1)" });
      }

      // Verify cart item belongs to user
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: parseInt(cartItemId),
          userId,
        },
      });

      if (!cartItem) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      // Update quantity
      const updatedCartItem = await prisma.cartItem.update({
        where: { id: parseInt(cartItemId) },
        data: { quantity: parseInt(quantity) },
        include: {
          product: true,
        },
      });

      // Generate signed URLs for product images
      const signedImageUrls = await getMultipleImageUrls(
        updatedCartItem.product.images || []
      );

      res.json({
        message: "Cart item updated successfully",
        cartItem: {
          ...updatedCartItem,
          product: {
            ...updatedCartItem.product,
            images: signedImageUrls,
          },
        },
      });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "Failed to update cart item" });
    }
  }
);

// DELETE /cart/remove/:cartItemId - Remove item from cart
router.delete(
  "/remove/:cartItemId",
  authenticateUser,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.userId;
      const { cartItemId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!cartItemId) {
        return res.status(400).json({ error: "Cart item ID is required" });
      }

      // Verify cart item belongs to user
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: parseInt(cartItemId),
          userId,
        },
      });

      if (!cartItem) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      await prisma.cartItem.delete({
        where: { id: parseInt(cartItemId) },
      });

      res.json({ message: "Item removed from cart successfully" });
    } catch (error) {
      console.error("Error removing cart item:", error);
      res.status(500).json({ error: "Failed to remove item from cart" });
    }
  }
);

// DELETE /cart/clear - Clear entire cart
router.delete("/clear", authenticateUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await prisma.cartItem.deleteMany({
      where: { userId },
    });

    res.json({
      message: "Cart cleared successfully",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router;
