
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const File = require('../models/File');
const Folder = require('../models/Folder');
const { uploadDirectory } = require('../middleware/uploadMiddleware');

const STORAGE_LIMIT = 100 * 1024 * 1024; // 100 MB

// Find a file that belongs to the logged-in user.
const getOwnedFile = async (fileId, userId) => {
  if (!mongoose.isValidObjectId(fileId)) {
    return { error: 'Invalid file ID.', status: 400 };
  }

  const file = await File.findOne({
    _id: fileId,
    owner: userId,
    isDeleted: false,
  });

  if (!file) {
    return { error: 'File not found.', status: 404 };
  }

  return { file };
};

// Upload a file and enforce the user's storage quota.
const uploadFile = async (req, res) => {
  let uploadedPath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a file to upload.',
      });
    }

    uploadedPath = req.file.path;

    const { folderId } = req.body;
    let folder = null;

    if (folderId) {
      if (!mongoose.isValidObjectId(folderId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder ID.',
        });
      }

      folder = await Folder.findOne({
        _id: folderId,
        owner: req.userId,
        isDeleted: false,
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Destination folder not found.',
        });
      }
    }

    const result = await File.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.userId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: '$size' },
        },
      },
    ]);

    const usedBytes = result.length ? result[0].totalBytes : 0;

    if (usedBytes + req.file.size > STORAGE_LIMIT) {
      await fs.unlink(uploadedPath).catch(() => {});
      uploadedPath = null;

      return res.status(413).json({
        success: false,
        message: 'Storage limit exceeded. Your account has a 100 MB limit.',
        usedBytes,
        limitBytes: STORAGE_LIMIT,
      });
    }

    const file = await File.create({
      originalName: req.file.originalname,
      storageName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      owner: req.userId,
      folder: folder ? folder._id : null,
    });

    // The file is now safely recorded in the database.
    uploadedPath = null;

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      file: {
        id: file._id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        folder: file.folder,
        createdAt: file.createdAt,
      },
    });
  } catch (error) {
    if (uploadedPath) {
      await fs.unlink(uploadedPath).catch(() => {});
    }

    console.error('Upload error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to upload file.',
    });
  }
};

// List files in the root directory or a specific folder.
const listFiles = async (req, res) => {
  try {
    const { folderId } = req.query;
    let folder = null;

    if (folderId && folderId !== 'root') {
      if (!mongoose.isValidObjectId(folderId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder ID.',
        });
      }

      folder = await Folder.findOne({
        _id: folderId,
        owner: req.userId,
        isDeleted: false,
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found.',
        });
      }
    }

    const files = await File.find({
      owner: req.userId,
      folder: folder ? folder._id : null,
      isDeleted: false,
    })
      .select('-storageName -owner')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    console.error('List files error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve files.',
    });
  }
};

// Download a file owned by the logged-in user.
const downloadFile = async (req, res) => {
  try {
    const result = await getOwnedFile(req.params.id, req.userId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const file = result.file;
    const filePath = path.join(
      uploadDirectory,
      path.basename(file.storageName)
    );

    return res.download(filePath, file.originalName, (error) => {
      if (error && !res.headersSent) {
        return res.status(404).json({
          success: false,
          message: 'File is unavailable on the server.',
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to download file.',
    });
  }
};

// Preview supported images and PDFs.
const previewFile = async (req, res) => {
  try {
    const result = await getOwnedFile(req.params.id, req.userId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const file = result.file;

    const previewTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ]);

    if (!previewTypes.has(file.mimeType)) {
      return res.status(415).json({
        success: false,
        message: 'Preview is supported only for images and PDFs.',
      });
    }

    const filePath = path.join(
      uploadDirectory,
      path.basename(file.storageName)
    );

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });

    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        return res.status(404).json({
          success: false,
          message: 'File is unavailable on the server.',
        });
      }
    });
  } catch (error) {
    console.error('Preview error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to preview file.',
    });
  }
};

