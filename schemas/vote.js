const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const VoteSchema = new mongoose.Schema({
    voter: {
        type: String,
        required: true
    },
    election: {
        type: ObjectId,
        required: true
    },
    option: {
        type: String,
        required: true
    }
});

const Vote = mongoose.model("Vote", VoteSchema);

module.exports = Vote;