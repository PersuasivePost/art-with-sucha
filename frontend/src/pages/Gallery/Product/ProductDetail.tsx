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
              <button
                className="pdp-addcart"
                onClick={async () => {
                  const token = localStorage.getItem("userToken");
                  if (!token) {
                    navigate("/login");
                    return;
                  }
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
                    alert("Added to cart");
                  } catch (e: any) {
                    alert(e.message || "Failed");
                  }
                }}
              >
                Add to Cart
              </button>
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
