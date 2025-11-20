import express from "express";
export interface AuthRequest extends express.Request {
    artist?: {
        email: string;
    };
    user?: {
        userId: number;
        email: string;
    };
}
export declare const authenticateArtist: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
export declare const authenticateUser: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map