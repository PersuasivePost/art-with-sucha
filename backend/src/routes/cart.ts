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

    console.log(
      `GET /cart for userId=${userId} returned ${cartItems.length} items:`,
      cartItems.map((c: any) => ({
        id: c.id,
        productId: c.productId,
        quantity: c.quantity,
      }))
    );

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
      console.log(
        `Updating cart item: userId=${userId}, cartItemId=${cartItemId}, quantity=${quantity}`
      );
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: parseInt(cartItemId),
          userId,
        },
      });
      console.log("Lookup result for update:", cartItem);
      if (!cartItem) {
        // Extra diagnostics: try findUnique by id without user filter and log types
        try {
          const idNum = parseInt(cartItemId);
          console.log(
            "Types: userId(type)=" +
              typeof userId +
              ", idNum(type)=" +
              typeof idNum
          );
          const byIdOnly = await prisma.cartItem.findUnique({
            where: { id: idNum },
          });
          console.log("findUnique by id (no user filter):", byIdOnly);
        } catch (diagErr) {
          console.error("Diagnostic lookup failed:", diagErr);
        }
      }
      console.log("Lookup result for update:", cartItem);

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
      console.log(
        `Removing cart item: userId=${userId}, cartItemId=${cartItemId}`
      );
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: parseInt(cartItemId),
          userId,
        },
      });
      console.log("Lookup result for remove:", cartItem);
      if (!cartItem) {
        try {
          const idNum = parseInt(cartItemId);
          console.log(
            "Types (remove): userId(type)=" +
              typeof userId +
              ", idNum(type)=" +
              typeof idNum
          );
          const byIdOnly = await prisma.cartItem.findUnique({
            where: { id: idNum },
          });
          console.log("findUnique by id (remove, no user filter):", byIdOnly);
        } catch (diagErr) {
          console.error("Diagnostic lookup failed (remove):", diagErr);
        }
      }
      console.log("Lookup result for remove:", cartItem);

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

// PUT /cart/update-by-product/:productId - Update cart item by productId (finds cartItem for user)
router.put(
  "/update-by-product/:productId",
  authenticateUser,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.userId;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!userId)
        return res.status(401).json({ error: "User not authenticated" });
      if (!productId)
        return res.status(400).json({ error: "Product ID is required" });
      if (!quantity || quantity < 1)
        return res
          .status(400)
          .json({ error: "Valid quantity is required (minimum 1)" });

      const prodIdNum = parseInt(productId);

      // Find existing cart item for this user+product
      const cartItem = await prisma.cartItem.findFirst({
        where: { userId, productId: prodIdNum },
      });
      console.log(
        `Lookup result for update-by-product userId=${userId} productId=${prodIdNum}:`,
        cartItem
      );
      if (!cartItem)
        return res
          .status(404)
          .json({ error: "Cart item not found for this product" });

      const updatedCartItem = await prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity: parseInt(quantity) },
        include: { product: true },
      });

      const signedImageUrls = await getMultipleImageUrls(
        updatedCartItem.product.images || []
      );

      res.json({
        message: "Cart item updated successfully",
        cartItem: {
          ...updatedCartItem,
          product: { ...updatedCartItem.product, images: signedImageUrls },
        },
      });
    } catch (error) {
      console.error("Error updating cart item by product:", error);
      res.status(500).json({ error: "Failed to update cart item" });
    }
  }
);

// DELETE /cart/remove-by-product/:productId - Remove item by productId for current user
router.delete(
  "/remove-by-product/:productId",
  authenticateUser,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.userId;
      const { productId } = req.params;

      if (!userId)
        return res.status(401).json({ error: "User not authenticated" });
      if (!productId)
        return res.status(400).json({ error: "Product ID is required" });

      const prodIdNum = parseInt(productId);

      const cartItem = await prisma.cartItem.findFirst({
        where: { userId, productId: prodIdNum },
      });
      if (!cartItem)
        return res
          .status(404)
          .json({ error: "Cart item not found for this product" });

      await prisma.cartItem.delete({ where: { id: cartItem.id } });
      res.json({ message: "Item removed from cart successfully" });
    } catch (error) {
      console.error("Error removing cart item by product:", error);
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
