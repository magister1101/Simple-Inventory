const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const checkAuth = require('../middleware/check-auth');

const itemsController = require('../controllers/items');
const item = require('../models/item');

//ROUTERS

router.get('/', checkAuth, itemsController.items_search_item);
router.get('/getLogs', checkAuth, itemsController.viewLogs);
router.post('/', checkAuth, itemsController.items_create_item);
router.put('/update/:id', checkAuth, itemsController.items_update_item);

module.exports = router;