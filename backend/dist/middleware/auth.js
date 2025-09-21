import jwt from 'jsonwebtoken';
export const authenticateArtist = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.artist = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};
//# sourceMappingURL=auth.js.map