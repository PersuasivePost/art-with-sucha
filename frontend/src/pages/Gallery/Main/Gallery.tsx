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
            const response = await fetch('FRONTEND_URL' + '$')
        } 
        catch (error) {
            
        }
    }

 

    return (
        <div>
            {/* wannabe gallery it will be home page ig idk lets see bitth */}

        </div>
    )
}