import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getNotifications, getUsersForSidebar, markMessagesAsRead, sendMessage } from "../controllers/message.controller.js";
import upload from "../lib/profile.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute,upload.single("attachment"), sendMessage);
router.put("/mark-read/:senderId", protectRoute, markMessagesAsRead);
router.get("/get-notifications/:id", protectRoute, getNotifications);


export default router;
