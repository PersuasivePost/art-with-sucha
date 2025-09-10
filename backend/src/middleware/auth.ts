import express from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends express.Request {
  artist?: { email: string };
}

export const authenticateArtist = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    req.artist = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};
