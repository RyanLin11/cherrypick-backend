import mongoose from 'mongoose';
import Vote from './vote.js';
import User from './user.js';
const { ObjectId } = mongoose.Schema.Types;
const ElectionSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        required: true,
    },
    admin: {
        type: ObjectId,
        ref: User,
        required: true,
    },
    options: {
        type: [String],
        default: [],
        required: true,
    },
    votes: {
        type: [ObjectId],
        ref: Vote,
        required: true,
    },
});
const Election = mongoose.model("Election", ElectionSchema);
export default Election;
