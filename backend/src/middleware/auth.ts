import express from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends express.Request {
  artist?: { email: string };
  user?: { userId: number; email: string };
}

export const authenticateArtist = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
): void => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Access denied. No token provided." });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      email: string;
    };
    req.artist = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

export const authenticateUser = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
): void => {
  try {
    const authHeader = req.header("Authorization");
    const token =
      authHeader?.replace(/^bearer\s+/i, "") ||
      authHeader?.replace(/^Bearer\s+/, "");

    if (!token || token === authHeader) {
      res.status(401).json({ error: "Access denied. No token provided." });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "devsecret"
    ) as {
      userId: number;
      email: string;
    };

    if (!decoded.userId) {
      res.status(401).json({ error: "Invalid token format." });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("User authentication failed:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};
