import express from "express";
import { blockUser, checkAuth, login, logout, removeProfile, signup, socialLogin, updateProfile, viewProfile} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import upload from "../lib/profile.js";

const router = express.Router();

router.post("/login",login)
router.post("/signup",signup)
router.post("/logout",logout)
router.get("/check",protectRoute,checkAuth)
router.put("/update-profile", protectRoute,upload.single("image"), updateProfile);
router.get("/view-profile", protectRoute, viewProfile)
router.delete("/remove-profile", protectRoute, removeProfile);
router.post("/social-login", socialLogin);
router.put("/block/:userId", protectRoute, blockUser);
export default router