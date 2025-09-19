# Frontend - Sistema di Gestione Ordini e Inventario

Questo è il frontend dell'applicazione di gestione ordini e inventario, costruito con React, TypeScript e Tailwind CSS.

## Funzionalità

- **Registrazione utenti**: Creazione di nuovi account con ruoli (user/admin)
- **Login**: Autenticazione degli utenti esistenti
- **Dashboard protetta**: Pagina riservata agli utenti autenticati con dettagli del profilo
- **Gestione stato**: Context API per la gestione dell'autenticazione
- **Routing protetto**: Protezione delle rotte che richiedono autenticazione

## Tecnologie Utilizzate

- React 19
- TypeScript
- React Router DOM
- Axios per le chiamate API
- Tailwind CSS per lo styling
- Vite come build tool

## Struttura del Progetto

```
src/
├── components/
│   └── ProtectedRoute.tsx    # Componente per proteggere le rotte
├── contexts/
│   └── AuthContext.tsx       # Context per la gestione dell'autenticazione
├── pages/
│   ├── LoginPage.tsx         # Pagina di login
│   ├── RegisterPage.tsx      # Pagina di registrazione
│   └── DashboardPage.tsx     # Dashboard protetta
├── services/
│   └── api.ts               # Servizio per le chiamate API
├── types/
│   └── auth.ts              # Tipi TypeScript per l'autenticazione
├── App.tsx                  # Componente principale con routing
└── main.tsx                 # Entry point dell'applicazione
```

## Installazione e Avvio

1. Installa le dipendenze:
```bash
npm install
```

2. Avvia il server di sviluppo:
```bash
npm run dev
```

3. L'applicazione sarà disponibile su `http://localhost:5173`

## Configurazione

L'applicazione si connette al backend su `http://localhost:3000`. Assicurati che il backend sia in esecuzione prima di utilizzare il frontend.

## Utilizzo

### Registrazione
1. Vai su `/register`
2. Compila il modulo con i tuoi dati
3. Scegli il ruolo (Utente o Amministratore)
4. Clicca su "Registrati"

### Login
1. Vai su `/login`
2. Inserisci email e password
3. Clicca su "Accedi"

### Dashboard
- Accessibile solo agli utenti autenticati
- Mostra i dettagli del profilo utente
- Include un pulsante per il logout
- Contiene sezioni per future funzionalità (Ordini, Inventario)

## API Endpoints Utilizzati

- `POST /api/users/register` - Registrazione utente
- `POST /api/users/login` - Login utente
- `GET /api/users/me` - Recupero dettagli utente corrente
- `POST /api/users/refresh` - Refresh del token

## Sicurezza

- I token JWT vengono salvati nel localStorage
- Le richieste API includono automaticamente il token di autorizzazione
- Le rotte protette reindirizzano al login se l'utente non è autenticato
- Gestione automatica della scadenza dei token

## Sviluppo

### Aggiungere nuove pagine protette

1. Crea il componente della pagina
2. Aggiungi la rotta in `App.tsx` wrappata con `ProtectedRoute`
3. Utilizza `useAuth()` per accedere ai dati dell'utente

### Aggiungere nuove chiamate API

1. Aggiungi la funzione in `services/api.ts`
2. Utilizza il servizio nei componenti
3. Gestisci gli errori appropriatamente

## Build per Produzione

```bash
npm run build
```

I file di build saranno generati nella cartella `dist/`.