
const mongoose = require('mongoose');
const Folder = require('../models/Folder');
const File = require('../models/File');

const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required.',
      });
    }

    const cleanName = name.trim();

    if (cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Folder name cannot exceed 100 characters.',
      });
    }

    let parent = null;

    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent folder ID.',
        });
      }

      parent = await Folder.findOne({
        _id: parentId,
        owner: req.userId,
        isDeleted: false,
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found.',
        });
      }
    }

    const duplicate = await Folder.findOne({
      owner: req.userId,
      parent: parent ? parent._id : null,
      name: cleanName,
      isDeleted: false,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists here.',
      });
    }

    const folder = await Folder.create({
      name: cleanName,
      owner: req.userId,
      parent: parent ? parent._id : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Folder created successfully.',
      folder,
    });
  } catch (error) {
    console.error('Create folder error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to create folder.',
    });
  }
};

const listFolders = async (req, res) => {
  try {
    const { parentId } = req.query;

    let parent = null;

    if (parentId && parentId !== 'root') {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent folder ID.',
        });
      }

      parent = await Folder.findOne({
        _id: parentId,
        owner: req.userId,
        isDeleted: false,
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found.',
        });
      }
    }

    const folders = await Folder.find({
      owner: req.userId,
      parent: parent ? parent._id : null,
      isDeleted: false,
    })
      .select('name parent createdAt updatedAt')
      .sort({ name: 1 });

    return res.json({
      success: true,
      count: folders.length,
      folders,
    });
  } catch (error) {
    console.error('List folders error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve folders.',
    });
  }
};

const renameFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid folder name is required.',
      });
    }

    const cleanName = name.trim();

    if (cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Folder name cannot exceed 100 characters.',
      });
    }

    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.userId,
      isDeleted: false,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found.',
      });
    }

    const duplicate = await Folder.findOne({
      _id: { $ne: folder._id },
      owner: req.userId,
      parent: folder.parent,
      name: cleanName,
      isDeleted: false,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists here.',
      });
    }

    folder.name = cleanName;
    await folder.save();

    return res.json({
      success: true,
      message: 'Folder renamed successfully.',
      folder,
    });
  } catch (error) {
    console.error('Rename folder error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to rename folder.',
    });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.userId,
      isDeleted: false,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found.',
      });
    }

    // Prevent deletion while active child folders or files remain.
    const [childFolder, childFile] = await Promise.all([
      Folder.exists({
        owner: req.userId,
        parent: folder._id,
        isDeleted: false,
      }),
      File.exists({
        owner: req.userId,
        folder: folder._id,
        isDeleted: false,
      }),
    ]);

    if (childFolder || childFile) {
      return res.status(409).json({
        success: false,
        message: 'Move or delete the folder contents first.',
      });
    }

    folder.isDeleted = true;
    folder.deletedAt = new Date();
    await folder.save();

    return res.json({
      success: true,
      message: 'Folder moved to trash.',
    });
  } catch (error) {
    console.error('Delete folder error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete folder.',
    });
  }
};

module.exports = {
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder,
};
