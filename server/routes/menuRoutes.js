const express = require('express');
const router = express.Router();
const {
    getMenu,
    createMenu,
    updateMenu,
    deleteMenu,
} = require('../controllers/menuController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getMenu).post(protect, admin, createMenu);
router.route('/:id')
    .put(protect, admin, updateMenu)
    .delete(protect, admin, deleteMenu);

module.exports = router;
