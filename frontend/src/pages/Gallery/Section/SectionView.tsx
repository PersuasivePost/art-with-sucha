import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../../../components/Header/Header'
import Footer from '../../../components/Footer/Footer'
import { resolveImageUrl } from '../../../utils/image'
import './SectionView.css'

interface Section {
    id: number;
    name: string;
    description: string;
    coverImage: string | null;
    children: Subsection[];
}

interface Subsection {
    id: number;
    name: string;
    description: string;
    coverImage: string | null;
    products: Product[];
}
interface Product {
    id: number;
    title: string;
    description: string;
    price: number;
    images: string[];
    tags: string[];
    createdAt: string;
}

export default function SectionView() {
    const { sectionName } = useParams<{ sectionName: string }>();
    const navigate = useNavigate();
    const [section, setSection] = useState<Section | null>(null);
    const [loading, setLoading] = useState(true);
    const [isArtist, setIsArtist] = useState(false);

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // 'name', 'date'
    const [filterBy, setFilterBy] = useState('all'); // 'all', 'with-image', 'without-image'

    // Modal states for add/edit subsection
    const [showAddSubsection, setShowAddSubsection] = useState(false);
    const [editingSubsection, setEditingSubsection] = useState<Subsection | null>(null);
    const [newSubsection, setNewSubsection] = useState({ 
        name: '', 
        description: '', 
        coverImage: null as File | null 
    });
    const [submittingAdd, setSubmittingAdd] = useState(false);
    const [submittingEdit, setSubmittingEdit] = useState(false);
    const [addError, setAddError] = useState('');
    const [editError, setEditError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('artistToken');
        setIsArtist(!!token);

        if (sectionName) {
            fetchSection();
        }
    }, [sectionName]);

  const fetchSection = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://art-with-sucha.onrender.com';
      const backendClean = backendUrl.replace(/\/+$/g, '');
            const fetchUrl = new URL(encodeURIComponent(sectionName!), backendClean + '/').toString();
            console.log('Fetching section from:', fetchUrl);
            const response = await fetch(fetchUrl);
      const data = await response.json();
      setSection(data.section);
      setLoading(false);
    } 
    catch (error) {
      console.error("Error fetching section:", error);
      setLoading(false);
    }
  }

    const handleSubsectionClick = (subsectionName: string) => {
        navigate(`/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName)}`);
    }

    const handleEditSubsection = (subsection: Subsection) => {
        setEditingSubsection(subsection);
        setNewSubsection({
            name: subsection.name,
            description: subsection.description,
            coverImage: null // Reset file input
        });
        setEditError('');
    };

    const handleDeleteSubsection = async (subsectionName: string) => {
        if (!confirm(`Are you sure you want to delete the subsection "${subsectionName}" and all its products? This action cannot be undone.`)) {
            return;
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://art-with-sucha.onrender.com';
            const backendClean = backendUrl.replace(/\/+$/g, '');
            const fetchUrl = new URL(`${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName)}`, backendClean + '/').toString();
            const response = await fetch(fetchUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                }
            });

            if (response.ok) {
                fetchSection(); // Refresh the section data
            } else {
                console.error('Failed to delete subsection');
                alert('Failed to delete subsection. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting subsection:', error);
            alert('Error deleting subsection. Please try again.');
        }
    };

    const handleAddSubsection = () => {
        setShowAddSubsection(true);
        setNewSubsection({ name: '', description: '', coverImage: null });
        setAddError('');
    };

    const handleAddSubsectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingAdd(true);
        setAddError('');

        try {
            const formData = new FormData();
            formData.append('name', newSubsection.name);
            formData.append('description', newSubsection.description);
            if (newSubsection.coverImage) {
                formData.append('image', newSubsection.coverImage);
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://art-with-sucha.onrender.com';
            const backendClean = backendUrl.replace(/\/+$/g, '');
            const fetchUrl = new URL(`${encodeURIComponent(sectionName!)}/create-subsection`, backendClean + '/').toString();
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                },
                body: formData
            });

            if (response.ok) {
                setShowAddSubsection(false);
                setNewSubsection({ name: '', description: '', coverImage: null });
                fetchSection(); // Refresh the section data
            } else {
                const errorText = await response.text();
                setAddError(errorText || 'Failed to create subsection');
            }
        } catch (error) {
            console.error('Error creating subsection:', error);
            setAddError('Error creating subsection. Please try again.');
        } finally {
            setSubmittingAdd(false);
        }
    };

    const handleEditSubsectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubsection) return;
        
        setSubmittingEdit(true);
        setEditError('');

        try {
            const formData = new FormData();
            formData.append('name', newSubsection.name);
            formData.append('description', newSubsection.description);
            if (newSubsection.coverImage) {
                formData.append('image', newSubsection.coverImage);
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://art-with-sucha.onrender.com';
            const backendClean = backendUrl.replace(/\/+$/g, '');
            const fetchUrl = new URL(`${encodeURIComponent(sectionName!)}/${encodeURIComponent(editingSubsection.name)}`, backendClean + '/').toString();
            const response = await fetch(fetchUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                },
                body: formData
            });

            if (response.ok) {
                setEditingSubsection(null);
                setNewSubsection({ name: '', description: '', coverImage: null });
                fetchSection(); // Refresh the section data
            } else {
                const errorText = await response.text();
                setEditError(errorText || 'Failed to update subsection');
            }
        } catch (error) {
            console.error('Error updating subsection:', error);
            setEditError('Error updating subsection. Please try again.');
        } finally {
            setSubmittingEdit(false);
        }
    }

  // navigation handled by Link in the UI

    // Search and Filter Functions
    const filteredSubsections = section?.children.filter(subsection => {
        const matchesSearch = subsection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            subsection.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filterBy === 'with-image') {
            return matchesSearch && subsection.coverImage;
        } else if (filterBy === 'without-image') {
            return matchesSearch && !subsection.coverImage;
        }
        return matchesSearch;
    }).sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'date') {
            // Assuming subsections have a createdAt field, if not, this will need adjustment
            // For now, using a placeholder if createdAt is not available
            return 0; 
        }
        return 0;
    }) || [];

    if (loading) {
        return (
            <div className="section-view-container">
                <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                <div className="loading">Loading section...</div>
            </div>
        );
    }

    if (!section) {
        return (
            <div className="section-view-container">
                <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                <div className="error">Section not found</div>
            </div>
        );
    }

    return (
    <div>
    <div className="section-view-container">
        <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <div className="section-top">
        <h1 className="section-title">{section.name}</h1>
        {section.description && (
          <p className="section-description">{section.description}</p>
        )}
      </div>

      <div className="section-controls">
        <div className="controls-left">
          <Link to="/" className="back-btn">← Back to Home</Link>
        </div>

        <div className="controls-right">
          {isArtist && (
            <div className="section-actions">
              <button className="add-subsection-btn" onClick={handleAddSubsection}>
                + Add Subsection
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
                  placeholder="Search subsections, descriptions..."
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
                  <option value="date">Sort by Date</option>
              </select>
              <select 
                  value={filterBy} 
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="filter-select"
              >
                  <option value="all">All Subsections</option>
                  <option value="with-image">With Images</option>
                  <option value="without-image">Without Images</option>
              </select>
          </div>
      </div>  

      <div className="subsections-grid">
        {filteredSubsections.length === 0 ? (
            <div className="empty-state">
                <h3>No subsections match your criteria</h3>
                <p>Try adjusting your search or filters.</p>
            </div>
        ) : (
            filteredSubsections.map((subsection) => (
            <div key={subsection.id} className="subsection-card">
                <div
                className="subsection-image"
                onClick={() => handleSubsectionClick(subsection.name)}
                >
        {subsection.coverImage ? (
          <img 
          src={resolveImageUrl(subsection.coverImage) || ''}
          alt={subsection.name}
          loading="lazy"
          />
        ) : (
                    <div className="placeholder-image">No Image</div>
                )}
                </div>
                
                <div className="subsection-info">
                <div 
                    className="subsection-details"
                    onClick={() => handleSubsectionClick(subsection.name)}
                >
                    <h3 className="subsection-name">{subsection.name}</h3>
                    {subsection.description && (
                    <p className="subsection-description">{subsection.description}</p>
                    )}
                    <div className="product-count">
                    {subsection.products?.length || 0} items
                    </div>
                </div>

                {isArtist && (
                    <div className="subsection-actions">
                    <button 
                        className="edit-subsection-btn"
                        onClick={(e) => {
                        e.stopPropagation();
                        handleEditSubsection(subsection);
                        }}
                    >
                        Edit
                    </button>
                    <button 
                        className="delete-subsection-btn"
                        onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubsection(subsection.name);
                        }}
                    >
                        Delete
                    </button>
                    </div>
                )}
                </div>
            </div>
            ))
        )}
      </div>

      {section.children.length === 0 && !searchTerm && (
        <div className="empty-state">
          <h3>No subsections yet</h3>
          <p>This section is empty. {isArtist ? 'Add your first subsection to get started!' : 'Check back later for new content.'}</p>
          {isArtist && (
            <button className="add-first-btn" onClick={handleAddSubsection}>
              Add First Subsection
            </button>
          )}
        </div>
      )}
    </div>

    {/* Add Subsection Modal */}
    {showAddSubsection && (
      <div className="product-modal-overlay">
        <div className="add-product-modal">
          <button 
            className="close-modal-btn"
            onClick={() => setShowAddSubsection(false)}
          >
            ×
          </button>
          <div className="modal-content">
            <h2>Add New Subsection</h2>
            {addError && <div className="error-message">{addError}</div>}
            <form onSubmit={handleAddSubsectionSubmit} className="add-product-form">
              <div className="form-group">
                <label htmlFor="subsection-name">Name *</label>
                <input
                  id="subsection-name"
                  type="text"
                  value={newSubsection.name}
                  onChange={(e) => setNewSubsection({ ...newSubsection, name: e.target.value })}
                  required
                  disabled={submittingAdd}
                  placeholder="Enter subsection name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subsection-description">Description</label>
                <textarea
                  id="subsection-description"
                  value={newSubsection.description}
                  onChange={(e) => setNewSubsection({ ...newSubsection, description: e.target.value })}
                  disabled={submittingAdd}
                  placeholder="Enter subsection description"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subsection-image">Cover Image</label>
                <input
                  id="subsection-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewSubsection({ ...newSubsection, coverImage: e.target.files?.[0] || null })}
                  disabled={submittingAdd}
                />
                <small>Choose a cover image for this subsection</small>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setShowAddSubsection(false)}
                  disabled={submittingAdd}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingAdd || !newSubsection.name.trim()}
                >
                  {submittingAdd ? 'Adding...' : 'Add Subsection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {/* Edit Subsection Modal */}
    {editingSubsection && (
      <div className="product-modal-overlay">
        <div className="edit-product-modal">
          <button 
            className="close-modal-btn"
            onClick={() => setEditingSubsection(null)}
          >
            ×
          </button>
          <div className="modal-content">
            <h2>Edit Subsection</h2>
            {editError && <div className="error-message">{editError}</div>}
            <form onSubmit={handleEditSubsectionSubmit} className="edit-product-form">
              <div className="form-group">
                <label htmlFor="edit-subsection-name">Name *</label>
                <input
                  id="edit-subsection-name"
                  type="text"
                  value={newSubsection.name}
                  onChange={(e) => setNewSubsection({ ...newSubsection, name: e.target.value })}
                  required
                  disabled={submittingEdit}
                  placeholder="Enter subsection name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-subsection-description">Description</label>
                <textarea
                  id="edit-subsection-description"
                  value={newSubsection.description}
                  onChange={(e) => setNewSubsection({ ...newSubsection, description: e.target.value })}
                  disabled={submittingEdit}
                  placeholder="Enter subsection description"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-subsection-image">Cover Image</label>
                <input
                  id="edit-subsection-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewSubsection({ ...newSubsection, coverImage: e.target.files?.[0] || null })}
                  disabled={submittingEdit}
                />
                <small>Choose a new cover image (leave empty to keep current image)</small>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setEditingSubsection(null)}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingEdit || !newSubsection.name.trim()}
                >
                  {submittingEdit ? 'Updating...' : 'Update Subsection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    <Footer />
    </div>
  );
}