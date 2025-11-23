import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout/DashboardLayout";
import "./Wishlist.css";

type WishlistItem = {
  id: number;
  productId: number;
  product: {
    id: number;
    title: string;
    artist?: string;
    description?: string;
    price?: number;
    images?: string[];
  } | null;
};

// Prefer a local backend during development when the front-end is served from localhost
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

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [cartMap, setCartMap] = useState<
    Record<number, { id?: number; quantity: number }>
  >({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
    };
  }, []);

  function showToast(msg: string) {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(msg);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2000) as unknown as number;
  }

  useEffect(() => {
    fetchWishlist();
    fetchCart();
    // keep in sync when other tabs update cart
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cartUpdated") fetchCart();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // No storage sync; rely on server-side state. Users can refresh or remove/add will refetch.

  async function fetchWishlist() {
    setLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      const backend = getBackendBase();
      const res = await fetch(`${backend}/wishlist`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            }
          : { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        console.error("Failed to fetch wishlist", res.status);
        setItems([]);
      } else {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load wishlist", err);
    } finally {
      setLoading(false);
    }
  }

  async function removeFromWishlist(productId: number) {
    try {
      const token = localStorage.getItem("userToken");
      const backend = getBackendBase();
      const res = await fetch(
        `${backend}/wishlist/remove-by-product/${productId}`,
        {
          method: "DELETE",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              }
            : { "Content-Type": "application/json" },
        }
      );
      if (res.ok) {
        setItems((s) => s.filter((it) => it.productId !== productId));
      } else {
        console.error("Failed to remove wishlist item", res.status);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchCart() {
    try {
      const token = localStorage.getItem("userToken");
      const backend = getBackendBase();
      if (token) {
        const res = await fetch(`${backend}/cart`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          setCartMap({});
          return;
        }
        const data = await res.json().catch(() => ({}));
        const map: Record<number, { id?: number; quantity: number }> = {};
        (data.cartItems || []).forEach((ci: any) => {
          map[ci.productId] = { id: ci.id, quantity: ci.quantity || 1 };
        });
        setCartMap(map);
        return;
      }

      // unauthenticated: read localStorage cart
      const local = JSON.parse(localStorage.getItem("cart") || "[]");
      const map: Record<number, { quantity: number }> = {};
      (local || []).forEach((c: any) => {
        const pid = Number(c.productId || c.productId);
        map[pid] = { quantity: c.qty || c.quantity || 1 };
      });
      setCartMap(map);
    } catch (err) {
      console.error("Failed to fetch cart for wishlist", err);
      setCartMap({});
    }
  }

  function addToCart(productId?: number) {
    // guard: ensure we have an id
    if (!productId) {
      showToast("Unable to add to cart: invalid product id");
      return;
    }
    const token = localStorage.getItem("userToken");
    const backend = getBackendBase();
    if (token) {
      // authenticated: call server cart API so header/cart reflect update
      (async () => {
        try {
          const res = await fetch(`${backend}/cart/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId, quantity: 1 }),
          });
          if (!res.ok) throw new Error("Failed to add to server cart");
          try {
            localStorage.setItem("cartUpdated", Date.now().toString());
          } catch {}
          showToast("Added to cart");
        } catch (err) {
          console.error("Add to cart failed", err);
          showToast("Failed to add to cart");
        }
      })();
      return;
    }
    // unauthenticated: fallback to localStorage cart
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push({ productId, qty: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    // notify other tabs
    localStorage.setItem("cartUpdated", Date.now().toString());
    showToast("Added to cart");
  }

  return (
    <DashboardLayout active="wishlist">
      <div className="wishlist-page">
        <header className="wishlist-header">
          <div>
            <h1>My Wishlist</h1>
            <p className="muted">Curated picks you've saved for later</p>
          </div>
          <div className="wishlist-count">{items.length} items</div>
        </header>

        {loading ? (
          <div className="empty-state">Loading your wishlist…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>Your wishlist is empty</h3>
            <p>
              Explore the gallery and tap the heart to save pieces you love.
            </p>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map((it) => (
              <div key={it.id} className="wish-card">
                <div className="wish-image">
                  <Link
                    to={`/product/${encodeURIComponent(
                      String(it.product?.id ?? it.productId)
                    )}`}
                  >
                    <img
                      src={it.product?.images?.[0] || "/public/image.png"}
                      alt={it.product?.title || "Artwork"}
                    />
                  </Link>
                </div>
                <div className="wish-body">
                  <div className="wish-meta">
                    <h3 className="wish-title">
                      <Link
                        to={`/product/${encodeURIComponent(
                          String(it.product?.id ?? it.productId)
                        )}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        {it.product?.title || "Untitled"}
                      </Link>
                    </h3>
                    <div className="wish-artist">
                      {it.product?.description ||
                        it.product?.artist ||
                        "Unknown"}
                    </div>
                  </div>
                  <div className="wish-actions">
                    <div className="wish-price">
                      {it.product?.price ? `₹ ${it.product.price}` : "—"}
                    </div>
                    <div className="wish-buttons">
                      {(() => {
                        const pid = it.product?.id ?? it.productId;
                        const entry = pid ? cartMap[Number(pid)] : undefined;
                        if (entry) {
                          return (
                            <>
                              <button className="btn btn-ghost" disabled>
                                In Cart (Qty: {entry.quantity})
                              </button>
                              <Link to="/cart" className="btn btn-primary">
                                Update Cart
                              </Link>
                            </>
                          );
                        }
                        return (
                          <button
                            className="btn btn-primary"
                            onClick={() =>
                              addToCart(it.product?.id ?? it.productId)
                            }
                          >
                            Add to cart
                          </button>
                        );
                      })()}
                      <button
                        className="btn btn-ghost"
                        onClick={() => removeFromWishlist(it.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast ? (
        <div className="bottom-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </DashboardLayout>
  );
}
