const express = require('express');
const router = express.Router();
const { getFile, createFile, updateFile, deleteFile, getHistory } = require('../controllers/fileController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/:fileId', getFile);
router.get('/:fileId/history', getHistory);
router.post('/create', createFile);
router.put('/update', updateFile);
router.delete('/delete', deleteFile);

module.exports = router;
