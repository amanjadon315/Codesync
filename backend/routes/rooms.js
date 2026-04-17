const express = require('express');
const router = express.Router();
const { createRoom, getRoom, listRooms, deleteRoom } = require('../controllers/roomController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/', listRooms);
router.post('/create', createRoom);
router.get('/:roomId', getRoom);
router.delete('/:roomId', deleteRoom);

module.exports = router;
