import multer from 'multer';

// Configure multer for in-memory storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.'));
    }
  } else {
    cb(new Error('Only image files are allowed.'));
  }
};

// Configure multer with options
export const uploadPhoto = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

export default uploadPhoto;
