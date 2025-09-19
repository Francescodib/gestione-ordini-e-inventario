# Setup Frontend

## Configurazione Iniziale

1. **Installa le dipendenze:**
   ```bash
   npm install
   ```

2. **Configura le variabili d'ambiente:**
   Crea un file `.env.local` nella root del frontend con:
   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_APP_NAME=Gestione Ordini e Inventario
   ```

3. **Avvia il server di sviluppo:**
   ```bash
   npm run dev
   ```

## Verifica del Setup

1. **Frontend**: Dovrebbe essere disponibile su `http://localhost:5173`
2. **Backend**: Assicurati che sia in esecuzione su `http://localhost:3000`

## Test delle Funzionalità

### 1. Registrazione
- Vai su `http://localhost:5173/register`
- Compila il modulo di registrazione
- Verifica che vieni reindirizzato alla dashboard

### 2. Login
- Vai su `http://localhost:5173/login`
- Inserisci le credenziali di un utente esistente
- Verifica che vieni reindirizzato alla dashboard

### 3. Dashboard Protetta
- Dovrebbe mostrare i dettagli dell'utente loggato
- Il pulsante logout dovrebbe funzionare correttamente

### 4. Protezione delle Rotte
- Prova ad accedere a `http://localhost:5173/dashboard` senza essere loggato
- Dovresti essere reindirizzato al login

## Risoluzione Problemi

### Errore di Connessione API
- Verifica che il backend sia in esecuzione
- Controlla che l'URL dell'API sia corretto nel file `.env.local`

### Errori di CORS
- Il backend dovrebbe essere configurato per accettare richieste da `http://localhost:5173`

### Token Non Valido
- I token vengono salvati nel localStorage
- Prova a fare logout e login di nuovo
- Controlla la console del browser per errori

## Struttura dei File

```
frontend/
├── src/
│   ├── components/          # Componenti riutilizzabili
│   │   ├── ErrorMessage.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # Context API
│   │   └── AuthContext.tsx
│   ├── pages/              # Pagine dell'applicazione
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── services/           # Servizi API
│   │   └── api.ts
│   ├── types/              # Tipi TypeScript
│   │   └── auth.ts
│   ├── App.tsx             # Componente principale
│   └── main.tsx            # Entry point
├── .env.local.example      # Esempio variabili d'ambiente
├── package.json
├── vite.config.ts
└── README.md
```
