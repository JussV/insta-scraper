var express = require('express');
var router = express.Router();
var controller = require('../controllers/scrape');

/* GET (scrape) data for user . */
router.get('/:id', controller.scrape);

module.exports = router;
