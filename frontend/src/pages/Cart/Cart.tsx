import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./Cart.css";

interface CartProduct {
  id: number;
  title: string;
  price: number;
  description?: string;
  tags?: string[];
  images: string[];
}

interface CartItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  product: CartProduct;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  const backendUrl = backendBase.replace(/\/+$/g, "");
  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/cart`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      setCartItems(data.cartItems || []);
    } catch (e: any) {
      setError(e.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (toastTimerRef.current) {
          window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = null;
        }
      } catch {}
    };
  }, []);

  function showToast(msg: string) {
    try {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    } catch {}
    setToast(msg);
    // @ts-ignore
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      // @ts-ignore
      toastTimerRef.current = null;
    }, 3000) as unknown as number;
  }

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    try {
      const res = await fetch(`${backendUrl}/cart/update/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Failed to update quantity");
      await fetchCart();
      // notify other components/tabs to refresh cart badge
      try {
        localStorage.setItem("cartUpdated", String(Date.now()));
      } catch {}
    } catch (e) {
      console.error(e);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      const res = await fetch(`${backendUrl}/cart/remove/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to remove item");
      await fetchCart();
      try {
        localStorage.setItem("cartUpdated", String(Date.now()));
      } catch {}
    } catch (e) {
      console.error(e);
    }
  };

  const clearCart = async () => {
    // open inline confirmation instead of native confirm
    setConfirmClearOpen(true);
  };

  const performClearCart = async () => {
    setConfirmClearOpen(false);
    try {
      const res = await fetch(`${backendUrl}/cart/clear`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to clear cart");
      await fetchCart();
      try {
        localStorage.setItem("cartUpdated", String(Date.now()));
      } catch {}
    } catch (e) {
      console.error(e);
      // optionally show inline error
      setError("Failed to clear cart");
      setTimeout(() => setError(null), 3000);
    }
  };

  const checkout = async () => {
    try {
      const res = await fetch(`${backendUrl}/orders/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // If profile information missing, include a hint for the user
        const errMsg = body?.error || "Checkout failed";
        showToast(errMsg);
        // If it's the specific profile-missing error, show a persistent CTA toast (link handled in UI below)
        if (errMsg.includes("phone number") || errMsg.includes("address")) {
          // keep toast visible a bit longer
        }
        throw new Error(errMsg);
      }
      showToast("Order placed successfully");
      await fetchCart();
    } catch (e: any) {
      showToast(e.message || "Checkout failed");
    }
  };

  const totalAmount = cartItems.reduce(
    (sum, it) => sum + (it.product?.price || 0) * it.quantity,
    0
  );

  // Match server-side compulsory delivery charge
  const DELIVERY_CHARGE = 100;
  const totalWithDelivery = totalAmount + DELIVERY_CHARGE;

  return (
    <div>
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="cart-page">
        <div className="cart-container">
          <header className="cart-hero">
            <div>
              <h1 className="cart-title">Your Cart</h1>
              <p className="cart-subtitle">
                Curated selection — checkout with confidence
              </p>
            </div>
            <div className="cart-hero-accent">Exclusive</div>
          </header>

          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : cartItems.length === 0 ? (
            <div className="empty-cart">Your cart is empty.</div>
          ) : (
            <>
              <div className="cart-list">
                {cartItems.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className="item-image">
                      <Link
                        to={`/product/${encodeURIComponent(
                          String(item.product.id)
                        )}`}
                      >
                        <img
                          src={item.product?.images?.[0] || "/image.png"}
                          alt={item.product.title}
                        />
                      </Link>
                    </div>
                    <div className="item-info">
                      <h3>
                        <Link
                          to={`/product/${encodeURIComponent(
                            String(item.product.id)
                          )}`}
                        >
                          {item.product.title}
                        </Link>
                      </h3>
                      <p className="pdp-price">
                        ₹{item.product.price.toFixed(2)}
                      </p>
                      {item.product.description ? (
                        <p className="product-description">
                          {item.product.description}
                        </p>
                      ) : null}
                      {item.product.tags && item.product.tags.length > 0 ? (
                        <div className="tag-list">
                          {item.product.tags.map((t) => (
                            <span key={t} className="tag-pill">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="pdp-cart-control">
                        <button
                          className="cart-decrease"
                          onClick={() => {
                            if (item.quantity <= 1) {
                              // remove when decreasing from 1
                              removeItem(item.id);
                            } else {
                              updateQuantity(item.id, item.quantity - 1);
                            }
                          }}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <div className="cart-pill">{item.quantity}</div>
                        <button
                          className="cart-increase"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.min(2, item.quantity + 1)
                            )
                          }
                          aria-label="Increase quantity"
                          aria-disabled={item.quantity >= 2}
                          disabled={item.quantity >= 2}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        className="remove-btn"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="cart-summary">
                <h3>Order Summary</h3>
                <div className="summary-row">
                  <span>Items</span>
                  <span>{cartItems.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span>₹{DELIVERY_CHARGE.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>₹{totalWithDelivery.toFixed(2)}</span>
                </div>
                <div className="summary-actions">
                  <button onClick={checkout} className="checkout-btn">
                    Checkout
                  </button>
                  <div className="clear-area">
                    <button onClick={clearCart} className="clear-btn">
                      Clear Cart
                    </button>
                    {confirmClearOpen && (
                      <div className="inline-confirm">
                        <span>Clear all items?</span>
                        <div className="inline-confirm-actions">
                          <button
                            className="confirm-yes"
                            onClick={performClearCart}
                          >
                            Yes, clear
                          </button>
                          <button
                            className="confirm-no"
                            onClick={() => setConfirmClearOpen(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </>
          )}
        </div>
      </main>

      <Footer />
      {toast ? (
        <div className="bottom-toast" role="status" aria-live="polite">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>{toast}</span>
            {toast.includes("phone number") || toast.includes("address") ? (
              <Link
                to="/profile"
                style={{
                  color: "#fff",
                  textDecoration: "underline",
                  marginLeft: 8,
                }}
              >
                Update profile
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
