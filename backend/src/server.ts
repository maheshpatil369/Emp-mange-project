import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeAdminApp } from "./config/firebase.config";
import userRoutes from "./api/routes/user.routes";
import dataRoutes from './api/routes/data.routes'; 
// import generateAdminToken from './generate-token';

dotenv.config();

initializeAdminApp();
// const token = generateAdminToken()

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(express.json());

app.use("/api/users", userRoutes);
app.use('/api/data', dataRoutes);

// A simple route to verify that the server is running correctly.
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Backend server is running successfully!",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
