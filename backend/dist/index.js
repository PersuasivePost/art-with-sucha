import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
const fsPromises = fs.promises;
import { uploadFile, uploadMultipleFiles, getImageUrl, getMultipleImageUrls, getStorageType } from './utils/storageAdapter.js';
// Load environment variables
dotenv.config();
// Log the storage mode at startup
console.log(`\n🚀 Starting Art Portfolio Backend`);
console.log(`📦 Storage Mode: ${getStorageType().toUpperCase()}`);
console.log(`🎨 Ready to serve!\n`);
const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();
// Initialize S3 client for Backblaze B2
const s3Client = new S3Client({
    region: process.env.B2_REGION || 'us-east-005',
    endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    credentials: {
        accessKeyId: process.env.B2_APPLICATION_KEY_ID || '',
        secretAccessKey: process.env.B2_APPLICATION_KEY || '',
    },
    forcePathStyle: true, // Required for B2
    requestHandler: {
        requestTimeout: 30000,
        httpsAgent: {
            maxSockets: 25,
            keepAlive: true,
        }
    }
});
// Configure multer for memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed!'));
    }
};
const upload = multer({ storage, fileFilter });
const uploadSingleImage = upload.single('image');
const uploadMultipleImages = upload.array('images', 10);
// Upload functions - Keep for backward compatibility with B2
async function uploadFileToB2(file, folder) {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;
    const command = new PutObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME || '',
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
        },
    });
    await s3Client.send(command);
    return {
        key,
        url: `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}/${key}`,
        metadata: {
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date().toISOString(),
        },
    };
}
async function uploadMultipleFilesToB2(files, folder) {
    const uploadPromises = files.map(file => uploadFileToB2(file, folder));
    return Promise.all(uploadPromises);
}
async function generateSignedUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME || '',
        Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
}
// Middleware
// Allow configuring allowed origins via ALLOWED_ORIGINS env var (comma-separated).
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];
const envOrigins = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients (curl, server-to-server) which have no origin
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1)
            return callback(null, true);
        return callback(new Error('CORS policy: origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
// Lightweight health endpoint to quickly verify the server is alive
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Simple request logger to help debug incoming requests and where they hang
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`--> ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`);
    res.on('finish', () => {
        console.log(`<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    res.on('error', (err) => {
        console.error(`Response error for ${req.method} ${req.originalUrl}:`, err);
    });
    next();
});
// GET /sections - Get all sections with signed URLs for cover images
app.get('/sections', async (req, res) => {
    try {
        const sections = await prisma.section.findMany({
            where: {
                parentId: null, // Only fetch main sections
            },
            include: {
                children: {
                    include: {
                        products: true,
                    },
                },
            },
        });
        const sectionsWithSignedUrls = await Promise.all(sections.map(async (section) => {
            const coverImageUrl = section.coverImage
                ? await getImageUrl(section.coverImage)
                : null;
            const childrenWithSignedUrls = await Promise.all(section.children.map(async (subsection) => {
                const subsectionCoverImageUrl = subsection.coverImage
                    ? await getImageUrl(subsection.coverImage)
                    : null;
                return { ...subsection, coverImage: subsectionCoverImageUrl };
            }));
            return { ...section, coverImage: coverImageUrl, children: childrenWithSignedUrls };
        }));
        res.json({ sections: sectionsWithSignedUrls });
    }
    catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Auth route - POST /login
app.post("/login", (req, res) => {
    try {
        const { email, password } = req.body;
        // Simple validation
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        // Check against environment variables
        const artistEmail = process.env.ARTIST_EMAIL;
        const artistPassword = process.env.ARTIST_PASSWORD;
        if (email !== artistEmail || password !== artistPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate JWT token
        const token = jwt.sign({ email: artistEmail }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            message: 'Login successful',
            token,
            artist: { email: artistEmail }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Auth middleware function
const authenticateArtist = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        console.log('Auth header received:', authHeader); // Debug log
        // Handle both "Bearer" and "bearer" (case insensitive)
        const token = authHeader?.replace(/^bearer\s+/i, '') || authHeader?.replace(/^Bearer\s+/, '');
        console.log('Token extracted:', token?.substring(0, 20) + '...'); // Debug log
        if (!token || token === authHeader) {
            console.log('No valid token provided'); // Debug log
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded successfully:', decoded); // Debug log
        req.artist = decoded;
        next();
    }
    catch (error) {
        console.log('Token verification failed:', error); // Debug log
        res.status(401).json({ error: 'Invalid token.' });
    }
};
// Test protected route
app.get("/api/test", authenticateArtist, (req, res) => {
    res.json({ message: 'Protected route works!', artist: req.artist });
});
// Helper function to create URL-friendly slugs
const createSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};
// ====== PUBLIC ROUTES (No Auth Required) ======
// GET /api/github-image/* - Proxy endpoint for private GitHub repository images
// This fetches images from private GitHub repo using backend token and caches them locally
app.get(/^\/api\/github-image\/(.+)$/, async (req, res) => {
    try {
        const key = req.params[0];
        if (!key)
            return res.status(400).json({ error: 'Image key is required' });
        if (getStorageType() !== 'github')
            return res.status(400).json({ error: 'GitHub storage not configured' });
        const owner = process.env.GITHUB_REPO_OWNER || '';
        const repo = process.env.GITHUB_REPO_NAME || '';
        const branch = process.env.GITHUB_REPO_BRANCH || 'main';
        const token = process.env.GITHUB_TOKEN || '';
        if (!owner || !repo)
            return res.status(500).json({ error: 'GitHub storage not properly configured' });
        // Cache setup
        const cacheDir = path.join(process.cwd(), '.cache', 'github-images');
        const safeCacheKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
        const cachePath = path.join(cacheDir, safeCacheKey);
        const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
        try {
            await fsPromises.mkdir(cacheDir, { recursive: true });
        }
        catch (e) { /* non-fatal */ }
        // Serve fresh cache if available
        try {
            const stat = await fsPromises.stat(cachePath).catch(() => null);
            if (stat && (Date.now() - stat.mtimeMs) < CACHE_TTL_MS) {
                console.log(`Serving image from cache: ${cachePath}`);
                const cached = await fsPromises.readFile(cachePath);
                const contentType = key.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' : key.match(/\.png$/i) ? 'image/png' : 'application/octet-stream';
                res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000', 'Access-Control-Allow-Origin': '*' });
                return res.send(cached);
            }
        }
        catch (e) {
            console.warn('Cache check failed:', e);
        }
        // Try raw.githubusercontent first (no auth, faster)
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${key}`;
        let response = null;
        try {
            response = await fetch(rawUrl);
            if (response && response.ok) {
                console.log('Fetched from raw.githubusercontent:', rawUrl);
            }
            else {
                response = null;
            }
        }
        catch (e) {
            console.warn('raw.githubusercontent fetch failed, will try GitHub API:', e && e.message ? e.message : String(e));
            response = null;
        }
        // Fallback to GitHub API with retries if raw failed
        if (!response) {
            if (!token)
                console.warn('No GITHUB_TOKEN set; attempting unauthenticated GitHub API request (may fail)');
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${key}?ref=${branch}`;
            const headers = { 'Accept': 'application/vnd.github.raw', 'X-GitHub-Api-Version': '2022-11-28' };
            if (token)
                headers['Authorization'] = `Bearer ${token}`;
            const tryFetchWithTimeout = async (url, opts, timeoutMs = 30000) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const r = await fetch(url, { ...opts, signal: controller.signal });
                    clearTimeout(id);
                    return r;
                }
                catch (err) {
                    clearTimeout(id);
                    throw err;
                }
            };
            let lastErr = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`Attempt ${attempt} fetching from GitHub API: ${apiUrl}`);
                    response = await tryFetchWithTimeout(apiUrl, { headers }, 30000);
                    if (response && response.ok)
                        break;
                }
                catch (err) {
                    lastErr = err;
                    console.warn(`GitHub API fetch attempt ${attempt} failed:`, err && err.message ? err.message : String(err));
                    const backoffMs = 500 * Math.pow(2, attempt - 1);
                    await new Promise(r => setTimeout(r, backoffMs));
                }
            }
            if (!response) {
                console.error('All attempts to fetch image from GitHub failed', lastErr);
                // Try to serve stale cache if available
                try {
                    const stat = await fsPromises.stat(cachePath).catch(() => null);
                    if (stat) {
                        console.warn('Serving stale cached image due to fetch failure');
                        const cached = await fsPromises.readFile(cachePath);
                        const contentType = key.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' : key.match(/\.png$/i) ? 'image/png' : 'application/octet-stream';
                        res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000', 'Access-Control-Allow-Origin': '*' });
                        return res.send(cached);
                    }
                }
                catch (err) {
                    console.warn('Failed to read stale cache:', err);
                }
                return res.status(502).json({ error: 'Failed to fetch image from GitHub' });
            }
        }
        if (!response.ok) {
            console.error(`GitHub API error for ${key}:`, response.status, response.statusText);
            return res.status(response.status).json({ error: 'Failed to fetch image from GitHub' });
        }
        const contentType = response.headers.get('content-type') || (key.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' : key.match(/\.png$/i) ? 'image/png' : 'application/octet-stream');
        res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000', 'Access-Control-Allow-Origin': '*' });
        try {
            const imageBuffer = Buffer.from(await response.arrayBuffer());
            fsPromises.writeFile(cachePath, imageBuffer).catch((werr) => console.warn('Failed to write cache:', werr));
            return res.send(imageBuffer);
        }
        catch (err) {
            console.error('Error streaming image to client:', err);
            return res.status(500).json({ error: 'Failed to stream image' });
        }
    }
    catch (error) {
        console.error('Error in github-image handler:', error);
        return res.status(500).json({ error: 'Failed to fetch image' });
    }
});
// GET /:sectionName - Get section details with subsections and products
app.get("/:sectionName", async (req, res) => {
    try {
        const { sectionName } = req.params;
        // Find the main section by name or slug
        const mainSection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: sectionName },
                    { name: sectionName.replace(/-/g, ' ') } // Convert slug back to name
                ],
                parentId: null // Ensure it's a main section
            },
            include: {
                children: {
                    include: {
                        products: {
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                price: true,
                                images: true, // This field exists in the database  
                                tags: true,
                                createdAt: true
                            } // Temporary type assertion
                        }
                    }
                }
            }
        });
        if (!mainSection) {
            res.status(404).json({ error: 'Section not found' });
            return;
        }
        // Generate signed URLs for subsection cover images and product images
        const childrenWithSignedUrls = await Promise.all(mainSection.children.map(async (subsection) => {
            const subsectionCoverImageUrl = subsection.coverImage
                ? await getImageUrl(subsection.coverImage)
                : null;
            // Generate signed URLs for products in this subsection
            const productsWithSignedUrls = await Promise.all((subsection.products || []).map(async (product) => {
                const signedImageUrls = await getMultipleImageUrls(product.images || []);
                return { ...product, images: signedImageUrls };
            }));
            return {
                ...subsection,
                coverImage: subsectionCoverImageUrl,
                products: productsWithSignedUrls
            };
        }));
        // Generate signed URL for main section cover image (if exists)
        const mainSectionCoverImageUrl = mainSection.coverImage
            ? await getImageUrl(mainSection.coverImage)
            : null;
        const sectionWithSignedUrls = {
            ...mainSection,
            coverImage: mainSectionCoverImageUrl,
            children: childrenWithSignedUrls
        };
        res.json({
            section: sectionWithSignedUrls,
            subsections: childrenWithSignedUrls
        });
    }
    catch (error) {
        console.error('Error fetching section:', error);
        res.status(500).json({ error: 'Failed to fetch section' });
    }
});
// GET /:sectionName/:subsectionName - Get all products under a subsection
app.get("/:sectionName/:subsectionName", async (req, res) => {
    try {
        const { sectionName, subsectionName } = req.params;
        // Convert URL parameters back to names
        const actualSectionName = sectionName.replace(/-/g, ' ');
        const actualSubsectionName = subsectionName.replace(/-/g, ' ');
        // Find the subsection and verify it belongs to the correct main section
        const subsection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: subsectionName },
                    { name: actualSubsectionName }
                ],
                parent: {
                    OR: [
                        { name: sectionName },
                        { name: actualSectionName }
                    ]
                }
            },
            include: {
                products: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        price: true,
                        images: true,
                        tags: true,
                        createdAt: true
                    }
                },
                parent: true
            }
        });
        if (!subsection) {
            res.status(404).json({ error: 'Subsection not found' });
            return;
        }
        // Generate signed URLs for product images
        const productsWithSignedUrls = await Promise.all((subsection.products || []).map(async (product) => {
            const signedImageUrls = await getMultipleImageUrls(product.images || []);
            return { ...product, images: signedImageUrls };
        }));
        res.json({
            subsection: subsection,
            products: productsWithSignedUrls,
            mainSection: subsection.parent || null
        });
    }
    catch (error) {
        console.error('Error fetching subsection products:', error);
        res.status(500).json({ error: 'Failed to fetch subsection products' });
    }
});
// POST /create-section - Create main section (Level 1)
app.post("/create-section", authenticateArtist, uploadSingleImage, async (req, res) => {
    try {
        const { name, description } = req.body;
        const imageFile = req.file;
        if (!name) {
            res.status(400).json({ error: 'Section name is required' });
            return;
        }
        let coverImageKey = null;
        // Upload image if provided
        if (imageFile) {
            try {
                const uploadResult = await uploadFile(imageFile, 'sections');
                coverImageKey = uploadResult.key;
            }
            catch (uploadError) {
                console.error('Error uploading section image:', uploadError);
                res.status(500).json({ error: 'Failed to upload image' });
                return;
            }
        }
        // Create main section (Level 1)
        const section = await prisma.section.create({
            data: {
                name,
                description,
                coverImage: coverImageKey,
                parentId: null // This makes it a main section
            }
        });
        res.status(201).json({
            message: 'Main section created successfully',
            section,
            slug: createSlug(name)
        });
    }
    catch (error) {
        console.error('Error creating main section:', error);
        res.status(500).json({ error: 'Failed to create main section' });
    }
});
// POST /:sectionName - Add a sub-section under sectionName (Level 2)
app.post("/:sectionName", authenticateArtist, uploadSingleImage, async (req, res) => {
    try {
        const { sectionName } = req.params;
        const { name, description } = req.body;
        const imageFile = req.file;
        if (!sectionName || !name) {
            res.status(400).json({ error: 'Section name and subsection name are required' });
            return;
        }
        // Convert URL parameter back to section name
        const actualSectionName = sectionName.replace(/-/g, ' ');
        let coverImageKey = null;
        // Upload image if provided
        if (imageFile) {
            try {
                const uploadResult = await uploadFile(imageFile, 'sections');
                coverImageKey = uploadResult.key;
            }
            catch (uploadError) {
                console.error('Error uploading subsection image:', uploadError);
                res.status(500).json({ error: 'Failed to upload image' });
                return;
            }
        }
        // Find the parent section (Level 1)
        let parentSection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: sectionName },
                    { name: actualSectionName }
                ],
                parentId: null
            }
        });
        // If parent section doesn't exist, create it first
        if (!parentSection) {
            parentSection = await prisma.section.create({
                data: {
                    name: actualSectionName,
                    description: `${actualSectionName} section`,
                    parentId: null
                }
            });
        }
        // Create the subsection (Level 2)
        const subsection = await prisma.section.create({
            data: {
                name,
                description,
                coverImage: coverImageKey,
                parentId: parentSection.id
            }
        });
        res.status(201).json({
            message: 'Subsection created successfully',
            subsection,
            slug: createSlug(name), // Return the slug for frontend use
            parentSlug: createSlug(parentSection.name)
        });
    }
    catch (error) {
        console.error('Error creating subsection:', error);
        res.status(500).json({ error: 'Failed to create subsection' });
    }
});
// POST /:sectionName/create-subsection - Add a sub-section under sectionName (Alternative endpoint)
app.post("/:sectionName/create-subsection", authenticateArtist, uploadSingleImage, async (req, res) => {
    try {
        const { sectionName } = req.params;
        const { name, description } = req.body;
        const imageFile = req.file;
        if (!sectionName || !name) {
            res.status(400).json({ error: 'Section name and subsection name are required' });
            return;
        }
        // Convert URL parameter back to section name
        const actualSectionName = sectionName.replace(/-/g, ' ');
        let coverImageKey = null;
        // Upload image if provided
        if (imageFile) {
            try {
                const uploadResult = await uploadFile(imageFile, 'sections');
                coverImageKey = uploadResult.key;
            }
            catch (uploadError) {
                console.error('Error uploading subsection image:', uploadError);
                res.status(500).json({ error: 'Failed to upload image' });
                return;
            }
        }
        // Find the parent section (Level 1)
        let parentSection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: sectionName },
                    { name: actualSectionName }
                ],
                parentId: null
            }
        });
        // If parent section doesn't exist, create it first
        if (!parentSection) {
            parentSection = await prisma.section.create({
                data: {
                    name: actualSectionName,
                    description: `${actualSectionName} section`,
                    parentId: null
                }
            });
        }
        // Create the subsection (Level 2)
        const subsection = await prisma.section.create({
            data: {
                name,
                description,
                coverImage: coverImageKey,
                parentId: parentSection.id
            }
        });
        res.status(201).json({
            message: 'Subsection created successfully',
            subsection,
            slug: createSlug(name), // Return the slug for frontend use
            parentSlug: createSlug(parentSection.name)
        });
    }
    catch (error) {
        console.error('Error creating subsection:', error);
        res.status(500).json({ error: 'Failed to create subsection' });
    }
});
// POST /:sectionName/:subsectionName/add-product - Add a product under subsection
app.post("/:sectionName/:subsectionName/add-product", authenticateArtist, uploadMultipleImages, async (req, res) => {
    try {
        const { sectionName, subsectionName } = req.params;
        const { title, description, price, tags } = req.body;
        const imageFiles = req.files;
        console.log('Add product request received:');
        console.log('Params:', { sectionName, subsectionName });
        console.log('Body:', { title, description, price, tags });
        console.log('Files:', imageFiles ? imageFiles.length : 0);
        if (imageFiles) {
            imageFiles.forEach((file, index) => {
                console.log(`File ${index}:`, { name: file.originalname, size: file.size, mimetype: file.mimetype });
            });
        }
        if (!sectionName || !subsectionName || !title || !price) {
            res.status(400).json({ error: 'Section name, subsection name, title, and price are required' });
            return;
        }
        // Convert URL parameters back to names
        const actualSectionName = sectionName.replace(/-/g, ' ');
        const actualSubsectionName = subsectionName.replace(/-/g, ' ');
        // Upload images to B2 if provided
        let imageKeys = [];
        if (imageFiles && imageFiles.length > 0) {
            try {
                const uploadResults = await uploadMultipleFiles(imageFiles, 'products');
                imageKeys = uploadResults.map((result) => result.key);
            }
            catch (uploadError) {
                console.error('Error uploading product images:', uploadError);
                res.status(500).json({ error: 'Failed to upload images' });
                return;
            }
        }
        // Verify the subsection exists and belongs to the correct main section
        const subsection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: subsectionName },
                    { name: actualSubsectionName }
                ],
                parent: {
                    OR: [
                        { name: sectionName },
                        { name: actualSectionName }
                    ]
                }
            }
        });
        if (!subsection) {
            res.status(404).json({ error: 'Subsection not found' });
            return;
        }
        // Parse price - remove any currency symbols and parse as float
        const cleanPrice = typeof price === 'string' ? price.replace(/[^\d.]/g, '') : price;
        const numericPrice = parseFloat(cleanPrice);
        if (isNaN(numericPrice)) {
            res.status(400).json({ error: 'Invalid price format' });
            return;
        }
        // Parse tags - handle both JSON string and array formats
        let parsedTags = [];
        if (tags) {
            if (typeof tags === 'string') {
                try {
                    parsedTags = JSON.parse(tags);
                }
                catch (e) {
                    // If JSON parsing fails, treat as comma-separated string
                    parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                }
            }
            else if (Array.isArray(tags)) {
                parsedTags = tags;
            }
        }
        const product = await prisma.product.create({
            data: {
                title,
                description,
                price: numericPrice,
                tags: parsedTags,
                images: imageKeys, // Use the uploaded image keys
                sectionId: subsection.id
            }
        });
        // Generate signed URLs for the created product images
        const signedImageUrls = await getMultipleImageUrls(product.images || []);
        const productWithSignedUrls = { ...product, images: signedImageUrls };
        res.status(201).json({
            message: 'Product created successfully',
            product: productWithSignedUrls,
            slug: createSlug(title)
        });
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// PUT /:sectionName - Edit section
app.put("/:sectionName", authenticateArtist, uploadSingleImage, async (req, res) => {
    try {
        const { sectionName } = req.params;
        const { name, description } = req.body;
        const imageFile = req.file; // Get the uploaded file
        if (!sectionName) {
            res.status(400).json({ error: 'Section name is required' });
            return;
        }
        let coverImageKey = null;
        // If a new image is provided, upload it
        if (imageFile) {
            try {
                const uploadResult = await uploadFile(imageFile, 'sections');
                coverImageKey = uploadResult.key;
            }
            catch (uploadError) {
                console.error('Error uploading section image:', uploadError);
                res.status(500).json({ error: 'Failed to upload new image' });
                return;
            }
        }
        // Find the existing section to get its current coverImage if no new one is uploaded
        const existingSection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: sectionName },
                    { name: sectionName.replace(/-/g, ' ') }
                ],
                parentId: null
            },
            select: { coverImage: true }
        });
        // Use the new coverImageKey if uploaded, otherwise keep the existing one
        const finalCoverImage = coverImageKey !== null ? coverImageKey : existingSection?.coverImage;
        const section = await prisma.section.updateMany({
            where: {
                OR: [
                    { name: sectionName },
                    { name: sectionName.replace(/-/g, ' ') } // Convert slug back to name
                ],
                parentId: null
            },
            data: {
                name: name || sectionName,
                description,
                coverImage: finalCoverImage === undefined ? null : finalCoverImage // Ensure it's string | null
            }
        });
        if (section.count === 0) {
            res.status(404).json({ error: 'Section not found' });
            return;
        }
        res.json({ message: 'Section updated successfully' });
    }
    catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({ error: 'Failed to update section' });
    }
});
// PUT /:sectionName/:subsectionName - Edit subsection
app.put("/:sectionName/:subsectionName", authenticateArtist, uploadSingleImage, async (req, res) => {
    try {
        const { sectionName, subsectionName } = req.params;
        const { name, description } = req.body;
        const imageFile = req.file; // Get the uploaded file
        if (!sectionName || !subsectionName) {
            res.status(400).json({ error: 'Section name and subsection name are required' });
            return;
        }
        // Convert URL parameters back to names
        const actualSectionName = sectionName.replace(/-/g, ' ');
        const actualSubsectionName = subsectionName.replace(/-/g, ' ');
        let coverImageKey = null;
        // If a new image is provided, upload it
        if (imageFile) {
            try {
                const uploadResult = await uploadFile(imageFile, 'sections'); // Upload to sections folder
                coverImageKey = uploadResult.key;
            }
            catch (uploadError) {
                console.error('Error uploading subsection image:', uploadError);
                res.status(500).json({ error: 'Failed to upload new image' });
                return;
            }
        }
        // Find the existing subsection to get its current coverImage if no new one is uploaded
        const existingSubsection = await prisma.section.findFirst({
            where: {
                OR: [
                    { name: subsectionName },
                    { name: actualSubsectionName }
                ],
                parent: {
                    OR: [
                        { name: sectionName },
                        { name: actualSectionName }
                    ]
                }
            },
            select: { coverImage: true }
        });
        // Use the new coverImageKey if uploaded, otherwise keep the existing one
        const finalCoverImage = coverImageKey !== null ? coverImageKey : existingSubsection?.coverImage;
        // Find and update the subsection
        const subsection = await prisma.section.updateMany({
            where: {
                OR: [
                    { name: subsectionName },
                    { name: actualSubsectionName }
                ],
                parent: {
                    OR: [
                        { name: sectionName },
                        { name: actualSectionName }
                    ]
                }
            },
            data: {
                name: name || actualSubsectionName,
                description,
                coverImage: finalCoverImage === undefined ? null : finalCoverImage // Ensure it's string | null
            }
        });
        if (subsection.count === 0) {
            res.status(404).json({ error: 'Subsection not found' });
            return;
        }
        res.json({ message: 'Subsection updated successfully' });
    }
    catch (error) {
        console.error('Error updating subsection:', error);
        res.status(500).json({ error: 'Failed to update subsection' });
    }
});
// PUT /:sectionName/:subsectionName/:id - Edit product
app.put("/:sectionName/:subsectionName/:id", authenticateArtist, uploadMultipleImages, async (req, res) => {
    try {
        const { sectionName, subsectionName, id } = req.params;
        const { title, description, price, tags } = req.body;
        const imageFiles = req.files || [];
        if (!sectionName || !subsectionName || !id) {
            res.status(400).json({ error: 'Section name, subsection name, and product ID are required' });
            return;
        }
        // Convert URL parameters back to names
        const actualSectionName = sectionName.replace(/-/g, ' ');
        const actualSubsectionName = subsectionName.replace(/-/g, ' ');
        const actualProductIdentifier = id.replace(/-/g, ' ');
        // Try to parse as ID first, if that fails, treat as name/slug
        const productId = parseInt(id);
        let existingProduct;
        if (!isNaN(productId)) {
            existingProduct = await prisma.product.findUnique({
                where: { id: productId },
                include: { section: { include: { parent: true } } }
            });
        }
        else {
            existingProduct = await prisma.product.findFirst({
                where: { OR: [{ title: id }, { title: actualProductIdentifier }] },
                include: { section: { include: { parent: true } } }
            });
        }
        if (!existingProduct) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Verify product section/subsection
        const productSubsection = existingProduct.section;
        const productMainSection = productSubsection.parent;
        const isCorrectSubsection = productSubsection.name === subsectionName || productSubsection.name === actualSubsectionName;
        const isCorrectMainSection = productMainSection?.name === sectionName || productMainSection?.name === actualSectionName;
        if (!isCorrectSubsection || !isCorrectMainSection) {
            res.status(404).json({ error: 'Product not found in the specified section/subsection' });
            return;
        }
        // Parse tags
        let parsedTags;
        if (tags !== undefined) {
            if (typeof tags === 'string') {
                try {
                    parsedTags = JSON.parse(tags);
                }
                catch (e) {
                    parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
                }
            }
            else if (Array.isArray(tags))
                parsedTags = tags;
        }
        // Upload new images (if any) and merge with existing
        let finalImages;
        if (imageFiles.length > 0) {
            try {
                const uploadResults = await uploadMultipleFiles(imageFiles, 'products');
                const newKeys = uploadResults.map((r) => r.key);
                finalImages = Array.isArray(existingProduct.images) ? [...existingProduct.images, ...newKeys] : newKeys;
            }
            catch (uploadError) {
                console.error('Error uploading new product images:', uploadError);
                res.status(500).json({ error: 'Failed to upload new images' });
                return;
            }
        }
        // Build update object
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (price !== undefined)
            updateData.price = parseFloat(price);
        if (parsedTags !== undefined)
            updateData.tags = parsedTags;
        if (finalImages !== undefined)
            updateData.images = finalImages;
        const product = await prisma.product.update({ where: { id: existingProduct.id }, data: updateData });
        // Generate signed URLs for the updated product images
        const signedImageUrls = await getMultipleImageUrls(product.images || []);
        const productWithSignedUrls = { ...product, images: signedImageUrls };
        res.json({
            message: 'Product updated successfully',
            product: productWithSignedUrls
        });
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /:sectionName - Delete section (cascade children + products)
app.delete("/:sectionName", authenticateArtist, async (req, res) => {
    try {
        const { sectionName } = req.params;
        if (!sectionName) {
            res.status(400).json({ error: 'Section name is required' });
            return;
        }
        const section = await prisma.section.deleteMany({
            where: {
                OR: [
                    { name: sectionName },
                    { name: sectionName.replace(/-/g, ' ') } // Convert slug back to name
                ],
                parentId: null
            }
        });
        if (section.count === 0) {
            res.status(404).json({ error: 'Section not found' });
            return;
        }
        res.json({ message: 'Section deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting section:', error);
        res.status(500).json({ error: 'Failed to delete section' });
    }
});
// DELETE /:sectionName/:subsectionName - Delete subsection
app.delete("/:sectionName/:subsectionName", authenticateArtist, async (req, res) => {
    try {
        const { sectionName, subsectionName } = req.params;
        if (!sectionName || !subsectionName) {
            res.status(400).json({ error: 'Section name and subsection name are required' });
            return;
        }
        // Convert URL parameters back to names
        const actualSectionName = sectionName.replace(/-/g, ' ');
        const actualSubsectionName = subsectionName.replace(/-/g, ' ');
        // Find and delete the subsection
        const subsection = await prisma.section.deleteMany({
            where: {
                OR: [
                    { name: subsectionName },
                    { name: actualSubsectionName }
                ],
                parent: {
                    OR: [
                        { name: sectionName },
                        { name: actualSectionName }
                    ]
                }
            }
        });
        if (subsection.count === 0) {
            res.status(404).json({ error: 'Subsection not found' });
            return;
        }
        res.json({ message: 'Subsection deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting subsection:', error);
        res.status(500).json({ error: 'Failed to delete subsection' });
    }
});
// DELETE /:sectionName/:subsectionName/:id - Delete product
app.delete("/:sectionName/:subsectionName/:id", authenticateArtist, async (req, res) => {
    try {
        const { sectionName, subsectionName, id } = req.params;
        if (!sectionName || !subsectionName || !id) {
            res.status(400).json({ error: 'Section name, subsection name, and product ID are required' });
            return;
        }
        // Convert URL parameters back to names
        const actualSectionName = sectionName.replace(/-/g, ' ');
        const actualSubsectionName = subsectionName.replace(/-/g, ' ');
        const actualProductIdentifier = id.replace(/-/g, ' ');
        // Try to parse as ID first, if that fails, treat as name/slug
        const productId = parseInt(id);
        let existingProduct;
        if (!isNaN(productId)) {
            // Search by ID
            existingProduct = await prisma.product.findUnique({
                where: { id: productId },
                include: {
                    section: {
                        include: { parent: true }
                    }
                }
            });
        }
        else {
            // Search by title (exact match with original name or slug format)
            existingProduct = await prisma.product.findFirst({
                where: {
                    OR: [
                        { title: id },
                        { title: actualProductIdentifier }
                    ]
                },
                include: {
                    section: {
                        include: { parent: true }
                    }
                }
            });
        }
        if (!existingProduct) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Verify the product belongs to the correct section/subsection
        const productSubsection = existingProduct.section;
        const productMainSection = productSubsection.parent;
        const isCorrectSubsection = productSubsection.name === subsectionName ||
            productSubsection.name === actualSubsectionName;
        const isCorrectMainSection = productMainSection?.name === sectionName ||
            productMainSection?.name === actualSectionName;
        if (!isCorrectSubsection || !isCorrectMainSection) {
            res.status(404).json({ error: 'Product not found in the specified section/subsection' });
            return;
        }
        // Delete the product
        await prisma.product.delete({
            where: {
                id: existingProduct.id
            }
        });
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
// GET /image/:key - Redirect to signed URL for image (so <img src="/image/:key"> works)
// Support keys containing slashes (e.g. 'products/uuid.jpg') by using a wildcard
// NOTE: The streaming `/image/*` handler was removed in favor of the regex
// `app.get(/^\/image\/(.+)$/...)` handler above which redirects to a
// presigned URL. Removing the duplicate wildcard route avoids path parsing
// errors and ensures consistent behavior.
// Start server
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map