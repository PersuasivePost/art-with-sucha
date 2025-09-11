import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Extend Express Request type to include artist property
declare global {
  namespace Express {
    interface Request {
      artist?: { email: string };
    }
  }
}

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
const authenticateArtist = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  res.json({ message: 'Protected route works!', artist: req.artist });
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
                images: true, // This field exists in the database  
                tags: true,
                createdAt: true
              } as any // Temporary type assertion
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
      subsections: (mainSection as any).children || []
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
            images: true, // This field exists in the database
            tags: true,
            createdAt: true
          } as any // Temporary type assertion
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
      products: (subsection as any).products || [],
      mainSection: (subsection as any).parent || null
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

    if (!sectionName || !name) {
      res.status(400).json({ error: 'Section name and subsection name are required' });
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

    if (!sectionName || !subsectionName || !title || !price || !images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'Section name, subsection name, title, price, and at least one image are required' });
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
        images, // This field exists in the database
        sectionId: subsection.id
      } as any // Temporary type assertion until Prisma client updates
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

    if (!sectionName) {
      res.status(400).json({ error: 'Section name is required' });
      return;
    }

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

// PUT /:sectionName/:subsectionName - Edit subsection
app.put("/:sectionName/:subsectionName", authenticateArtist, async (req, res) => {
  try {
    const { sectionName, subsectionName } = req.params;
    const { name, description, coverImage } = req.body;

    if (!sectionName || !subsectionName) {
      res.status(400).json({ error: 'Section name and subsection name are required' });
      return;
    }

    // Convert URL parameters back to names
    const actualSectionName = sectionName.replace(/-/g, ' ');
    const actualSubsectionName = subsectionName.replace(/-/g, ' ');

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
        coverImage
      }
    });

    if (subsection.count === 0) {
      res.status(404).json({ error: 'Subsection not found' });
      return;
    }

    res.json({ message: 'Subsection updated successfully' });
  } catch (error) {
    console.error('Error updating subsection:', error);
    res.status(500).json({ error: 'Failed to update subsection' });
  }
});

// PUT /:sectionName/:subsectionName/:id - Edit product
app.put("/:sectionName/:subsectionName/:id", authenticateArtist, async (req, res) => {
  try {
    const { sectionName, subsectionName, id } = req.params;
    const { title, description, price, tags, images } = req.body;

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
    } else {
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

    const isCorrectSubsection = 
      productSubsection.name === subsectionName || 
      productSubsection.name === actualSubsectionName;
    
    const isCorrectMainSection = 
      productMainSection?.name === sectionName || 
      productMainSection?.name === actualSectionName;

    if (!isCorrectSubsection || !isCorrectMainSection) {
      res.status(404).json({ error: 'Product not found in the specified section/subsection' });
      return;
    }

    // Build update data object with only defined values
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (tags !== undefined) updateData.tags = tags;
    if (images !== undefined) updateData.images = images;

    // Update the product
    const product = await prisma.product.update({
      where: {
        id: existingProduct.id
      },
      data: updateData
    });

    res.json({ 
      message: 'Product updated successfully',
      product: {
        id: product.id,
        title: product.title,
        price: product.price
      }
    });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
    } else {
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

    const isCorrectSubsection = 
      productSubsection.name === subsectionName || 
      productSubsection.name === actualSubsectionName;
    
    const isCorrectMainSection = 
      productMainSection?.name === sectionName || 
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
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
