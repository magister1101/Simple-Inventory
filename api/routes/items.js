const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();

const itemsController = require('../controllers/items');
const item = require('../models/item');

//ROUTERS

router.get('/', itemsController.items_get_item);
router.get('/search', itemsController.items_search_item)
router.get('/scan/:id', itemsController.items_scan_item);
router.get('/:id', itemsController.items_get_itemById);
router.post('/', upload.none(), itemsController.items_create_item);
router.put('/:id', itemsController.items_archive_item);

module.exports = router;