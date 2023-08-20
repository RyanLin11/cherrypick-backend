const express = require('express');
const router = express.Router();
const ElectionController = require('../controllers/election');

router.route('/')
    .get(ElectionController.getElections)
    .post(ElectionController.createElection);

router.route('/:id')
    .put(ElectionController.editElection);

router.route('/:id/adduser');


module.exports = router;