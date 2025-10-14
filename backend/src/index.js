import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js"
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import {app,server} from "./lib/socket.js"

dotenv.config();
const PORT = process.env.PORT || 5001;
// const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/api/auth",authRoutes)
app.use("/api/messages",messageRoutes);
app.use("/uploads", express.static("uploads"));
server.listen(PORT,()=>{
    console.log("Server is running on Port : " + PORT);
    connectDB();
});