import { useState, useEffect } from 'react'
import './Gallery.css'

interface Section {
    id: number;
    name: string;
    description: string;
    coverImage: string;
    createdAt: string;
    // parentId
    // updatedAt
    // products
    // parent 
    // chidren
}

interface Subsection {
    id: number;
    name: string;
    description: string;
    coverImage: string;
    products: Product[];
    // updatedAt
    // products
    // parent 
    // chidren
}

interface Product {
    id: number;
    title: string;
    description: string;
    price: number;
    images: string[];
    tags: string[];
    createdAt: string;
    // updatedAt
    // sectionId
    // section
}

interface SectionWithSubsections extends Section {
    children: Subsection[];
}

export default function Gallery() {
    const [sections, setSections] = useState<Section[]>([]);
    const [sectionsWithSubsections, setSectionsWithSubsections] = useState<{ [key: string]: SectionWithSubsections }>({});
    const [loading, setLoading] = useState(true);
    const [isArtist, setIsArtist] = useState(false);

    useEffect(() => {
        // check for user authentication
        const token = localStorage.getItem('artistToken');
        setIsArtist(!!token);

        fetchMainSections();
    }, []);

    const fetchMainSections = async () => {
        try {
            const FrontendUrl = import.meta.env.VITE_FRONTEND_URL as string;
            const response = await fetch(FrontendUrl);
            const data = await response.json();
            setSections(data.sections || []);

            // fetch subsections for each section
            for(const section of data.sections) {
                await fetchSectionWithSubsections(section.name);
            }

            setLoading(false);

        } catch (error) {
            console.error('Error fetching main sections:', error);
            setLoading(false);
        }
    }

    const fetchSectionWithSubsections = async (sectionName: string) => {
        try {
            const response = await fetch('FRONTEND_URL' + `${encodeURIComponent(sectionName)}`);
            const data = await response.json();
            setSectionsWithSubsections(prev => ({
                ...prev,
                [sectionName]: data.section
            }));
        } 
        catch (error) {
            console.error(`Error fetching subsection for ${sectionName}`);
        }
    }

    const handleAddSection = () => {
        // add this
        console.log('Add new section modal');
    }

    const handleEditSection = (section: Section) => {
        // add this -> edit section modal
        console.log('Edit section ', section);
    }

    const handleViewAllSubsections = (sectionName: string) => {
        // add this -> navigate to section view page
        console.log('View all subsections for section: ', sectionName);
    }

    const handleSubsectionClick = (sectionName: string, subsectionName: string) => {
        // add this -> navigate to products page
        console.log('Navigate to products: ', sectionName, subsectionName);
    }

    if (loading) {
        return (
            <div>
                Loading...
                {/* add loading animation */}
            </div>
        )
    }

    return (
        <div className='gallery-container'>
           {isArtist && (
                <div className='artist-controls'>
                    <button className='add-section-button' onClick={handleAddSection}>
                        Add Section
                    </button>
                </div>
           )}

           {sections.map((section) => {
                const sectionWithSubs = sectionsWithSubsections[section.name];
                const subsections = sectionWithSubs?.children || [];
                const displaySubsections = subsections.slice(0, 4);
                const hasMore = subsections.length > 4;

                return (
                    <div key={section.id} className='gallery-section'>
                        <div className='section-header'>
                            <h2 className='section-title'>
                                {section.name}
                            </h2>
                            {isArtist && (
                                <button className='edit-section-button' onClick={() => handleEditSection(section)}>
                                    Edit
                                </button>
                            )}
                        </div>  

                        <div className='subsections-container'>
                            {displaySubsections.map((subsections) => (
                                <div key={subsections.id} className='subsection-card' onClick={() => handleSubsectionClick(section.name, subsections.name)}>
                                    <div className='subsection-image'>
                                        {subsections.coverImage ? (
                                            <img src={subsections.coverImage} alt={subsections.name + ' cover image'} loading='lazy' />
                                        ) : (
                                            <div className='placeholder-image'>No Image</div>
                                        )}
                                    </div>
                                    <div className='subsection-info'>
                                        <h3 className='subsection-name'>
                                            {subsections.name}
                                        </h3> 
                                        <div className='arrow-icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                            </svg>
                                            {/* arrow icon */}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {hasMore && (
                                <div className='view-all-card' onClick={() => handleViewAllSubsections(section.name)}>
                                    <div className='view-all-content'>
                                        <h3>
                                            View All Subsections
                                            <p>{subsections.length} collections</p>
                                            <div className='arrow-icon'>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </div>
                                        </h3>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* hellow world */}
                    </div>
                );
           })}
        </div>
    );
}