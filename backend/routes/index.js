import express from "express";
import authController from "../controller/authController.js";
import auth from "../middleWare/auth.js";
import blogController from "../controller/blogController.js";

const router = express.Router();

//authController endPoints
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/logout", auth, authController.logout);
router.get("/refresh", authController.refresh);

//blogController endPoints
router.post("/blog", auth, blogController.createBlog);
router.get("/blog/all", blogController.getAll);

export default router;
