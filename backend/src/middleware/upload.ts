import multer from 'multer';

// Configure multer for memory storage (files will be stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept all image formats
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  // No file size limit as per requirements
});

// Middleware for single image upload (sections)
export const uploadSingleImage = upload.single('image');

// Middleware for multiple image upload (products)
export const uploadMultipleImages = upload.array('images', 10); // Max 10 images per product

// Middleware for optional single image (for updates)
export const uploadOptionalImage = upload.single('image');

// Middleware for optional multiple images (for updates)
export const uploadOptionalImages = upload.array('images', 10);
