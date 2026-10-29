
const express = require('express');
const protect = require('../middleware/authMiddleware');

const {
  createShare,
  getShareInfo,
  downloadSharedFile,
  listMyShares,
  revokeShare,
} = require('../controllers/shareController');

const router = express.Router();

// Public routes: no login required, but the token must be valid.
router.get('/:token', getShareInfo);
router.get('/:token/download', downloadSharedFile);
router.post('/:token/download', downloadSharedFile);

// Owner-only management routes.
router.post('/', protect, createShare);
router.get('/', protect, listMyShares);
router.delete('/:id', protect, revokeShare);

module.exports = router;
