import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import "./ProductDetail.css";
import { resolveImageUrl } from "../../../utils/image";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

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
            {product.images && product.images[0] ? (
              <img
                src={
                  typeof product.images[0] === "string"
                    ? resolveImageUrl(product.images[0])
                    : product.images[0].signedUrl || product.images[0].url
                }
                alt={product.title}
              />
            ) : (
              <div className="pdp-placeholder">No image</div>
            )}
          </div>
          <div className="pdp-details">
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
