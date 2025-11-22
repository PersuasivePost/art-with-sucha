declare global {
    namespace Express {
        interface Request {
            artist?: {
                email: string;
            };
            user?: {
                userId: number;
                email: string;
            };
        }
    }
}
export {};
//# sourceMappingURL=index.d.ts.map