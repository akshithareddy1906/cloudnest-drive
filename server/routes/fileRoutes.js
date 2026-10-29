
const express = require('express');
const multer = require('multer');

const protect = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const {
  uploadFile,
  listFiles,
  downloadFile,
  previewFile,
  renameFile,
  moveFile,
  deleteFile,
  listTrash,
  restoreFile,
} = require('../controllers/fileController');
const router = express.Router();

router.use(protect);

// Upload a file
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      const status = error instanceof multer.MulterError ? 400 : 415;

      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }

    next();
  });
}, uploadFile);

// List files in the root or a specified folder
router.get('/', listFiles);

// Download or preview a file
router.get('/:id/download', downloadFile);
router.get('/:id/preview', previewFile);

// Rename, move, or move to trash
router.patch('/:id/rename', renameFile);
router.patch('/:id/move', moveFile);
router.delete('/:id', deleteFile);
router.get('/trash', listTrash);
router.patch('/:id/restore', restoreFile);
module.exports = router;
