import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../../../components/Header/Header'
import Footer from '../../../components/Footer/Footer'
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

    useEffect(() => {
        const token = localStorage.getItem('artistToken');
        setIsArtist(!!token);

        if (sectionName) {
            fetchSection();
        }
    }, [sectionName]);

    const fetchSection = async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/${encodeURIComponent(sectionName!)}`);
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
        // TODO: Implement edit subsection modal
        console.log('Edit subsection:', subsection);
    };

    const handleDeleteSubsection = async (subsectionName: string) => {
        if (!confirm(`Are you sure you want to delete the subsection "${subsectionName}" and all its products? This action cannot be undone.`)) {
            return;
        }

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${backendUrl}/${encodeURIComponent(sectionName!)}/${encodeURIComponent(subsectionName)}`, {
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
    // TODO: Implement add subsection modal
    console.log('Add new subsection to:', sectionName);
  };

    const handleBackToHome = () => {
        navigate('/');
    };

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
      <div className="section-header">
        <button className="back-btn" onClick={handleBackToHome}>
          ← Back to Home
        </button>
        
        <div className="section-info">
          <h1 className="section-title">{section.name}</h1>
          {section.description && (
            <p className="section-description">{section.description}</p>
          )}
        </div>

        {isArtist && (
          <div className="section-actions">
            <button className="add-subsection-btn" onClick={handleAddSubsection}>
              + Add Subsection
            </button>
          </div>
        )}
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
                    src={subsection.coverImage}
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
    <Footer />
    </div>
  );
}