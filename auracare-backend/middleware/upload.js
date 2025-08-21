const multer = require('multer');
const path = require('path');
const fs = require('fs');
const util = require('util');
const mkdirp = util.promisify(require('mkdirp'));

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads');
fs.existsSync(UPLOAD_DIR) || fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const dest = path.join(UPLOAD_DIR, 'temp');
    await mkdirp(dest);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, and video files are allowed.'));
  }
};

// Configure multer with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1 // Single file per request
  }
});

// Middleware to handle single file upload
const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 100MB.' 
        });
      } else if (err.message.includes('Invalid file type')) {
        return res.status(400).json({ 
          error: err.message 
        });
      }
      return res.status(400).json({ 
        error: 'File upload failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    next();
  });
};

module.exports = {
  uploadSingle
};
