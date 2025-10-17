import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String },
    body: { type: String },
    isRead: { type: Boolean, default: false },
    data: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
