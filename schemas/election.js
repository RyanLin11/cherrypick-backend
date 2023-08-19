const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
    },
    admin: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        default: [],
        required: true
    },
});

const Election = mongoose.model("Election", ElectionSchema);

module.exports = Election;