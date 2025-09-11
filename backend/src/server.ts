import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import userRoutes from "./routes/userRoutes";

// Create Express app
const app = express();

// Define port
const PORT = process.env.PORT || 3000;

// Load environment variables
dotenv.config();
console.log(process.env.PORT);

// Middleware to parse JSON
app.use(express.json());

// Middleware to verify JWT (skip for auth routes)
function verifyToken(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for login and register routes
  if (req.path === '/api/users/login' || req.path === '/api/users/register') {
    return next();
  }
  
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = decoded as jwt.JwtPayload;
    next();
  });
}

// Apply authentication middleware
app.use(verifyToken);

// Simple route
app.get("/", (req, res) => {
  res.send("Server Express attivo su rotta principale");
});

// Protected route
app.get("/protected", (req, res) => {
  res.send("Server Express attivo su rotta protetta");
});

// User routes
app.use("/api/users", userRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});