import express from 'express';
import jwt from 'jsonwebtoken';
const router = express.Router();
// POST /login - Artist login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        // Simple validation
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        // Check against environment variables
        const artistEmail = process.env.ARTIST_EMAIL;
        const artistPassword = process.env.ARTIST_PASSWORD;
        if (email !== artistEmail || password !== artistPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate JWT token
        const token = jwt.sign({ email: artistEmail }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            message: 'Login successful',
            token,
            artist: { email: artistEmail }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=auth.js.map