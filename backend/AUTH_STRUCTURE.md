# Struttura Autenticazione

## Organizzazione del Codice

L'autenticazione è stata organizzata in una struttura modulare per migliorare la manutenibilità e la scalabilità:

```
backend/src/
├── middleware/
│   └── auth.ts          # Middleware di autenticazione
├── services/
│   ├── authService.ts   # Servizi per JWT e autenticazione
│   └── userService.ts   # Servizi per utenti
├── routes/
│   └── userRoutes.ts    # Route degli utenti
└── server.ts            # Configurazione del server
```

## File Creati/Modificati

### 1. `middleware/auth.ts`
Contiene tutti i middleware di autenticazione:
- `verifyToken`: Verifica JWT token per route protette
- `requireRole(role)`: Verifica che l'utente abbia un ruolo specifico
- `requireActiveUser`: Verifica che l'utente sia attivo
- `optionalAuth`: Autenticazione opzionale (non fallisce se non c'è token)

### 2. `services/authService.ts`
Contiene la logica per JWT e autenticazione:
- `generateToken(user)`: Genera JWT token
- `verifyToken(token)`: Verifica JWT token
- `createAuthResponse(user)`: Crea risposta con token e dati utente
- `extractTokenFromHeader(authHeader)`: Estrae token da header Authorization
- `isTokenExpired(token)`: Controlla se il token è scaduto
- `refreshToken(token)`: Rinnova token esistente

### 3. `routes/userRoutes.ts` (modificato)
Aggiornato per usare i nuovi servizi:
- Rimosso codice JWT duplicato
- Aggiunta route `/refresh` per rinnovare token
- Aggiunta route `/me` per ottenere profilo utente corrente
- Migliorata gestione errori

### 4. `server.ts` (modificato)
Pulito dalla logica di autenticazione:
- Rimosso middleware `verifyToken` (ora importato)
- Mantenuta solo la configurazione del server

## Vantaggi della Nuova Struttura

1. **Separazione delle responsabilità**: Ogni file ha un compito specifico
2. **Riusabilità**: Middleware e servizi possono essere usati ovunque
3. **Testabilità**: Più facile testare singole funzionalità
4. **Manutenibilità**: Modifiche all'autenticazione in un solo posto
5. **Scalabilità**: Facile aggiungere nuovi tipi di autenticazione
6. **DRY**: Eliminata duplicazione di codice

## Utilizzo

### Middleware di Autenticazione
```typescript
import { verifyToken, requireRole, requireActiveUser } from '../middleware/auth';

// Route protetta
router.get('/protected', verifyToken, handler);

// Route per admin
router.get('/admin', verifyToken, requireRole('admin'), handler);

// Route per utenti attivi
router.get('/active', verifyToken, requireActiveUser, handler);
```

### Servizi di Autenticazione
```typescript
import { AuthService } from '../services/authService';

// Generare token
const token = AuthService.generateToken(user);

// Creare risposta di autenticazione
const authResponse = AuthService.createAuthResponse(user);

// Verificare token
const payload = AuthService.verifyToken(token);
```

## Route Disponibili

- `POST /api/users/register` - Registrazione utente
- `POST /api/users/login` - Login utente
- `POST /api/users/refresh` - Rinnovo token
- `GET /api/users/me` - Profilo utente corrente (protetta)
- `GET /api/users` - Lista utenti (protetta)
- `GET /api/users/:id` - Utente per ID (protetta)
- `PUT /api/users/:id` - Aggiorna utente (protetta)
- `DELETE /api/users/:id` - Elimina utente (protetta)
