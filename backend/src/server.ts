import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import usersRoutes from "./routes/userRoutes";
import { verifyToken } from "./middleware/auth";

// Create Express app
const app = express();

// Define port
const PORT = process.env.PORT || 3000;

// Load environment variables
dotenv.config();

// Middleware to log requests (remove in production)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Middleware to parse JSON
app.use(express.json());

// Note: verifyToken middleware is now imported from ./middleware/auth

// Public routes (no authentication required)
app.get("/", (req, res) => {
  res.send("Server Express attivo su rotta principale");
});

// User routes (some public, some protected)
app.use("/api/users", usersRoutes);

// Protected routes (require authentication) - apply middleware only to these specific routes
app.get("/protected", verifyToken, (req, res) => {
  res.send("Server Express attivo su rotta protetta");
});

// 404 route - must be after all other routes
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});