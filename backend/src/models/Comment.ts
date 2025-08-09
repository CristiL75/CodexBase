import { create } from "domain";
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
    prId:{type :mongoose.Schema.Types.ObjectId, ref: "PullRequest", required: true},
    author:{type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    content: {type:String, required:true},
    createdAt: {type: Date, default: Date.now},
});

export default mongoose.model("Comment", CommentSchema);