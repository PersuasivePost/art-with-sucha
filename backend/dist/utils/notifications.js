import nodemailer from "nodemailer";
import axios from "axios";
import fs from "fs";
import path from "path";
// Setup transporter (Gmail app password recommended)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL || "",
        pass: process.env.EMAIL_PASSWORD || "",
    },
});
function loadTemplate(name) {
    try {
        const p = path.join(__dirname, "..", "templates", name);
        return fs.readFileSync(p, "utf8");
    }
    catch (err) {
        return null;
    }
}
function renderCustomerTemplate(order) {
    const t = loadTemplate("emailCustomer.html");
    if (!t) {
        // Build a full HTML summary when template missing
        const itemsHtml = (order.orderItems || [])
            .map((i) => `<li>${i.product?.title || i.productId} × ${i.quantity} - ₹${i.price}</li>`)
            .join("");
        return (`<!doctype html><html><body style="font-family: Arial; max-width:600px;margin:0 auto;">` +
            `<h2>Thank You for Your Order! 🎉</h2>` +
            `<p>Hi ${order.user?.name || order.user?.email || "Customer"},</p>` +
            `<p>We've received your order and payment. We'll ship it soon!</p>` +
            `<div style="background:#f5f5f5;padding:15px;border-radius:5px;"><h3>Order Details</h3>` +
            `<p><strong>Order ID:</strong> #${order.id}</p>` +
            `<p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>` +
            `<p><strong>Total:</strong> ₹${order.totalAmount}</p></div>` +
            `<h3>Items Ordered:</h3><ul>${itemsHtml}</ul>` +
            `<h3>Shipping Address:</h3><p>${order.user?.address || ""}</p>` +
            `<p>Questions? Reply to this email or call us at ${process.env.SUPPORT_PHONE || ""}</p>` +
            `<p>Thanks,<br/>Your Store Team</p></body></html>`);
    }
    return t
        .replace(/\${orderId}/g, String(order.id))
        .replace(/\${orderDate}/g, new Date(order.createdAt).toLocaleString())
        .replace(/\${total}/g, String(order.totalAmount))
        .replace(/\${customerName}/g, order.user?.name || order.user?.email || "Customer")
        .replace(/\${shippingAddress}/g, order.user?.address || "")
        .replace(/\${items}/g, (order.orderItems || [])
        .map((i) => `<li>${i.product?.title || i.productId} × ${i.quantity} - ₹${i.price}</li>`)
        .join("\n"));
}
function renderAdminTemplate(order) {
    const t = loadTemplate("emailAdmin.html");
    if (!t) {
        const itemsHtml = (order.orderItems || [])
            .map((i) => `<li>${i.product?.title || i.productId} × ${i.quantity} - ₹${i.price}</li>`)
            .join("");
        return (`<!doctype html><html><body style="font-family: monospace;">` +
            `<h2>🛒 NEW ORDER RECEIVED</h2>` +
            `<h3>Order Info:</h3><ul>` +
            `<li>Order ID: #${order.id}</li>` +
            `<li>Amount: ₹${order.totalAmount}</li>` +
            `<li>Payment: ✅ CONFIRMED</li>` +
            `<li>Date: ${new Date(order.createdAt).toLocaleString()}</li>` +
            `</ul><h3>Customer:</h3><ul>` +
            `<li>Name: ${order.user?.name || "-"}</li>` +
            `<li>Email: ${order.user?.email || "-"}</li>` +
            `<li>Phone: ${order.user?.mobno || "-"}</li>` +
            `</ul><h3>Items to Pack:</h3><ol>${itemsHtml}</ol>` +
            `<h3>Ship To:</h3><pre>${order.user?.address || "-"}</pre>` +
            `<p style="color:red;font-weight:bold;">⚡ ACTION REQUIRED: Process and ship this order</p>` +
            `</body></html>`);
    }
    return t
        .replace(/\${orderId}/g, String(order.id))
        .replace(/\${date}/g, new Date(order.createdAt).toLocaleString())
        .replace(/\${total}/g, String(order.totalAmount))
        .replace(/\${customerName}/g, order.user?.name || "-")
        .replace(/\${customerEmail}/g, order.user?.email || "-")
        .replace(/\${customerPhone}/g, order.user?.mobno || "-")
        .replace(/\${shippingAddress}/g, order.user?.address || "-")
        .replace(/\${items}/g, (order.orderItems || [])
        .map((i) => `<li>${i.product?.title || i.productId} × ${i.quantity}</li>`)
        .join("\n"));
}
export async function sendEmailToCustomer(order) {
    const html = renderCustomerTemplate(order);
    const from = process.env.EMAIL_FROM || process.env.EMAIL || "no-reply@example.com";
    await transporter.sendMail({
        from,
        to: order.user?.email,
        subject: `Order Confirmation #${order.id}`,
        html,
    });
}
export async function sendEmailToAdmin(order) {
    const html = renderAdminTemplate(order);
    const from = process.env.EMAIL_FROM || process.env.EMAIL || "no-reply@example.com";
    const admin = process.env.ADMIN_EMAIL || process.env.EMAIL || "";
    await transporter.sendMail({
        from,
        to: admin,
        subject: `🛒 NEW ORDER #${order.id}`,
        html,
    });
}
export async function sendTelegramToAdmin(order) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId)
        throw new Error("Telegram not configured");
    const items = (order.orderItems || [])
        .map((i) => `• ${i.product?.title || i.productId} x${i.quantity}`)
        .join("\n");
    const text = `🎉 NEW ORDER\nOrder: #${order.id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.user?.name || order.user?.email || "-"}\n\nItems:\n${items}\n\n⚡ Process this order now!`;
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
    });
}
export async function sendAllNotifications(order) {
    const result = {
        customerEmail: false,
        adminEmail: false,
        telegram: false,
        errors: {},
    };
    // Try customer email
    try {
        await sendEmailToCustomer(order);
        result.customerEmail = true;
    }
    catch (err) {
        result.errors.customerEmail = err?.message || String(err);
        console.error("Customer email failed:", err);
    }
    // Admin email
    try {
        await sendEmailToAdmin(order);
        result.adminEmail = true;
    }
    catch (err) {
        result.errors.adminEmail = err?.message || String(err);
        console.error("Admin email failed:", err);
    }
    // Telegram
    try {
        await sendTelegramToAdmin(order);
        result.telegram = true;
    }
    catch (err) {
        result.errors.telegram = err?.message || String(err);
        console.error("Telegram failed:", err);
    }
    console.log("Notification results:", result);
    return result;
}
//# sourceMappingURL=notifications.js.map