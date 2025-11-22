import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout/DashboardLayout";
import { Link } from "react-router-dom";
import "./Orders.css";

type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  product: any;
};

type Order = {
  id: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  orderItems: OrderItem[];
};

const getBackendBase = () => {
  const envBackend = (import.meta.env.VITE_BACKEND_URL || "").replace(
    /\/+$/g,
    ""
  );
  const isLocalFront =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const backendBase = isLocalFront
    ? import.meta.env.VITE_LOCAL_BACKEND || "http://localhost:5000"
    : envBackend || "https://art-with-sucha.onrender.com";
  return backendBase.replace(/\/+$/g, "");
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const backend = getBackendBase();
      const res = await fetch(`${backend}/users/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      // ignore
    }
  }

  async function fetchOrders() {
    setLoading(true);
    try {
      const backend = getBackendBase();
      const res = await fetch(`${backend}/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function openOrder(orderId: number) {
    try {
      const backend = getBackendBase();
      const res = await fetch(`${backend}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load order");
      const data = await res.json();
      setSelected(data.order || null);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <DashboardLayout active="orders">
      <div className="orders-page">
        <header className="orders-header">
          <div>
            <h1>My Orders</h1>
            <p className="muted">All your past purchases and order details</p>
          </div>
        </header>

        {loading ? (
          <div className="empty-state">Loading your orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h3>No orders yet</h3>
            <p>Make a purchase and your orders will appear here.</p>
          </div>
        ) : (
          <div
            className={`orders-grid ${
              selected ? "has-selected" : "no-selected"
            }`}
          >
            <div className="orders-list">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className={`order-card ${
                    selected?.id === o.id ? "active" : ""
                  }`}
                  onClick={() => openOrder(o.id)}
                >
                  <div className="order-summary">
                    <div className="order-left">
                      <div className="order-id">Order #{o.id}</div>
                      <div className="order-date">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                      <div className="order-first">
                        {o.orderItems?.[0]?.product?.title ? (
                          <span className="order-first-title">
                            {String(o.orderItems[0].product.title).slice(0, 56)}
                            {o.orderItems[0].product.title.length > 56
                              ? "…"
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="order-right">
                      <div className="order-amount">
                        ₹{o.totalAmount.toFixed(2)}
                      </div>
                      <div className={`order-status status-${o.status}`}>
                        {o.status}
                      </div>
                      <div className="order-count">
                        {o.orderItems.reduce(
                          (s, it) => s + (it.quantity || 0),
                          0
                        )}{" "}
                        items
                      </div>
                    </div>
                  </div>
                  <div className="order-items-preview">
                    {o.orderItems.slice(0, 3).map((it) => (
                      <div key={it.id} className="preview-item">
                        <img
                          src={it.product?.images?.[0] || "/image.png"}
                          alt={it.product?.title || ""}
                        />
                        <div className="pi-meta">
                          <div className="pi-title">{it.product?.title}</div>
                          <div className="pi-qty">x{it.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="orders-detail">
              {selected ? (
                <div className="order-detail-card">
                  <h2>Order #{selected.id}</h2>
                  <div className="detail-row">
                    <strong>Status:</strong>
                    <span className={`order-status status-${selected.status}`}>
                      {selected.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <strong>Payment Status:</strong>
                    <span
                      className={`order-status status-${
                        selected.paymentStatus || "pending"
                      }`}
                    >
                      {selected.paymentStatus || "pending"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <strong>Date:</strong>
                    <span>{new Date(selected.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Total:</strong>
                    <span>₹{selected.totalAmount.toFixed(2)}</span>
                  </div>
                  {selected.razorpayPaymentId && (
                    <div className="detail-row">
                      <strong>Payment ID:</strong>
                      <span
                        style={{ fontSize: "0.85rem", wordBreak: "break-all" }}
                      >
                        {selected.razorpayPaymentId}
                      </span>
                    </div>
                  )}
                  {selected.razorpayOrderId && (
                    <div className="detail-row">
                      <strong>Order ID:</strong>
                      <span
                        style={{ fontSize: "0.85rem", wordBreak: "break-all" }}
                      >
                        {selected.razorpayOrderId}
                      </span>
                    </div>
                  )}

                  <hr />

                  <h3>Items</h3>
                  <div className="order-items">
                    {selected.orderItems.map((it) => (
                      <div key={it.id} className="order-item-row">
                        <Link
                          to={`/product/${encodeURIComponent(
                            String(it.product?.id)
                          )}`}
                          className="item-link"
                        >
                          <img
                            src={it.product?.images?.[0] || "/image.png"}
                            alt={it.product?.title}
                          />
                        </Link>
                        <div className="item-meta">
                          <Link
                            to={`/product/${encodeURIComponent(
                              String(it.product?.id)
                            )}`}
                            className="item-title"
                          >
                            {it.product?.title}
                          </Link>
                          <div className="item-sub">
                            Qty: {it.quantity} • ₹{(it.price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <hr />

                  <h3>Shipping & Contact</h3>
                  <div className="detail-row">
                    <strong>Phone:</strong>
                    <span>{profile?.mobno || profile?.phone || "—"}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Address:</strong>
                    <span>{profile?.address || "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  Select an order to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders;
