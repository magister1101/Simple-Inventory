const express = require('express');
const router = express.Router();

const itemsController = require('../controllers/items');
const item = require('../models/item');

//ROUTERS

router.get('/', itemsController.items_get_item);
router.get('/scan/:id', itemsController.items_scan_item);
router.post('/', itemsController.items_create_item);
router.put('/archive/:id', itemsController.items_archive_item);


module.exports = router;