// Rename a file without changing its internal storage name.
const renameFile = async (req, res) => {
  try {
    const name = req.body.name ?? req.body.originalName;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 255
    ) {
      return res.status(400).json({
        success: false,
        message: 'File name must be between 1 and 255 characters.',
      });
    }

    const result = await getOwnedFile(req.params.id, req.userId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const file = result.file;
    file.originalName = name.trim();
    await file.save();

    return res.json({
      success: true,
      message: 'File renamed successfully.',
      file: {
        id: file._id,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
      },
    });
  } catch (error) {
    console.error('Rename file error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to rename file.',
    });
  }
};

// Move a file to another folder or back to the root.
const moveFile = async (req, res) => {
  try {
    const result = await getOwnedFile(req.params.id, req.userId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const { folderId } = req.body;
    let destination = null;

    if (folderId) {
      if (!mongoose.isValidObjectId(folderId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid destination folder ID.',
        });
      }

      destination = await Folder.findOne({
        _id: folderId,
        owner: req.userId,
        isDeleted: false,
      });

      if (!destination) {
        return res.status(404).json({
          success: false,
          message: 'Destination folder not found.',
        });
      }
    }

    const file = result.file;
    file.folder = destination ? destination._id : null;
    await file.save();

    return res.json({
      success: true,
      message: 'File moved successfully.',
      file: {
        id: file._id,
        originalName: file.originalName,
        folder: file.folder,
      },
    });
  } catch (error) {
    console.error('Move file error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to move file.',
    });
  }
};

// Move a file to trash. Its stored data remains available for recovery.
const deleteFile = async (req, res) => {
  try {
    const result = await getOwnedFile(req.params.id, req.userId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const file = result.file;
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    return res.json({
      success: true,
      message: 'File moved to trash.',
    });
  } catch (error) {
    console.error('Delete file error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to move file to trash.',
    });
  }
};

const listTrash = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Permanently remove expired trash records and their stored files.
    const expiredFiles = await File.find({
      owner: req.userId,
      isDeleted: true,
      deletedAt: { $lte: cutoff },
    });

    for (const file of expiredFiles) {
      const filePath = path.join(
        uploadDirectory,
        path.basename(file.storageName)
      );

      await fs.unlink(filePath).catch(() => {});
      await File.deleteOne({ _id: file._id, owner: req.userId });
    }

    const expiredFolders = await Folder.find({
      owner: req.userId,
      isDeleted: true,
      deletedAt: { $lte: cutoff },
    });

    for (const folder of expiredFolders) {
      await Folder.deleteOne({ _id: folder._id, owner: req.userId });
    }

    const [files, folders] = await Promise.all([
      File.find({
        owner: req.userId,
        isDeleted: true,
        deletedAt: { $gt: cutoff },
      })
        .select('-storageName -owner')
        .sort({ deletedAt: -1 }),

      Folder.find({
        owner: req.userId,
        isDeleted: true,
        deletedAt: { $gt: cutoff },
      })
        .select('name parent deletedAt createdAt')
        .sort({ deletedAt: -1 }),
    ]);

    return res.json({
      success: true,
      files,
      folders,
      message: 'Trash items are automatically cleaned up after 7 days.',
    });
  } catch (error) {
    console.error('List trash error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve trash.',
    });
  }
};

const restoreFile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID.',
      });
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const file = await File.findOne({
      _id: req.params.id,
      owner: req.userId,
      isDeleted: true,
      deletedAt: { $gt: cutoff },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Trash file not found or its recovery period has expired.',
      });
    }

    // Restore to its original folder only if that folder is still active.
    if (file.folder) {
      const folder = await Folder.findOne({
        _id: file.folder,
        owner: req.userId,
        isDeleted: false,
      });

      if (!folder) {
        file.folder = null;
      }
    }

    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();

    return res.json({
      success: true,
      message: 'File restored successfully.',
      file: {
        id: file._id,
        originalName: file.originalName,
        folder: file.folder,
      },
    });
  } catch (error) {
    console.error('Restore file error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to restore file.',
    });
  }
};

module.exports = {
  uploadFile,
  listFiles,
  downloadFile,
  previewFile,
  renameFile,
  moveFile,
  deleteFile,
  listTrash,
  restoreFile,
};