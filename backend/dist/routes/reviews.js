import express from "express";
import prisma from "../prisma.js";
import { authenticateUser } from "../middleware/auth.js";
const router = express.Router();
// GET /reviews/:productId - list reviews for a product
router.get("/:productId", async (req, res) => {
    try {
        const raw = String(req.params.productId || "");
        const productId = parseInt(raw);
        if (isNaN(productId))
            return res.status(400).json({ error: "Invalid product id" });
        const reviews = await prisma.review.findMany({
            where: { productId },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json({ reviews });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});
// GET /reviews/can-review/:productId - check if current user bought the product
router.get("/can-review/:productId", authenticateUser, async (req, res) => {
    try {
        const raw = String(req.params.productId || "");
        const productId = parseInt(raw);
        if (isNaN(productId))
            return res.status(400).json({ error: "Invalid product id" });
        const userId = req.user.userId;
        // Check orders for this user containing this product
        const orderItem = await prisma.orderItem.findFirst({
            where: { productId, order: { userId } },
        });
        const hasPurchased = !!orderItem;
        res.json({ canReview: hasPurchased });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to check purchase status" });
    }
});
// POST /reviews/:productId - create a review (only if purchased)
router.post("/:productId", authenticateUser, async (req, res) => {
    try {
        const raw = String(req.params.productId || "");
        const productId = parseInt(raw);
        if (isNaN(productId))
            return res.status(400).json({ error: "Invalid product id" });
        const userId = req.user.userId;
        const { rating, message } = req.body;
        if (!rating || rating < 1 || rating > 5)
            return res.status(400).json({ error: "Rating must be 1-5" });
        // Verify purchase
        const orderItem = await prisma.orderItem.findFirst({
            where: { productId, order: { userId } },
        });
        if (!orderItem)
            return res
                .status(403)
                .json({ error: "Not allowed to review unless purchased" });
        // Prevent duplicate review by same user for same product (optional)
        const existing = await prisma.review.findFirst({
            where: { productId, userId },
        });
        if (existing)
            return res
                .status(409)
                .json({ error: "You have already reviewed this product" });
        const review = await prisma.review.create({
            data: {
                productId,
                userId,
                rating: Number(rating),
                message: message || null,
            },
        });
        res.status(201).json({ review });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create review" });
    }
});
export default router;
//# sourceMappingURL=reviews.js.map