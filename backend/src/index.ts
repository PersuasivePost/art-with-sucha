import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

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
    const token = jwt.sign(
      { email: artistEmail },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      artist: { email: artistEmail }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth middleware function
const authenticateArtist = (req: any, res: express.Response, next: express.NextFunction) => {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
    console.log('Token decoded successfully:', decoded); // Debug log
    req.artist = decoded;
    next();
  } catch (error) {
    console.log('Token verification failed:', error); // Debug log
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Test protected route
app.get("/api/test", authenticateArtist, (req, res) => {
  res.json({ message: 'Protected route works!', artist: (req as any).artist });
});

// Helper function to create URL-friendly slugs
const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// ====== PUBLIC ROUTES (No Auth Required) ======

// GET / - Get all main sections (Level 1)
app.get("/", async (req, res) => {
  try {
    console.log('GET / route hit - fetching main sections'); // Debug log
    
    const mainSections = await prisma.section.findMany({
      where: { parentId: null }, // Top-level sections only
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        createdAt: true
      }
    });
    
    console.log('Found main sections:', mainSections); // Debug log
    
    res.json({
      message: "Art Portfolio Backend 🎨",
      sections: mainSections
    });
  } catch (error) {
    console.error('Error fetching main sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
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
                images: true,
                tags: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!mainSection) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    res.json({
      section: mainSection,
      subsections: mainSection.children
    });
  } catch (error) {
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

    res.json({ 
      subsection: subsection,
      products: subsection.products,
      mainSection: subsection.parent
    });
  } catch (error) {
    console.error('Error fetching subsection products:', error);
    res.status(500).json({ error: 'Failed to fetch subsection products' });
  }
});

// GET /:sectionName/:subsectionName/:productId - Get single product details
app.get("/:sectionName/:subsectionName/:productId", async (req, res) => {
  try {
    const { sectionName, subsectionName, productId } = req.params;
    
    // Convert URL parameters back to names
    const actualSectionName = sectionName.replace(/-/g, ' ');
    const actualSubsectionName = subsectionName.replace(/-/g, ' ');
    
    // Find the product and verify it belongs to the correct section hierarchy
    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(productId),
        section: {
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
      },
      include: {
        section: {
          include: {
            parent: true
          }
        }
      }
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ 
      product,
      breadcrumb: {
        mainSection: product.section.parent?.name,
        subsection: product.section.name,
        productTitle: product.title
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ====== PROTECTED ROUTES (Artist Only) ======

// POST /create-section - Create main section (Level 1)
app.post("/create-section", authenticateArtist, async (req, res) => {
  try {
    const { name, description, coverImage } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Section name is required' });
      return;
    }

    // Create main section (Level 1)
    const section = await prisma.section.create({
      data: {
        name,
        description,
        coverImage,
        parentId: null // This makes it a main section
      }
    });

    res.status(201).json({ 
      message: 'Main section created successfully',
      section,
      slug: createSlug(name)
    });
  } catch (error) {
    console.error('Error creating main section:', error);
    res.status(500).json({ error: 'Failed to create main section' });
  }
});

// POST /:sectionName - Add a sub-section under sectionName (Level 2)
app.post("/:sectionName", authenticateArtist, async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { name, description, coverImage } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Subsection name is required' });
      return;
    }

    // Convert URL parameter back to section name
    const actualSectionName = sectionName.replace(/-/g, ' ');

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
        coverImage,
        parentId: parentSection.id
      }
    });

    res.status(201).json({ 
      message: 'Subsection created successfully',
      subsection,
      slug: createSlug(name), // Return the slug for frontend use
      parentSlug: createSlug(parentSection.name)
    });
  } catch (error) {
    console.error('Error creating subsection:', error);
    res.status(500).json({ error: 'Failed to create subsection' });
  }
});

// POST /:sectionName/:subsectionName/add-product - Add a product under subsection
app.post("/:sectionName/:subsectionName/add-product", authenticateArtist, async (req, res) => {
  try {
    const { sectionName, subsectionName } = req.params;
    const { title, description, price, tags, images } = req.body;

    if (!title || !price || !images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'Title, price, and at least one image are required' });
      return;
    }

    // Convert URL parameters back to names
    const actualSectionName = sectionName.replace(/-/g, ' ');
    const actualSubsectionName = subsectionName.replace(/-/g, ' ');

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

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: numericPrice,
        tags: tags || [],
        images,
        sectionId: subsection.id
      }
    });

    res.status(201).json({ 
      message: 'Product created successfully',
      product,
      slug: createSlug(title)
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /:sectionName - Edit section
app.put("/:sectionName", authenticateArtist, async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { name, description, coverImage } = req.body;

    const section = await prisma.section.updateMany({
      where: { 
        name: sectionName,
        parentId: null 
      },
      data: {
        name: name || sectionName,
        description,
        coverImage
      }
    });

    if (section.count === 0) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    res.json({ message: 'Section updated successfully' });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// PUT /:sectionName/:id - Edit product
app.put("/:sectionName/:id", authenticateArtist, async (req, res) => {
  try {
    const { sectionName, id } = req.params;
    const { title, description, price, tags, imageUrl } = req.body;

    // Build update data object with only defined values
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (tags !== undefined) updateData.tags = tags;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const product = await prisma.product.updateMany({
      where: {
        id: parseInt(id),
        section: {
          parent: {
            name: sectionName
          }
        }
      },
      data: updateData
    });

    if (product.count === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /:sectionName - Delete section (cascade children + products)
app.delete("/:sectionName", authenticateArtist, async (req, res) => {
  try {
    const { sectionName } = req.params;

    const section = await prisma.section.deleteMany({
      where: { 
        name: sectionName,
        parentId: null 
      }
    });

    if (section.count === 0) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// DELETE /:sectionName/:id - Delete product
app.delete("/:sectionName/:id", authenticateArtist, async (req, res) => {
  try {
    const { sectionName, id } = req.params;

    const product = await prisma.product.deleteMany({
      where: {
        id: parseInt(id),
        section: {
          parent: {
            name: sectionName
          }
        }
      }
    });

    if (product.count === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
