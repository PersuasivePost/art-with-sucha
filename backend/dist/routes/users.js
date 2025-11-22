import express from "express";
import prisma from "../prisma.js";
import { authenticateUser } from "../middleware/auth.js";
const router = express.Router();
// GET /users/me - return current user's public profile
router.get("/me", authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: "Not authenticated" });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const { password: _p, ...publicUser } = user;
        res.json(publicUser);
    }
    catch (err) {
        console.error("GET /users/me failed:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
// PUT /users/me - update allowed profile fields (name, mobno, address)
router.put("/me", authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: "Not authenticated" });
        const { name, phone, address, mobno } = req.body;
        const updateData = {};
        if (typeof name === "string")
            updateData.name = name;
        if (typeof phone === "string")
            updateData.mobno = phone;
        if (typeof mobno === "string")
            updateData.mobno = mobno;
        if (typeof address === "string")
            updateData.address = address;
        if (Object.keys(updateData).length === 0)
            return res.status(400).json({ error: "No updatable fields provided" });
        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
        const { password: _p, ...publicUser } = updated;
        res.json(publicUser);
    }
    catch (err) {
        console.error("PUT /users/me failed:", err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});
export default router;
//# sourceMappingURL=users.js.map