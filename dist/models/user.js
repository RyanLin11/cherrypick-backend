import { Schema, model } from 'mongoose';
const UserSchema = new Schema({
    sid: {
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
    }
});
const User = model("User", UserSchema);
export default User;
