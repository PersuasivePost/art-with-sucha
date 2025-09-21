import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import Header from '../../components/Header/Header';
import './Home.css';
import { OrbitProgress } from 'react-loading-indicators';

interface Section {
    id: number;
    name: string;
    description?: string;
    coverImage?: string;
    createdAt: string;
}

interface Subsection {
    id: number;
    name: string;
    description?: string;
    coverImage?: string;
    products?: any[];
}

interface SectionWithSubsections extends Section {
    children?: Subsection[];
}

export default function Home() {
    const navigate = useNavigate();
    const [sections, setSections] = useState<Section[]>([]);
    const [sectionsData, setSectionsData] = useState<{ [key: string]: SectionWithSubsections }>({});
    const [loading, setLoading] = useState(true);
    const [isArtist, setIsArtist] = useState(false);
    
    // Add Section Form State
    const [showAddSection, setShowAddSection] = useState(false);
    const [newSection, setNewSection] = useState({
        name: '',
        description: '',
        coverImage: null as File | null
    });
    
    // Edit Section Form State
    const [editingSection, setEditingSection] = useState<number | null>(null);
    const [editSection, setEditSection] = useState({
        name: '',
        description: '',
        coverImage: null as File | null
    });

    // Add Subsection Form State
    const [addingSubsectionTo, setAddingSubsectionTo] = useState<string | null>(null);
    const [newSubsection, setNewSubsection] = useState({
        name: '',
        description: '',
        coverImage: null as File | null
    });

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name'); // 'name', 'date'
    const [filterBy, setFilterBy] = useState('all'); // 'all', 'with-image', 'without-image'

    // Drag and Drop State
    const [draggedSection, setDraggedSection] = useState<number | null>(null);

    useEffect(() => {
        setIsArtist(!!localStorage.getItem('artistToken'));
        fetchMainSections();
    }, []);

    const fetchMainSections = async () => {
        try {
            // Hardcode for testing - the env var should be 'http://localhost:5000'
            const backendUrl = 'http://localhost:5000';
            console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
            console.log('Using hardcoded backend URL:', backendUrl);
            console.log('Fetching sections from:', `${backendUrl}/`);
            const response = await fetch(`${backendUrl}/`);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw API response:', data);
            console.log('Sections from API:', data.sections);
            console.log('Number of sections:', data.sections?.length || 0);
            setSections(data.sections || []);
            
            // No need to fetch subsections separately - root route already includes them
            setSectionsData(prev => {
                const newData = { ...prev };
                data.sections?.forEach((section: SectionWithSubsections) => {
                    newData[section.name] = section;
                });
                return newData;
            });
        } catch (error) {
            console.error('Error fetching sections:', error);
        } finally {
            setLoading(false);
        }
    };

    // Remove fetchSectionData as it's no longer needed - /sections includes subsections

    const handleAddSection = async () => {
        if (!newSection.name.trim()) return;
        
        try {
            const formData = new FormData();
            formData.append('name', newSection.name);
            formData.append('description', newSection.description);
            if (newSection.coverImage) {
                formData.append('image', newSection.coverImage);
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-section`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                },
                body: formData
            });

            if (response.ok) {
                setNewSection({ name: '', description: '', coverImage: null });
                setShowAddSection(false);
                fetchMainSections(); // Refresh the sections
            } else {
                console.error('Failed to create section');
            }
        } catch (error) {
            console.error('Error creating section:', error);
        }
    };

    const handleEditSection = (section: Section) => {
        setEditingSection(section.id);
        setEditSection({
            name: section.name,
            description: section.description || '',
            coverImage: null
        });
    };

    const handleSaveEdit = async () => {
        if (!editSection.name.trim() || editingSection === null) return;

        try {
            const sectionToEdit = sections.find(s => s.id === editingSection);
            if (!sectionToEdit) return;

            const formData = new FormData();
            formData.append('name', editSection.name);
            formData.append('description', editSection.description);
            if (editSection.coverImage) {
                formData.append('image', editSection.coverImage);
            }
            
            const backendUrl = 'http://localhost:5000'; // Use hardcoded URL for consistency
            const response = await fetch(`${backendUrl}/${encodeURIComponent(sectionToEdit.name)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                    // Do NOT set Content-Type for FormData - browser sets it automatically
                },
                body: formData
            });

            if (response.ok) {
                setEditingSection(null);
                setEditSection({ name: '', description: '', coverImage: null });
                fetchMainSections(); // Refresh the sections
            } else {
                console.error('Failed to update section', await response.json());
            }
        } catch (error) {
            console.error('Error updating section:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingSection(null);
        setEditSection({ name: '', description: '', coverImage: null });
    };

    const handleAddSubsection = (sectionName: string) => {
        setAddingSubsectionTo(sectionName);
        setNewSubsection({ name: '', description: '', coverImage: null });
    };

    const handleSaveSubsection = async () => {
        if (!newSubsection.name.trim() || !addingSubsectionTo) return;

        try {
            const formData = new FormData();
            formData.append('name', newSubsection.name);
            formData.append('description', newSubsection.description);
            if (newSubsection.coverImage) {
                formData.append('image', newSubsection.coverImage);
            }

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/${encodeURIComponent(addingSubsectionTo)}/create-subsection`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                },
                body: formData
            });

            if (response.ok) {
                setNewSubsection({ name: '', description: '', coverImage: null });
                setAddingSubsectionTo(null);
                fetchMainSections(); // Refresh the sections
            } else {
                console.error('Failed to create subsection');
            }
        } catch (error) {
            console.error('Error creating subsection:', error);
        }
    };

    const handleCancelAddSubsection = () => {
        setAddingSubsectionTo(null);
        setNewSubsection({ name: '', description: '', coverImage: null });
    };

    const handleDeleteSection = async (sectionName: string) => {
        if (!confirm(`Are you sure you want to delete the section "${sectionName}" and all its subsections? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/${encodeURIComponent(sectionName)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('artistToken')}`
                }
            });

            if (response.ok) {
                setEditingSection(null);
                fetchMainSections(); // Refresh the sections
            } else {
                console.error('Failed to delete section');
                alert('Failed to delete section. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting section:', error);
            alert('Error deleting section. Please try again.');
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, sectionId: number) => {
        setDraggedSection(sectionId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetSectionId: number) => {
        e.preventDefault();
        
        if (draggedSection && draggedSection !== targetSectionId) {
            // Reorder sections locally for immediate feedback
            const newSections = [...sections];
            const draggedIndex = newSections.findIndex(s => s.id === draggedSection);
            const targetIndex = newSections.findIndex(s => s.id === targetSectionId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [draggedItem] = newSections.splice(draggedIndex, 1);
                newSections.splice(targetIndex, 0, draggedItem);
                setSections(newSections);
            }

            // TODO: Send reorder request to backend
            console.log(`Moved section ${draggedSection} to position of section ${targetSectionId}`);
        }
        
        setDraggedSection(null);
    };

    const handleDragEnd = () => {
        setDraggedSection(null);
    };

    const navigateToSection = (sectionName: string) => {
        navigate(`/${encodeURIComponent(sectionName)}`);
    };

    const navigateToSubsection = (sectionName: string, subsectionName: string) => {
        navigate(`/${encodeURIComponent(sectionName)}/${encodeURIComponent(subsectionName)}`);
    };

    // Search and Filter Functions
    const filteredSections = sections.filter(section => {
        const matchesSearch = section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            section.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filterBy === 'with-image') {
            return matchesSearch && section.coverImage;
        } else if (filterBy === 'without-image') {
            return matchesSearch && !section.coverImage;
        }
        return matchesSearch;
    }).sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'date') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
    });

    console.log('All sections:', sections);
    console.log('Search term:', searchTerm);
    console.log('Filter by:', filterBy);
    console.log('Filtered sections:', filteredSections);
    console.log('Filtered sections length:', filteredSections.length);

    if (loading) {
        return (
            <div>
                <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                <OrbitProgress color="#000000" size="medium" text="" textColor="#ff0000" />
                <Footer />
            </div>
        );
    }

    return (
        <div>
            <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            
            <main className="home-container">
                {/* Search and Filter Controls */}
                <div className="search-filter-controls">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search sections, descriptions, or tags..."
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
                            <option value="all">All Sections</option>
                            <option value="with-image">With Images</option>
                            <option value="without-image">Without Images</option>
                        </select>
                    </div>
                </div>  

                {isArtist && (
                    <div className="artist-controls">
                        {showAddSection ? (
                            <div className="add-section-form">
                                <h3>Add New Section</h3>
                                <input
                                    type="text"
                                    value={newSection.name}
                                    onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                                    placeholder="Section name"
                                    className="section-input"
                                />
                                <textarea
                                    value={newSection.description}
                                    onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                                    placeholder="Section description"
                                    className="section-textarea"
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewSection({...newSection, coverImage: e.target.files?.[0] || null})}
                                    className="section-file-input"
                                />
                                <div className="form-actions">
                                    <button onClick={handleAddSection} className="save-btn">Save Section</button>
                                    <button onClick={() => setShowAddSection(false)} className="cancel-btn">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowAddSection(true)} className="add-section-btn">
                                + Add New Section
                            </button>
                        )}
                    </div>
                )}

                {filteredSections.length === 0 ? (
                    <div className="no-sections">
                        <h2>No sections available</h2>
                        <div style={{background: '#f0f0f0', padding: '10px', margin: '10px', fontSize: '12px', fontFamily: 'monospace'}}>
                            <strong>Debug Info:</strong><br/>
                            - All sections count: {sections.length}<br/>
                            - Filtered sections count: {filteredSections.length}<br/>
                            - Loading state: {loading.toString()}<br/>
                            - Search term: "{searchTerm}"<br/>
                            - Filter by: "{filterBy}"<br/>
                            - Backend URL: {import.meta.env.VITE_BACKEND_URL || 'undefined'}<br/>
                            - First section: {sections[0]?.name || 'none'}<br/>
                        </div>
                        {searchTerm ? <p>No sections match your search criteria.</p> : isArtist && <p>Start by adding your first section above.</p>}
                    </div>
                ) : (
                    filteredSections.map((section) => {
                        const sectionData = sectionsData[section.name];
                        const subsections = sectionData?.children || [];
                        const displaySubsections = subsections.slice(0, 4);
                        const hasMore = subsections.length > 4;

                        return (
                            <div 
                                key={section.id} 
                                className={`section-container ${draggedSection === section.id ? 'dragging' : ''}`}
                                draggable={isArtist}
                                onDragStart={(e) => handleDragStart(e, section.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, section.id)}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="section-header">
                                    {editingSection === section.id ? (
                                        <div className="edit-section-form">
                                            {addingSubsectionTo === section.name ? (
                                                <div className="add-subsection-form">
                                                    <h3>Add New Subsection to "{section.name}"</h3>
                                                    <input
                                                        type="text"
                                                        value={newSubsection.name}
                                                        onChange={(e) => setNewSubsection({...newSubsection, name: e.target.value})}
                                                        placeholder="Subsection name"
                                                        className="section-input"
                                                    />
                                                    <textarea
                                                        value={newSubsection.description}
                                                        onChange={(e) => setNewSubsection({...newSubsection, description: e.target.value})}
                                                        placeholder="Subsection description"
                                                        className="section-textarea"
                                                    />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setNewSubsection({...newSubsection, coverImage: e.target.files?.[0] || null})}
                                                        className="section-file-input"
                                                    />
                                                    <div className="form-actions">
                                                        <button onClick={handleSaveSubsection} className="save-btn">Save Subsection</button>
                                                        <button onClick={handleCancelAddSubsection} className="cancel-btn">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3>Edit Section</h3>
                                                    <input
                                                        type="text"
                                                        value={editSection.name}
                                                        onChange={(e) => setEditSection({...editSection, name: e.target.value})}
                                                        className="section-input"
                                                        placeholder="Section name"
                                                    />
                                                    <textarea
                                                        value={editSection.description}
                                                        onChange={(e) => setEditSection({...editSection, description: e.target.value})}
                                                        placeholder="Section description"
                                                        className="section-textarea"
                                                    />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => setEditSection({...editSection, coverImage: e.target.files?.[0] || null})}
                                                        className="section-file-input"
                                                    />
                                                    <div className="form-actions">
                                                        <button onClick={handleSaveEdit} className="save-btn">Save Changes</button>
                                                        <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                                                        <button 
                                                            onClick={() => handleDeleteSection(section.name)} 
                                                            className="delete-btn"
                                                        >
                                                            Delete Section
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAddSubsection(section.name)} 
                                                            className="add-subsection-btn"
                                                        >
                                                            + Add Subsection
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="section-title">{section.name}</h2>
                                            {isArtist && (
                                                <button 
                                                    className="edit-section-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditSection(section);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                                
                                <div className="subsections-grid">
                                    {/* Render available subsections and a 'View All' card if there are more than 4 */}
                                    {displaySubsections.map((subsection) => (
                                        <div 
                                            key={subsection.id} 
                                            className="subsection-card"
                                            onClick={() => navigateToSubsection(section.name, subsection.name)}
                                        >
                                            <div className="card-image">
                                                {subsection.coverImage ? (
                                                    <img 
                                                        src={subsection.coverImage} 
                                                        alt={subsection.name}
                                                    />
                                                ) : (
                                                    <div className="placeholder-image">No Image</div>
                                                )}
                                            </div>
                                            <div className="card-content">
                                                <h3>{subsection.name}</h3>
                                                <span className="arrow">→</span>
                                            </div>
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <div 
                                            key="view-all"
                                            className="view-all-card"
                                            onClick={() => navigateToSection(section.name)}
                                        >
                                            <div className="view-all-content">
                                                <h3>View All</h3>
                                                <p>{subsections.length} collections</p>
                                                <span className="arrow">→</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            <Footer />
        </div>
    );
}