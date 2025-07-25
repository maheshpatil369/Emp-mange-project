import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeAdminApp } from "./config/firebase.config";
import userRoutes from "./api/routes/user.routes";
import dataRoutes from "./api/routes/data.routes";
import adminRoutes from "./api/routes/admin.routes";
import authRoutes from "./api/routes/auth.routes";

dotenv.config();

initializeAdminApp();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin:"*",
  })
);

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
