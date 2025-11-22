type OrderLike = any;
export declare function sendEmailToCustomer(order: OrderLike): Promise<void>;
export declare function sendEmailToAdmin(order: OrderLike): Promise<void>;
export declare function sendTelegramToAdmin(order: OrderLike): Promise<void>;
export declare function sendAllNotifications(order: OrderLike): Promise<any>;
export {};
//# sourceMappingURL=notifications.d.ts.map