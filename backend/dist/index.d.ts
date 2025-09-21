declare global {
    namespace Express {
        interface Request {
            artist?: {
                email: string;
            };
        }
    }
}
export {};
//# sourceMappingURL=index.d.ts.map