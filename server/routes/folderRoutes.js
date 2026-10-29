
const express = require('express');
const protect = require('../middleware/authMiddleware');

const {
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder,
} = require('../controllers/folderController');

const router = express.Router();

router.use(protect);

router.post('/', createFolder);
router.get('/', listFolders);
router.patch('/:id', renameFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
