declare module "razorpay" {
  interface RazorpayConfig {
    key_id: string;
    key_secret: string;
  }

  interface OrderOptions {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }

  interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
  }

  interface Orders {
    create(
      options: OrderOptions,
      callback?: (err: any, order: RazorpayOrder) => void
    ): Promise<RazorpayOrder>;
    fetch(orderId: string): Promise<RazorpayOrder>;
    all(options?: any): Promise<{ items: RazorpayOrder[] }>;
  }

  interface Payments {
    fetch(paymentId: string): Promise<any>;
    all(options?: any): Promise<{ items: any[] }>;
    capture(paymentId: string, amount: number, currency: string): Promise<any>;
  }

  class Razorpay {
    constructor(config: RazorpayConfig);
    orders: Orders;
    payments: Payments;
  }

  export = Razorpay;
}
