import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import { resolveImageUrl } from "../../../utils/image";
import ImageModal from "../../../components/ImageModal/ImageModal";
import "./ProductsView.css";

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  images: string[];
  tags: string[];
  createdAt: string;
}

interface Subsection {
  id: number;
  name: string;
  description: string;
  coverImage: string | null;
  products: Product[];
}

export default function ProductsView() {
  const { sectionName, subsectionName } = useParams<{
    sectionName: string;
    subsectionName: string;
  }>();
  const navigate = useNavigate();
  // Local-first backend selection helper (prefer localhost during development)
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
  const [subsection, setSubsection] = useState<Subsection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArtist, setIsArtist] = useState(false);

  // Image Modal State (for full-size image view)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState("");

  // Wishlist UI state and toast
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Add Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: "",
    tags: [] as string[],
    images: [] as File[],
  });

  // Edit Product Form State
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({
    title: "",
    description: "",
    price: "",
    tags: [] as string[],
    images: [] as File[],
  });

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name"); // 'name', 'price', 'date'
  const [filterBy, setFilterBy] = useState("all"); // 'all', 'with-image', 'without-image'
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("artistToken");
    setIsArtist(!!token);

    if (sectionName && subsectionName) {
      fetchProducts();
      // also attempt to fetch user's wishlist ids (non-blocking)
      fetchWishlistIds();
    }
  }, [sectionName, subsectionName]);

  const fetchWishlistIds = useCallback(async () => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) return;
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
      const res = await fetch(`${backend}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const ids = (data.items || [])
        .map((it: any) => it.productId || it.product?.id)
        .filter(Boolean) as number[];
      setWishlistIds(ids);
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (subsection) {
      const filtered = subsection.products
        .filter((product) => {
          const matchesSearch =
            product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            product.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            );

          if (filterBy === "with-image") {
            return matchesSearch && product.images && product.images.length > 0;
          } else if (filterBy === "without-image") {
            return (
              matchesSearch && (!product.images || product.images.length === 0)
            );
          }
          return matchesSearch;
        })
        .sort((a, b) => {
          if (sortBy === "name") {
            return a.title.localeCompare(b.title);
          } else if (sortBy === "price") {
            return a.price - b.price;
          } else if (sortBy === "date") {
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
          return 0;
        });
      setFilteredProducts(filtered);
    }
  }, [subsection, searchTerm, sortBy, filterBy]);

  const fetchProducts = async () => {
    try {
      const backendClean = getBackendBase();
      const fetchUrl = new URL(
        `${encodeURIComponent(sectionName!)}/${encodeURIComponent(
          subsectionName!
        )}`,
        backendClean + "/"
      ).toString();
      console.log("Fetching products from:", fetchUrl);
      const response = await fetch(fetchUrl);
      const data = await response.json();
      setSubsection(data.subsection);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  // navigation to parent subsection handled by Link in the UI

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product.id);
    setEditProduct({
      title: product.title,
      description: product.description || "",
      price: product.price.toString(),
      tags: product.tags || [],
      images: [], // Will be handled separately for editing
    });
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const token = localStorage.getItem("artistToken");
        const backendClean = getBackendBase();
        const fetchUrl = new URL(
          `${encodeURIComponent(sectionName!)}/${encodeURIComponent(
            subsectionName!
          )}/${productId}`,
          backendClean + "/"
        ).toString();
        const response = await fetch(fetchUrl, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Refresh the products
          fetchProducts();
        } else {
          alert("Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error deleting product");
      }
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setSubmittingAdd(true);

    console.log("Add product form data:", {
      title: newProduct.title,
      description: newProduct.description,
      price: newProduct.price,
      tags: newProduct.tags,
      images: newProduct.images,
      imageCount: newProduct.images.length,
    });

    try {
      const token = localStorage.getItem("artistToken");
      const backendClean = getBackendBase();

      const formData = new FormData();
      formData.append("title", newProduct.title);
      formData.append("description", newProduct.description);
      formData.append("price", newProduct.price);
      // tags as array will be parsed by backend; send as JSON string to be safe
      formData.append("tags", JSON.stringify(newProduct.tags));
      formData.append("subsectionName", subsectionName!);

      // Add images
      console.log("Adding images to form data:", newProduct.images.length);
      newProduct.images.forEach((image, index) => {
        console.log(`Adding image ${index}:`, image.name, image.size);
        formData.append("images", image);
      });

      const addProductUrl = new URL(
        `${encodeURIComponent(sectionName!)}/${encodeURIComponent(
          subsectionName!
        )}/add-product`,
        backendClean + "/"
      ).toString();
      console.log("Sending request to:", addProductUrl);

      const response = await fetch(addProductUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Product created successfully:", result);
        setShowAddProduct(false);
        setNewProduct({
          title: "",
          description: "",
          price: "",
          tags: [],
          images: [],
        });
        fetchProducts(); // Refresh the products
      } else {
        const errText = await response.text();
        console.error("Add product failed:", response.status, errText);
        setAddError(errText || "Failed to add product");
      }
    } catch (error: any) {
      console.error("Error adding product:", error);
      setAddError(error?.message || "Error adding product");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSubmittingEdit(true);

    console.log("Edit product form data:", {
      title: editProduct.title,
      description: editProduct.description,
      price: editProduct.price,
      tags: editProduct.tags,
      images: editProduct.images,
      imageCount: editProduct.images.length,
      editingProduct: editingProduct,
    });

    try {
      const token = localStorage.getItem("artistToken");
      const backendClean = getBackendBase();

      const formData = new FormData();
      formData.append("title", editProduct.title);
      formData.append("description", editProduct.description);
      formData.append("price", editProduct.price);
      formData.append("tags", JSON.stringify(editProduct.tags));

      // Add new images if any
      console.log("Adding new images to form data:", editProduct.images.length);
      editProduct.images.forEach((image, index) => {
        console.log(`Adding new image ${index}:`, image.name, image.size);
        formData.append("images", image);
      });

      const editProductUrl = new URL(
        `${encodeURIComponent(sectionName!)}/${encodeURIComponent(
          subsectionName!
        )}/${editingProduct}`,
        backendClean + "/"
      ).toString();
      console.log("Sending PUT request to:", editProductUrl);

      const response = await fetch(editProductUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log("Edit response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Product updated successfully:", result);
        setEditingProduct(null);
        setEditProduct({
          title: "",
          description: "",
          price: "",
          tags: [],
          images: [],
        });
        fetchProducts(); // Refresh the products
      } else {
        const errText = await response.text();
        console.error("Update product failed:", response.status, errText);
        setEditError(errText || "Failed to update product");
      }
    } catch (error: any) {
      console.error("Error updating product:", error);
      setEditError(error?.message || "Error updating product");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleProductClick = (product: Product) => {
    // Navigate to product detail page using client-side routing
    const idOrSlug = product.id;
    navigate(
      `/${encodeURIComponent(sectionName!)}/${encodeURIComponent(
        subsectionName!
      )}/product/${encodeURIComponent(String(idOrSlug))}`
    );
  };

  const handleImageClick = (product: Product, idx = 0) => {
    const img = product.images && product.images[idx];
    if (!img) return;
    const src =
      typeof img === "string"
        ? getImageUrl(img)
        : getImageUrl((img as any).url || (img as any).signedUrl);
    setImageModalUrl(src);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageModalUrl("");
  };

  const formatPrice = (price: number) => {
    // Format as Indian Rupees with rupee symbol
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(price);
  };

  // Resolve image entries that might be signed URLs or storage keys or objects
  const getImageUrl = (
    img: string | { signedUrl?: string; url?: string } | undefined
  ) => {
    if (!img) return "";
    // If it's an object with signedUrl or url
    if (typeof img === "object") {
      // @ts-ignore
      if (img.signedUrl) return (img as any).signedUrl;
      // @ts-ignore
      if (img.url) return (img as any).url;
      return "";
    }
    // If it's a string
    if (typeof img === "string") {
      // If already full URL
      if (img.startsWith("http")) return img;
      // Otherwise resolve via helper (handles /api proxy and /image redirect)
      return resolveImageUrl(img) || "";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="products-view-container">
        <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  if (!subsection) {
    return (
      <div className="products-view-container">
        <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <div className="error">Subsection not found</div>
      </div>
    );
  }

  return (
    <div className="products-view-container">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <div className="section-top">
        <h1 className="section-title">{subsection.name}</h1>
        {subsection.description && (
          <p className="section-description">{subsection.description}</p>
        )}
        <div className="product-count">
          {subsection.products?.length || 0} items
        </div>
      </div>

      <div className="section-controls">
        <div className="controls-left">
          <Link to={`/${sectionName}`} className="back-btn">
            ← Back to {sectionName}
          </Link>
        </div>

        <div className="controls-right">
          {isArtist && (
            <div className="section-actions">
              <button
                className="add-product-btn"
                onClick={() => setShowAddProduct(true)}
              >
                + Add Product
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="search-filter-controls">
        <div className="search-bar">
          <input
            type="text"
            id="product-search"
            name="product-search"
            placeholder="Search products, descriptions, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="date">Sort by Date</option>
          </select>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Products</option>
            <option value="with-image">With Images</option>
            <option value="without-image">Without Images</option>
          </select>
        </div>
      </div>

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h3>No products match your criteria</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <div className="image-overlay">
                  <button
                    className="view-btn"
                    onClick={() => handleProductClick(product)}
                  >
                    View
                  </button>
                  <button
                    className="zoom-btn"
                    onClick={() => handleImageClick(product, 0)}
                  >
                    🔍
                  </button>
                  {/* Heart moved into overlay so it appears with other image actions on hover */}
                  <button
                    aria-label={
                      wishlistIds.includes(product.id)
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                    }
                    className={`heart-btn ${
                      wishlistIds.includes(product.id) ? "in-wishlist" : ""
                    }`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const token = localStorage.getItem("userToken");
                      if (!token) {
                        navigate("/login");
                        return;
                      }
                      const currently = wishlistIds.includes(product.id);
                      // optimistic toggle
                      setWishlistIds((prev) =>
                        currently
                          ? prev.filter((id) => id !== product.id)
                          : [...prev, product.id]
                      );
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
                        if (!currently) {
                          await fetch(`${backend}/wishlist/add`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ productId: product.id }),
                          });
                          showToast("Added to wishlist");
                          await fetchWishlistIds();
                        } else {
                          await fetch(
                            `${backend}/wishlist/remove-by-product/${encodeURIComponent(
                              String(product.id)
                            )}`,
                            {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                          showToast("Removed from wishlist");
                          await fetchWishlistIds();
                        }
                      } catch (err) {
                        // rollback optimistic
                        setWishlistIds((prev) =>
                          currently
                            ? [...prev, product.id]
                            : prev.filter((id) => id !== product.id)
                        );
                        showToast(
                          currently ? "Failed to remove" : "Failed to add"
                        );
                      }
                    }}
                  >
                    {wishlistIds.includes(product.id) ? "♥" : "♡"}
                  </button>
                </div>
                <div onClick={() => handleProductClick(product)}>
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={getImageUrl(product.images[0])}
                      alt={product.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="placeholder-image">No Image</div>
                  )}
                </div>
              </div>

              <div className="product-info">
                <h3
                  className="product-title"
                  onClick={() => handleProductClick(product)}
                >
                  {product.title}
                </h3>
                <div className="product-price">
                  {formatPrice(product.price)}
                </div>

                <div className="product-actions">
                  <button
                    className="choose-options-btn"
                    onClick={() => handleProductClick(product)}
                  >
                    Choose Options
                  </button>
                  {isArtist && (
                    <div className="product-admin-actions">
                      <button
                        className="edit-product-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(product);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-product-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {(!subsection.products || subsection.products.length === 0) &&
        !searchTerm && (
          <div className="empty-state">
            <h3>No products yet</h3>
            <p>
              This collection is empty.{" "}
              {isArtist
                ? "Add your first product to get started!"
                : "Check back later for new artwork."}
            </p>
          </div>
        )}

      {/* Product Detail now opens on a dedicated page at /product/:id */}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div
          className="product-modal-overlay"
          onClick={() => setShowAddProduct(false)}
        >
          <div
            className="product-modal add-product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal-btn"
              onClick={() => setShowAddProduct(false)}
            >
              ×
            </button>

            <div className="modal-content">
              <h2>Add New Product</h2>
              <form
                onSubmit={handleAddProductSubmit}
                className="add-product-form"
              >
                {addError && <div className="error-message">{addError}</div>}
                <div className="form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={newProduct.title}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, title: e.target.value })
                    }
                    disabled={submittingAdd}
                    placeholder="Enter product title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your product..."
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="price">Price (INR) *</label>
                  <input
                    type="number"
                    id="price"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    disabled={submittingAdd}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tags">Tags</label>
                  <div className="tags-input-container">
                    <div className="tags-display">
                      {newProduct.tags.map((tag, index) => (
                        <span key={index} className="tag-chip">
                          {tag}
                          <button
                            type="button"
                            className="remove-tag"
                            onClick={() => {
                              const newTags = newProduct.tags.filter(
                                (_, i) => i !== index
                              );
                              setNewProduct({ ...newProduct, tags: newTags });
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        id="add-tags-input"
                        name="add-tags"
                        className="tags-input-field"
                        placeholder={
                          newProduct.tags.length === 0
                            ? "Add tags (press Enter or comma to add)"
                            : ""
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !newProduct.tags.includes(value)) {
                              setNewProduct({
                                ...newProduct,
                                tags: [...newProduct.tags, value],
                              });
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (value && !newProduct.tags.includes(value)) {
                            setNewProduct({
                              ...newProduct,
                              tags: [...newProduct.tags, value],
                            });
                            e.currentTarget.value = "";
                          }
                        }}
                        disabled={submittingAdd}
                      />
                    </div>
                  </div>
                  <small>
                    Press Enter or comma to add tags. Click × to remove tags.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="images">Product Images *</label>
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewProduct({ ...newProduct, images: files });
                    }}
                    required
                    disabled={submittingAdd}
                  />
                  <small>
                    Upload high-quality images of your product (JPG, PNG, max
                    10MB each)
                  </small>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    disabled={submittingAdd}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingAdd}>
                    {submittingAdd ? "Adding…" : "Add Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          className="product-modal-overlay"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="product-modal edit-product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal-btn"
              onClick={() => setEditingProduct(null)}
            >
              ×
            </button>

            <div className="modal-content">
              <h2>Edit Product</h2>
              <form
                onSubmit={handleEditProductSubmit}
                className="edit-product-form"
              >
                {editError && <div className="error-message">{editError}</div>}
                <div className="form-group">
                  <label htmlFor="edit-title">Title *</label>
                  <input
                    type="text"
                    id="edit-title"
                    value={editProduct.title}
                    onChange={(e) =>
                      setEditProduct({ ...editProduct, title: e.target.value })
                    }
                    disabled={submittingEdit}
                    placeholder="Enter product title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-description">Description</label>
                  <textarea
                    id="edit-description"
                    value={editProduct.description}
                    onChange={(e) =>
                      setEditProduct({
                        ...editProduct,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe your product..."
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-price">Price (INR) *</label>
                  <input
                    type="number"
                    id="edit-price"
                    value={editProduct.price}
                    onChange={(e) =>
                      setEditProduct({ ...editProduct, price: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-tags">Tags</label>
                  <div className="tags-input-container">
                    <div className="tags-display">
                      {editProduct.tags.map((tag, index) => (
                        <span key={index} className="tag-chip">
                          {tag}
                          <button
                            type="button"
                            className="remove-tag"
                            onClick={() => {
                              const newTags = editProduct.tags.filter(
                                (_, i) => i !== index
                              );
                              setEditProduct({ ...editProduct, tags: newTags });
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        id="edit-tags-input"
                        name="edit-tags"
                        className="tags-input-field"
                        placeholder={
                          editProduct.tags.length === 0
                            ? "Add tags (press Enter or comma to add)"
                            : ""
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !editProduct.tags.includes(value)) {
                              setEditProduct({
                                ...editProduct,
                                tags: [...editProduct.tags, value],
                              });
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (value && !editProduct.tags.includes(value)) {
                            setEditProduct({
                              ...editProduct,
                              tags: [...editProduct.tags, value],
                            });
                            e.currentTarget.value = "";
                          }
                        }}
                        disabled={submittingEdit}
                      />
                    </div>
                  </div>
                  <small>
                    Press Enter or comma to add tags. Click × to remove tags.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-images">Add New Images</label>
                  <input
                    type="file"
                    id="edit-images"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEditProduct({ ...editProduct, images: files });
                    }}
                    disabled={submittingEdit}
                  />
                  <small>
                    Upload additional images for this product (optional)
                  </small>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    disabled={submittingEdit}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingEdit}>
                    {submittingEdit ? "Updating…" : "Update Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal for Full-Size View */}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={imageModalUrl}
        altText={""}
        onClose={closeImageModal}
      />

      <Footer />
      {toastMessage && (
        <div className="bottom-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
