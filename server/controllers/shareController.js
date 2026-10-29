
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs/promises');

const Share = require('../models/Share');
const File = require('../models/File');
const { uploadDirectory } = require('../middleware/uploadMiddleware');

// Create a secure share link
const createShare = async (req, res, next) => {
  try {
    const { fileId, expiresInHours = 24, password } = req.body;

    if (!mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID.',
      });
    }

    const hours = Number(expiresInHours);

    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      return res.status(400).json({
        success: false,
        message: 'Expiry must be between 1 and 168 hours.',
      });
    }

    if (
      password !== undefined &&
      password !== '' &&
      (typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 72)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain 8–72 characters.',
      });
    }

    const file = await File.findOne({
      _id: fileId,
      owner: req.userId,
      isDeleted: false,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    // Generate a random token and store only its hash.
    const token = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const passwordHash =
      typeof password === 'string' && password.length > 0
        ? await bcrypt.hash(password, 12)
        : null;

    const expiresAt = new Date(
      Date.now() + hours * 60 * 60 * 1000
    );

    const share = await Share.create({
      file: file._id,
      owner: req.userId,
      tokenHash,
      passwordHash,
      expiresAt,
    });

    const clientUrl = (
      process.env.CLIENT_URL || 'http://localhost:5173'
    ).replace(/\/+$/, '');

    return res.status(201).json({
      success: true,
      message: 'Share link created successfully.',
      share: {
        id: share._id,
        url: `${clientUrl}/share/${token}`,
        expiresAt: share.expiresAt,
        passwordProtected: Boolean(passwordHash),
        downloadCount: share.downloadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Find a valid share link
const findValidShare = async (token) => {
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    return null;
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const share = await Share.findOne({
    tokenHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).select('+passwordHash');

  if (!share) {
    return null;
  }

  const file = await File.findOne({
    _id: share.file,
    owner: share.owner,
    isDeleted: false,
  });

  if (!file) {
    return null;
  }

  return { share, file };
};

// View public share information.
// Password verification is required for downloading, not viewing metadata.
const getShareInfo = async (req, res, next) => {
  try {
    const result = await findValidShare(req.params.token);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'This share link is invalid, expired, or revoked.',
      });
    }

    const { share, file } = result;

    return res.json({
      success: true,
      file: {
        originalName: file.originalName,
        name: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
      },
      passwordProtected: Boolean(share.passwordHash),
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
    });
  } catch (error) {
    next(error);
  }
};

// Download a file through a share link
const downloadSharedFile = async (req, res, next) => {
  try {
    const result = await findValidShare(req.params.token);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'This share link is invalid, expired, or revoked.',
      });
    }

    const { share, file } = result;

    // Validate the password before accessing or sending the file.
    if (share.passwordHash) {
      const password =
        typeof req.body?.password === 'string'
          ? req.body.password
          : req.query?.password;

      if (
        typeof password !== 'string' ||
        password.length === 0 ||
        password.length > 72
      ) {
        return res.status(401).json({
          success: false,
          message: 'Please enter the correct share password.',
        });
      }

      const matches = await bcrypt.compare(
        password,
        share.passwordHash
      );

      if (!matches) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect share password. Please try again.',
        });
      }
    }

    const filePath = path.join(
      uploadDirectory,
      path.basename(file.storageName)
    );

    await fs.access(filePath);

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.download(filePath, file.originalName, async (error) => {
      if (error) {
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Unable to download the file.',
          });
        }
        return;
      }

      try {
        await Share.updateOne(
          {
            _id: share._id,
            revoked: false,
            expiresAt: { $gt: new Date() },
          },
          { $inc: { downloadCount: 1 } }
        );
      } catch (updateError) {
        console.error('Could not update download count.');
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'The stored file could not be found.',
      });
    }

    next(error);
  }
};

// List the current user's share links
const listMyShares = async (req, res, next) => {
  try {
    const shares = await Share.find({ owner: req.userId })
      .select('+passwordHash')
      .populate('file', 'originalName size mimeType')
      .sort({ createdAt: -1 });

    const results = shares.map((share) => ({
      id: share._id,
      file: share.file,
      expiresAt: share.expiresAt,
      passwordProtected: Boolean(share.passwordHash),
      downloadCount: share.downloadCount,
      revoked: share.revoked,
      createdAt: share.createdAt,
      expired: share.expiresAt <= new Date(),
    }));

    return res.json({
      success: true,
      shares: results,
    });
  } catch (error) {
    next(error);
  }
};

// Revoke a share link
const revokeShare = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid share ID.',
      });
    }

    const share = await Share.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.userId,
      },
      { $set: { revoked: true } },
      { new: true }
    );

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share link not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Share link revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShare,
  getShareInfo,
  downloadSharedFile,
  listMyShares,
  revokeShare,
};
