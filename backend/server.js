import express from "express";
import { PORT } from "./config/index.js";
import connectDb from "./database/database.js";
import router from "./routes/index.js";
import errorHandeler from "./middleWare/errorHandler.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(cookieParser());
connectDb();
app.use(express.json({ limit: "50mb" }));
app.use(router);
app.use(errorHandeler);
app.listen(PORT, console.log(`server is running on port:${PORT}`));
