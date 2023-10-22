import mongoose from 'mongoose';
import User from './user.js';
const { ObjectId } = mongoose.Schema.Types;
const VoteSchema = new mongoose.Schema({
    voter: {
        type: ObjectId,
        ref: User,
        required: true
    },
    option: {
        type: String,
        required: true
    }
});
const Vote = mongoose.model("Vote", VoteSchema);
export default Vote;
