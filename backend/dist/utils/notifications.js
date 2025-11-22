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
    if (!t)
        return `Order #${order.id} confirmed`;
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
    if (!t)
        return `New order #${order.id}`;
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