/**
 * Server principale dell'applicazione Express
 * Configura il server HTTP, i middleware e le rotte per la gestione ordini e inventario
 */

import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv"; // libreria per caricare le variabili d'ambiente
import usersRoutes from "./routes/userRoutes"; // Route degli utenti
import { verifyToken } from "./middleware/auth"; // Middleware per la verifica del token JWT
import cors from "cors"; // Middleware per gestire le richieste cross-origin
import { corsOptions, rateLimitMiddleware, helmetConfig } from "./config/security"; // Configurazione delle opzioni CORS
import helmet from "helmet"; // Libreria per la sicurezza HTTP
import morgan from "morgan"; // Libreria per il logging delle richieste HTTP
import compression from "compression"; // Libreria per la compressione delle risposte HTTP




// Inizializzazione dell'applicazione Express
const app = express();

// Caricamento delle variabili d'ambiente dal file .env
dotenv.config();

// Configurazione della porta del server (default: 3000)
const PORT = process.env.PORT || 3000;

// Implementazione di CORS
app.use(cors(corsOptions));
app.use(helmet(helmetConfig));
app.use(morgan("dev"));
app.use(compression());
app.use(rateLimitMiddleware); // Implementazione del rate limit con il middleware già pronto nel file di configurazione

/**
 * Middleware per il logging delle richieste HTTP
 * Registra ogni richiesta in arrivo con metodo e URL
 * NOTA: Rimuovere in produzione per motivi di sicurezza
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/**
 * Middleware per il parsing del body delle richieste JSON
 * Permette di leggere i dati JSON inviati nelle richieste POST/PUT
 */
app.use(express.json());

// ==========================================
// CONFIGURAZIONE ROTTE
// ==========================================

/**
 * ROTTA PUBBLICA - Homepage del server
 * Accessibile senza autenticazione
 * GET /
 */
app.get("/", (req, res) => {
  res.send("Server Express attivo su rotta principale");
});

/**
 * ROTTE UTENTI - Gestione completa degli utenti
 * Include rotte pubbliche (registrazione, login) e protette (profilo, CRUD)
 * Tutte le rotte sono prefissate con /api/users
 */
app.use("/api/users", usersRoutes);

/**
 * ROTTA PROTETTA - Esempio di endpoint che richiede autenticazione
 * Il middleware verifyToken è importato da ./middleware/auth
 * Accessibile solo con token JWT valido
 * GET /protected
 */
app.get("/protected", verifyToken, (req, res) => {
  res.send("Server Express attivo su rotta protetta");
});

/**
 * MIDDLEWARE 404 - Gestione delle rotte non trovate
 * DEVE essere posizionato dopo tutte le altre rotte
 * Restituisce una risposta JSON standardizzata per errori 404
 */
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

/**
 * AVVIO DEL SERVER
 * Il server inizia ad ascoltare sulla porta configurata
 */
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});