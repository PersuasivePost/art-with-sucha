import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../../components/Header/Header';
import './ProductsView.css';

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
  const { sectionName, subsectionName } = useParams<{ sectionName: string; subsectionName: string }>();
  const navigate = useNavigate();
  const [subsection, setSubsection] = useState<Subsection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArtist, setIsArtist] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Add Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    tags: [] as string[],
    images: [] as File[]
  });
  
  // Edit Product Form State
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({
    title: '',
    description: '',
    price: '',
    tags: [] as string[],
    images: [] as File[]
  });
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'date'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'with-image', 'without-image'
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('artistToken');
    setIsArtist(!!token);

    if (sectionName && subsectionName) {
      fetchProducts();
    }
  }, [sectionName, subsectionName]);

  useEffect(() => {
    if (subsection) {
      const filtered = subsection.products.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filterBy === 'with-image') {
          return matchesSearch && product.images && product.images.length > 0;
        } else if (filterBy === 'without-image') {
          return matchesSearch && (!product.images || product.images.length === 0);
        }
        return matchesSearch;
      }).sort((a, b) => {
        if (sortBy === 'name') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'price') {
          return a.price - b.price;
        } else if (sortBy === 'date') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
      setFilteredProducts(filtered);
    }
  }, [subsection, searchTerm, sortBy, filterBy]);

  const fetchProducts = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(
        `${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName!)}`
      );
      const data = await response.json();
      setSubsection(data.subsection);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const handleBackToSection = () => {
    navigate(`/${sectionName}`);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product.id);
    setEditProduct({
      title: product.title,
      description: product.description || '',
      price: product.price.toString(),
      tags: product.tags || [],
      images: [] // Will be handled separately for editing
    });
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('artistToken');
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(
          `${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName!)}/${productId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          // Refresh the products
          fetchProducts();
        } else {
          alert('Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
      }
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setSubmittingAdd(true);
    
    console.log('Add product form data:', {
      title: newProduct.title,
      description: newProduct.description,
      price: newProduct.price,
      tags: newProduct.tags,
      images: newProduct.images,
      imageCount: newProduct.images.length
    });
    
    try {
      const token = localStorage.getItem('artistToken');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      const formData = new FormData();
      formData.append('title', newProduct.title);
      formData.append('description', newProduct.description);
      formData.append('price', newProduct.price);
      // tags as array will be parsed by backend; send as JSON string to be safe
      formData.append('tags', JSON.stringify(newProduct.tags));
      formData.append('subsectionName', subsectionName!);
      
      // Add images
      console.log('Adding images to form data:', newProduct.images.length);
      newProduct.images.forEach((image, index) => {
        console.log(`Adding image ${index}:`, image.name, image.size);
        formData.append('images', image);
      });
      
      console.log('Sending request to:', `${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName!)}/add-product`);
      
      const response = await fetch(`${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName!)}/add-product`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Product created successfully:', result);
        setShowAddProduct(false);
        setNewProduct({ title: '', description: '', price: '', tags: [], images: [] });
        fetchProducts(); // Refresh the products
      } else {
        const errText = await response.text();
        console.error('Add product failed:', response.status, errText);
        setAddError(errText || 'Failed to add product');
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      setAddError(error?.message || 'Error adding product');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSubmittingEdit(true);
    
    console.log('Edit product form data:', {
      title: editProduct.title,
      description: editProduct.description,
      price: editProduct.price,
      tags: editProduct.tags,
      images: editProduct.images,
      imageCount: editProduct.images.length,
      editingProduct: editingProduct
    });
    
    try {
      const token = localStorage.getItem('artistToken');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      const formData = new FormData();
      formData.append('title', editProduct.title);
      formData.append('description', editProduct.description);
      formData.append('price', editProduct.price);
      formData.append('tags', JSON.stringify(editProduct.tags));
      
      // Add new images if any
      console.log('Adding new images to form data:', editProduct.images.length);
      editProduct.images.forEach((image, index) => {
        console.log(`Adding new image ${index}:`, image.name, image.size);
        formData.append('images', image);
      });
      
      console.log('Sending PUT request to:', `${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName!)}/${editingProduct}`);
      
      const response = await fetch(`${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName!)}/${editingProduct}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('Edit response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Product updated successfully:', result);
        setEditingProduct(null);
        setEditProduct({ title: '', description: '', price: '', tags: [], images: [] });
        fetchProducts(); // Refresh the products
      } else {
        const errText = await response.text();
        console.error('Update product failed:', response.status, errText);
        setEditError(errText || 'Failed to update product');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      setEditError(error?.message || 'Error updating product');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0); // Reset to first image
  };

  const nextImage = () => {
    if (selectedProduct && selectedProduct.images) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === selectedProduct.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProduct && selectedProduct.images) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedProduct.images.length - 1 : prevIndex - 1
      );
    }
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
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
      <div className="products-header">
        <button className="back-btn" onClick={handleBackToSection}>
          ← Back to {sectionName}
        </button>
        
        <div className="subsection-info">
          <h1 className="subsection-title">{subsection.name}</h1>
          {subsection.description && (
            <p className="subsection-description">{subsection.description}</p>
          )}
          <div className="product-count">
            {subsection.products?.length || 0} items
          </div>
        </div>

        {isArtist && (
          <div className="subsection-actions">
            <button className="add-product-btn" onClick={() => setShowAddProduct(true)}>
              + Add Product
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="search-filter-controls">
          <div className="search-bar">
              <input
                  type="text"
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
                <div 
                className="product-image"
                onClick={() => handleProductClick(product)}
                >
                {product.images && product.images.length > 0 ? (
                    <img 
                    src={`${import.meta.env.VITE_BACKEND_URL}/image/${product.images[0]}`}
                    alt={product.title}
                    loading="lazy"
                    />
                ) : (
                    <div className="placeholder-image">No Image</div>
                )}
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

      {(!subsection.products || subsection.products.length === 0) && !searchTerm && (
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>This collection is empty. {isArtist ? 'Add your first product to get started!' : 'Check back later for new artwork.'}</p>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-modal-btn"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>
            
            <div className="modal-content">
              <div className="modal-images">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="image-gallery">
                    <img 
                      src={`${import.meta.env.VITE_BACKEND_URL}/image/${selectedProduct.images[currentImageIndex]}`}
                      alt={selectedProduct.title}
                      className="main-image"
                    />
                    
                    {/* Navigation arrows */}
                    {selectedProduct.images.length > 1 && (
                      <>
                        <button className="nav-arrow prev-arrow" onClick={prevImage}>
                          ‹
                        </button>
                        <button className="nav-arrow next-arrow" onClick={nextImage}>
                          ›
                        </button>
                      </>
                    )}

                    {/* Image indicators */}
                    {selectedProduct.images.length > 1 && (
                      <div className="image-indicators">
                        {selectedProduct.images.map((_, index) => (
                          <button
                            key={index}
                            className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                            onClick={() => goToImage(index)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="placeholder-image-large">No Images Available</div>
                )}
              </div>
              
              <div className="modal-details">
                <h2 className="modal-title">{selectedProduct.title}</h2>
                <div className="modal-price">{formatPrice(selectedProduct.price)}</div>
                
                {selectedProduct.description && (
                  <div className="modal-description">
                    <h4>Description</h4>
                    <p>{selectedProduct.description}</p>
                  </div>
                )}
                
                {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                  <div className="modal-tags">
                    <h4>Tags</h4>
                    <div className="tags-list">
                      {selectedProduct.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="modal-actions">
                  <button className="contact-btn" onClick={() => navigate('/contact-us')}>
                    Contact for Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="product-modal-overlay" onClick={() => setShowAddProduct(false)}>
          <div className="product-modal add-product-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-modal-btn"
              onClick={() => setShowAddProduct(false)}
            >
              ×
            </button>
            
            <div className="modal-content">
              <h2>Add New Product</h2>
              <form onSubmit={handleAddProductSubmit} className="add-product-form">
                {addError && <div className="error-message">{addError}</div>}
                <div className="form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
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
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Describe your product..."
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="price">Price (USD) *</label>
                  <input
                    type="number"
                    id="price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
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
                              const newTags = newProduct.tags.filter((_, i) => i !== index);
                              setNewProduct({...newProduct, tags: newTags});
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="tags-input-field"
                        placeholder={newProduct.tags.length === 0 ? "Add tags (press Enter or comma to add)" : ""}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !newProduct.tags.includes(value)) {
                              setNewProduct({
                                ...newProduct, 
                                tags: [...newProduct.tags, value]
                              });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (value && !newProduct.tags.includes(value)) {
                            setNewProduct({
                              ...newProduct, 
                              tags: [...newProduct.tags, value]
                            });
                            e.currentTarget.value = '';
                          }
                        }}
                        disabled={submittingAdd}
                      />
                    </div>
                  </div>
                  <small>Press Enter or comma to add tags. Click × to remove tags.</small>
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
                      setNewProduct({...newProduct, images: files});
                    }}
                    required
                    disabled={submittingAdd}
                  />
                  <small>Upload high-quality images of your product (JPG, PNG, max 10MB each)</small>
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddProduct(false)} disabled={submittingAdd}>Cancel</button>
                  <button type="submit" disabled={submittingAdd}>{submittingAdd ? 'Adding…' : 'Add Product'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="product-modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="product-modal edit-product-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-modal-btn"
              onClick={() => setEditingProduct(null)}
            >
              ×
            </button>
            
            <div className="modal-content">
              <h2>Edit Product</h2>
              <form onSubmit={handleEditProductSubmit} className="edit-product-form">
                {editError && <div className="error-message">{editError}</div>}
                <div className="form-group">
                  <label htmlFor="edit-title">Title *</label>
                  <input
                    type="text"
                    id="edit-title"
                    value={editProduct.title}
                    onChange={(e) => setEditProduct({...editProduct, title: e.target.value})}
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
                    onChange={(e) => setEditProduct({...editProduct, description: e.target.value})}
                    placeholder="Describe your product..."
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-price">Price (USD) *</label>
                  <input
                    type="number"
                    id="edit-price"
                    value={editProduct.price}
                    onChange={(e) => setEditProduct({...editProduct, price: e.target.value})}
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
                              const newTags = editProduct.tags.filter((_, i) => i !== index);
                              setEditProduct({...editProduct, tags: newTags});
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="tags-input-field"
                        placeholder={editProduct.tags.length === 0 ? "Add tags (press Enter or comma to add)" : ""}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (value && !editProduct.tags.includes(value)) {
                              setEditProduct({
                                ...editProduct, 
                                tags: [...editProduct.tags, value]
                              });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.currentTarget.value.trim();
                          if (value && !editProduct.tags.includes(value)) {
                            setEditProduct({
                              ...editProduct, 
                              tags: [...editProduct.tags, value]
                            });
                            e.currentTarget.value = '';
                          }
                        }}
                        disabled={submittingEdit}
                      />
                    </div>
                  </div>
                  <small>Press Enter or comma to add tags. Click × to remove tags.</small>
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
                      setEditProduct({...editProduct, images: files});
                    }}
                    disabled={submittingEdit}
                  />
                  <small>Upload additional images for this product (optional)</small>
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={() => setEditingProduct(null)} disabled={submittingEdit}>Cancel</button>
                  <button type="submit" disabled={submittingEdit}>{submittingEdit ? 'Updating…' : 'Update Product'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}