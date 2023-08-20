const express = require('express');
const router = express.Router();
const VoteController = require('../controllers/vote');

router.route('/')
    .post(VoteController.createVote);

module.exports = router;