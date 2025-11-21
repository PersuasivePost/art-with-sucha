import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../../components/Header/Header";
import ImageModal from "../../../components/ImageModal/ImageModal";
import Footer from "../../../components/Footer/Footer";
import "./ProductDetail.css";
import { resolveImageUrl } from "../../../utils/image";

export default function ProductDetail() {
  const { id, sectionName, subsectionName } = useParams<{
    sectionName?: string;
    subsectionName?: string;
    id: string;
  }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainImgRef = useRef<HTMLImageElement | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState("");
  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newMessage, setNewMessage] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  // Cart state for this product
  const [cartQuantity, setCartQuantity] = useState<number>(0);
  const [cartItemId, setCartItemId] = useState<number | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
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
        const backend = backendBase.replace(/\/+$/g, "");

        const res = await fetch(`${backend}/product/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error("Failed to load product");
        const data = await res.json();
        setProduct(data.product || null);

        // Fetch reviews for this product
        try {
          const revRes = await fetch(
            `${backend}/reviews/${encodeURIComponent(id)}`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            setReviews(revData.reviews || []);
          }
        } catch (err) {
          console.error("Failed to load reviews", err);
        }

        // Check if current user can review
        try {
          const token = localStorage.getItem("userToken");
          if (token) {
            const canRes = await fetch(
              `${backend}/reviews/can-review/${encodeURIComponent(id)}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (canRes.ok) {
              const canData = await canRes.json();
              setCanReview(!!canData.canReview);
            }
          }
        } catch (err) {
          console.error("Failed to check review eligibility", err);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Fetch the cart entry for this product to show realtime quantity
  const fetchCartForProduct = async () => {
    try {
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
      const backend = backendBase.replace(/\/+$/g, "");

      const token = localStorage.getItem("userToken");
      if (!token) {
        setCartQuantity(0);
        setCartItemId(null);
        return;
      }

      const res = await fetch(`${backend}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCartQuantity(0);
        setCartItemId(null);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const found = (data.cartItems || []).find(
        (it: any) =>
          String(it.productId) === String(product?.id) ||
          String(it.product?.id) === String(product?.id)
      );
      if (found) {
        setCartQuantity(found.quantity || 0);
        setCartItemId(found.id || null);
      } else {
        setCartQuantity(0);
        setCartItemId(null);
      }
    } catch (e) {
      console.error("fetchCartForProduct failed", e);
      setCartQuantity(0);
      setCartItemId(null);
    }
  };

  // Add one to cart (uses POST /cart/add which will increment if exists)
  const addOneToCart = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      navigate("/login");
      return;
    }
    setCartLoading(true);
    try {
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
      const backend = backendBase.replace(/\/+$/g, "");
      const res = await fetch(`${backend}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const data = await res.json().catch(() => ({}));
      if (data?.cartItem) {
        setCartQuantity(data.cartItem.quantity || 0);
        setCartItemId(data.cartItem.id || null);
      } else {
        await fetchCartForProduct();
      }
      try {
        localStorage.setItem("cartUpdated", String(Date.now()));
      } catch {}
      setCartNotice("Cart updated");
      setTimeout(() => setCartNotice(null), 1400);
    } catch (e) {
      setCartNotice("Failed to update cart");
      setTimeout(() => setCartNotice(null), 1400);
    } finally {
      setCartLoading(false);
    }
  };

  // Decrease one in cart (robust: update if id known, otherwise find and update/remove)
  const decreaseOneInCart = async () => {
    if (cartLoading) return;
    const token = localStorage.getItem("userToken");
    if (!token) {
      navigate("/login");
      return;
    }
    setCartLoading(true);
    try {
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
      const backend = backendBase.replace(/\/+$/g, "");

      // Refresh authoritative cart from server to avoid stale cartItemId
      const cartResFresh = await fetch(`${backend}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cartDataFresh = cartResFresh.ok
        ? await cartResFresh.json().catch(() => ({}))
        : {};
      const serverFound = (cartDataFresh.cartItems || []).find(
        (it: any) =>
          String(it.productId) === String(product?.id) ||
          String(it.product?.id) === String(product?.id)
      );
      if (serverFound) {
        // ensure local cache matches server
        setCartQuantity(serverFound.quantity || 0);
        setCartItemId(serverFound.id || null);
      }

      const targetQty = Math.max(
        0,
        (serverFound?.quantity ?? cartQuantity) - 1
      );
      if (targetQty <= 0) {
        // remove - prefer authoritative lookup then call delete; handle 404 by-product fallback
        let idToRemove = serverFound?.id ?? cartItemId;
        if (idToRemove) {
          const delRes = await fetch(`${backend}/cart/remove/${idToRemove}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!delRes.ok) {
            // if cart item not found by id, try remove-by-product fallback
            if (delRes.status === 404) {
              const byProd = await fetch(
                `${backend}/cart/remove-by-product/${encodeURIComponent(
                  String(product?.id)
                )}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (!byProd.ok) {
                // final fallback: refresh cart to sync UI and show error
                await fetchCartForProduct();
                setCartNotice("Failed to remove from cart");
                setTimeout(() => setCartNotice(null), 1400);
                return;
              }
            } else {
              await fetchCartForProduct();
              setCartNotice("Failed to remove from cart");
              setTimeout(() => setCartNotice(null), 1400);
              return;
            }
          }
        } else {
          // No id known; try remove-by-product directly
          const byProd = await fetch(
            `${backend}/cart/remove-by-product/${encodeURIComponent(
              String(product?.id)
            )}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
          );
          if (!byProd.ok) {
            await fetchCartForProduct();
            setCartNotice("Failed to remove from cart");
            setTimeout(() => setCartNotice(null), 1400);
            return;
          }
        }
        // Success path: ensure UI reflects server
        await fetchCartForProduct();
        setCartNotice("Removed from cart");
        setTimeout(() => setCartNotice(null), 1400);
        try {
          localStorage.setItem("cartUpdated", String(Date.now()));
        } catch {}
      } else {
        // try update
        let idToUpdate = serverFound?.id ?? cartItemId;
        if (idToUpdate) {
          const upRes = await fetch(`${backend}/cart/update/${idToUpdate}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ quantity: targetQty }),
          });
          if (!upRes.ok) {
            if (upRes.status === 404) {
              // try update-by-product fallback
              const byProd = await fetch(
                `${backend}/cart/update-by-product/${encodeURIComponent(
                  String(product?.id)
                )}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ quantity: targetQty }),
                }
              );
              if (byProd.ok) {
                const upData = await byProd.json().catch(() => ({}));
                if (upData?.cartItem) {
                  setCartQuantity(upData.cartItem.quantity || 0);
                  setCartItemId(upData.cartItem.id || null);
                } else {
                  await fetchCartForProduct();
                }
                try {
                  localStorage.setItem("cartUpdated", String(Date.now()));
                } catch {}
              } else {
                await fetchCartForProduct();
                setCartNotice("Failed to update cart");
                setTimeout(() => setCartNotice(null), 1400);
                return;
              }
            } else {
              await fetchCartForProduct();
              setCartNotice("Failed to update cart");
              setTimeout(() => setCartNotice(null), 1400);
              return;
            }
          } else {
            const upData = await upRes.json().catch(() => ({}));
            if (upData?.cartItem) {
              setCartQuantity(upData.cartItem.quantity || 0);
              setCartItemId(upData.cartItem.id || null);
            } else {
              await fetchCartForProduct();
            }
          }
        } else {
          // as fallback, add with quantity targetQty (server will create)
          const addRes = await fetch(`${backend}/cart/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              productId: product.id,
              quantity: targetQty,
            }),
          });
          if (addRes.ok) {
            const addData = await addRes.json().catch(() => ({}));
            if (addData?.cartItem) {
              setCartQuantity(addData.cartItem.quantity || 0);
              setCartItemId(addData.cartItem.id || null);
            } else {
              await fetchCartForProduct();
            }
            try {
              localStorage.setItem("cartUpdated", String(Date.now()));
            } catch {}
          }
        }
        setCartNotice("Cart updated");
        setTimeout(() => setCartNotice(null), 1400);
      }
    } catch (e) {
      setCartNotice("Failed to update cart");
      setTimeout(() => setCartNotice(null), 1400);
    } finally {
      setCartLoading(false);
    }
  };

  // When product loads, sync cart info
  useEffect(() => {
    if (product) fetchCartForProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const img = mainImgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
  };

  const handleMouseLeave = () => {
    const img = mainImgRef.current;
    if (!img) return;
    img.style.transformOrigin = `50% 50%`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price);
  };

  if (loading)
    return (
      <div>
        <Header searchTerm="" onSearchChange={() => {}} />
        <main className="pdp-loading">Loading product...</main>
        <Footer />
      </div>
    );

  if (!product)
    return (
      <div>
        <Header searchTerm="" onSearchChange={() => {}} />
        <main className="pdp-notfound">Product not found</main>
        <Footer />
      </div>
    );

  return (
    <div className="pdp-page">
      <Header searchTerm="" onSearchChange={() => {}} />
      <main className="pdp-main">
        <div className="pdp-grid">
          <div className="pdp-image">
            {/* Thumbnails column (left) */}
            {product.images && product.images.length > 1 && (
              <div
                className="pdp-thumbs"
                role="tablist"
                aria-orientation="vertical"
              >
                {product.images.map((img: any, idx: number) => {
                  const src =
                    typeof img === "string"
                      ? resolveImageUrl(img)
                      : img.signedUrl || img.url;
                  return (
                    <button
                      key={idx}
                      className={`pdp-thumb-btn ${
                        idx === selectedIndex ? "active" : ""
                      }`}
                      onClick={() => setSelectedIndex(idx)}
                      aria-selected={idx === selectedIndex}
                      title={`View image ${idx + 1}`}
                    >
                      <img src={src} alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main image with hover-zoom */}
            {product.images && product.images[selectedIndex] ? (
              <div
                className="pdp-main-image-container"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div className="image-overlay">
                  <button
                    className="view-btn"
                    onClick={() => {
                      const src =
                        typeof product.images[selectedIndex] === "string"
                          ? resolveImageUrl(product.images[selectedIndex])
                          : product.images[selectedIndex].signedUrl ||
                            product.images[selectedIndex].url;
                      setImageModalUrl(src);
                      setImageModalOpen(true);
                    }}
                  >
                    View
                  </button>
                  <button
                    className="zoom-btn"
                    onClick={() => {
                      const src =
                        typeof product.images[selectedIndex] === "string"
                          ? resolveImageUrl(product.images[selectedIndex])
                          : product.images[selectedIndex].signedUrl ||
                            product.images[selectedIndex].url;
                      setImageModalUrl(src);
                      setImageModalOpen(true);
                    }}
                  >
                    🔍
                  </button>
                </div>
                <img
                  ref={mainImgRef}
                  className="pdp-main-img"
                  src={
                    typeof product.images[selectedIndex] === "string"
                      ? resolveImageUrl(product.images[selectedIndex])
                      : product.images[selectedIndex].signedUrl ||
                        product.images[selectedIndex].url
                  }
                  alt={product.title}
                  onClick={() => {
                    const src =
                      typeof product.images[selectedIndex] === "string"
                        ? resolveImageUrl(product.images[selectedIndex])
                        : product.images[selectedIndex].signedUrl ||
                          product.images[selectedIndex].url;
                    setImageModalUrl(src);
                    setImageModalOpen(true);
                  }}
                />
              </div>
            ) : (
              <div className="pdp-placeholder">No image</div>
            )}
          </div>
          <div className="pdp-details">
            {(sectionName || subsectionName) && (
              <div className="pdp-breadcrumbs">
                {sectionName && (
                  <a href={`/${encodeURIComponent(sectionName)}`}>
                    {sectionName}
                  </a>
                )}
                {subsectionName && (
                  <>
                    <span> / </span>
                    <a
                      href={`/${encodeURIComponent(
                        sectionName!
                      )}/${encodeURIComponent(subsectionName)}`}
                    >
                      {subsectionName}
                    </a>
                  </>
                )}
              </div>
            )}
            <h1 className="pdp-title">{product.title}</h1>
            <div className="pdp-price">{formatPrice(product.price)}</div>
            {product.description && (
              <p className="pdp-desc">{product.description}</p>
            )}
            {product.tags && product.tags.length > 0 && (
              <div className="pdp-tags">
                {product.tags.map((t: any, i: number) => (
                  <span key={i} className="pdp-tag">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="pdp-actions">
              {/* Inline cart controls: show Add button if qty=0, else show +/- pill */}
              {cartQuantity === 0 ? (
                <div className="pdp-cart-control">
                  <button
                    className="pdp-addcart"
                    onClick={async () => {
                      const token = localStorage.getItem("userToken");
                      if (!token) {
                        navigate("/login");
                        return;
                      }
                      setCartLoading(true);
                      try {
                        const envBackend = (
                          import.meta.env.VITE_BACKEND_URL || ""
                        ).replace(/\/+$/g, "");
                        const isLocalFront =
                          typeof window !== "undefined" &&
                          (window.location.hostname === "localhost" ||
                            window.location.hostname === "127.0.0.1");
                        const backendBase = isLocalFront
                          ? import.meta.env.VITE_LOCAL_BACKEND ||
                            "http://localhost:5000"
                          : envBackend || "https://art-with-sucha.onrender.com";
                        const backend = backendBase.replace(/\/+$/g, "");
                        const res = await fetch(`${backend}/cart/add`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            productId: product.id,
                            quantity: 1,
                          }),
                        });
                        if (!res.ok) throw new Error("Add to cart failed");
                        // refresh cart quantity for this product
                        await fetchCartForProduct();
                        setCartNotice("Added to cart");
                        setTimeout(() => setCartNotice(null), 2500);
                      } catch (e: any) {
                        setCartNotice(e.message || "Failed to add");
                        setTimeout(() => setCartNotice(null), 2500);
                      } finally {
                        setCartLoading(false);
                      }
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              ) : (
                <div className="pdp-cart-control">
                  <button
                    className="cart-decrease"
                    onClick={async () => {
                      if (cartLoading) return;
                      const newQty = cartQuantity - 1;
                      // optimistic UI update; actual state will be corrected from server
                      setCartQuantity(Math.max(0, newQty));
                      await decreaseOneInCart();
                    }}
                    disabled={cartLoading}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <div className="cart-pill">{cartQuantity}</div>
                  <button
                    className="cart-increase"
                    onClick={async () => {
                      if (cartLoading) return;
                      const newQty = Math.min(2, cartQuantity + 1);
                      setCartQuantity(newQty);
                      await addOneToCart();
                    }}
                    disabled={cartLoading || cartQuantity >= 2}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              )}
              {cartNotice && <div className="cart-notice">{cartNotice}</div>}
            </div>
            {/* Reviews Section */}
            <div className="pdp-reviews">
              <h3>Reviews</h3>
              {reviews.length === 0 ? (
                <p className="muted">No reviews yet.</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((r) => (
                    <div key={r.id} className="review-item">
                      <div className="review-header">
                        <strong>{r.user?.name || "User"}</strong>
                        <span className="review-rating">
                          {"★".repeat(r.rating)}
                        </span>
                      </div>
                      {r.message && <p className="review-msg">{r.message}</p>}
                      <div className="review-time">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canReview ? (
                <div className="review-form">
                  <h4>Add your review</h4>
                  <label>
                    Rating:
                    <select
                      value={newRating}
                      onChange={(e) => setNewRating(Number(e.target.value))}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} star{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Message:
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </label>
                  <div className="review-actions">
                    <button
                      onClick={async () => {
                        setSubmittingReview(true);
                        try {
                          const token = localStorage.getItem("userToken");
                          const envBackend = (
                            import.meta.env.VITE_BACKEND_URL || ""
                          ).replace(/\/+$/g, "");
                          const isLocalFront =
                            typeof window !== "undefined" &&
                            (window.location.hostname === "localhost" ||
                              window.location.hostname === "127.0.0.1");
                          const backendBase = isLocalFront
                            ? import.meta.env.VITE_LOCAL_BACKEND ||
                              "http://localhost:5000"
                            : envBackend ||
                              "https://art-with-sucha.onrender.com";
                          const backend = backendBase.replace(/\/+$/g, "");
                          const res = await fetch(
                            `${backend}/reviews/${encodeURIComponent(
                              String(id)
                            )}`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                rating: newRating,
                                message: newMessage,
                              }),
                            }
                          );
                          if (res.ok) {
                            const d = await res.json();
                            setReviews([d.review, ...reviews]);
                            setNewMessage("");
                            setNewRating(5);
                            setCanReview(false); // prevent another review
                          } else {
                            const t = await res.text();
                            alert("Failed to submit review: " + t);
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Failed to submit review");
                        } finally {
                          setSubmittingReview(false);
                        }
                      }}
                      disabled={submittingReview}
                    >
                      {submittingReview ? "Submitting…" : "Submit Review"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">
                  Only users who purchased this product can add reviews.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={imageModalUrl}
        altText={product?.title || "Image"}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
