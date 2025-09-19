# Chiamate API per Testare le Rotte Protette

Questo documento contiene esempi di chiamate API per testare tutte le rotte del sistema di gestione ordini e inventario.

## Configurazione Base

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **Authorization**: `Bearer <token>` (per rotte protette)

## 1. Rotte Pubbliche (Non richiedono autenticazione)

### 1.1 Registrazione Utente
```bash
POST http://localhost:3000/api/users/register
Content-Type: application/json

{
  "name": "Mario Rossi",
  "email": "mario.rossi@example.com",
  "password": "password123",
  "role": "user"
}
```

### 1.2 Login Utente
```bash
POST http://localhost:3000/api/users/login
Content-Type: application/json

{
  "email": "mario.rossi@example.com",
  "password": "password123"
}
```

### 1.3 Refresh Token
```bash
POST http://localhost:3000/api/users/refresh
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 2. Rotte Protette (Richiedono token JWT)

> **Nota**: Prima di testare le rotte protette, esegui il login per ottenere un token valido.

### 2.1 Test Rota Protetta di Esempio
```bash
GET http://localhost:3000/protected
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 Recupero Profilo Utente Corrente
```bash
GET http://localhost:3000/api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 Recupero Tutti gli Utenti
```bash
GET http://localhost:3000/api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.4 Recupero Utente Specifico per ID
```bash
GET http://localhost:3000/api/users/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.5 Aggiornamento Utente
```bash
PUT http://localhost:3000/api/users/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Mario Rossi Aggiornato",
  "email": "mario.rossi.aggiornato@example.com"
}
```

### 2.6 Eliminazione Utente
```bash
DELETE http://localhost:3000/api/users/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Test di Scenari di Errore

### 3.1 Accesso Senza Token
```bash
GET http://localhost:3000/api/users/me
# Nessun header Authorization
```

### 3.2 Accesso con Token Non Valido
```bash
GET http://localhost:3000/api/users/me
Authorization: Bearer token_non_valido
```

### 3.3 Accesso con Token Scaduto
```bash
GET http://localhost:3000/api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGY4YTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJlbWFpbCI6Im1hcmlvLnJvc3NpQGV4YW1wbGUuY29tIiwiaWF0IjoxNjk0MjQwMDAwLCJleHAiOjE2OTQyNDM2MDB9.token_scaduto
```

### 3.4 Accesso a Risorsa Inesistente
```bash
GET http://localhost:3000/api/users/utente_inesistente
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Test con cURL

### 4.1 Registrazione e Login Completo
```bash
# 1. Registrazione
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "user"
  }'

# 2. Login (salva il token dalla risposta)
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 3. Test rotta protetta (sostituisci TOKEN con il token ricevuto)
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer TOKEN"
```

### 4.2 Test Tutte le Rotte Protette
```bash
# Sostituisci TOKEN con il token valido ottenuto dal login

# Profilo utente
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer TOKEN"

# Tutti gli utenti
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer TOKEN"

# Rota protetta di esempio
curl -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer TOKEN"
```

## 5. Test con Postman/Insomnia

### 5.1 Configurazione Collection
1. Crea una nuova collection chiamata "Gestione Ordini API"
2. Imposta la variabile di ambiente `baseUrl` = `http://localhost:3000`
3. Imposta la variabile di ambiente `token` (sarà popolata dopo il login)

### 5.2 Test Script per Login Automatico
Aggiungi questo script nella richiesta di login per salvare automaticamente il token:

```javascript
// Test script per la richiesta di login
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.token);
    console.log("Token salvato:", response.token);
}
```

### 5.3 Pre-request Script per Token Automatico
Aggiungi questo script nelle richieste protette per usare automaticamente il token:

```javascript
// Pre-request script per le rotte protette
const token = pm.environment.get("token");
if (token) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + token
    });
}
```

## 6. Test di Sicurezza

### 6.1 Rate Limiting
```bash
# Esegui molte richieste rapidamente per testare il rate limiting
for i in {1..20}; do
  curl -X GET http://localhost:3000/api/users/me \
    -H "Authorization: Bearer TOKEN"
  echo "Richiesta $i"
done
```

### 6.2 CORS
```bash
# Test da un dominio diverso (simula con header Origin)
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer TOKEN" \
  -H "Origin: http://example.com"
```

## 7. Checklist di Test

- [ ] Registrazione utente funziona
- [ ] Login restituisce token valido
- [ ] Rotte protette richiedono token
- [ ] Token valido permette accesso alle rotte protette
- [ ] Token non valido viene rifiutato
- [ ] Token scaduto viene rifiutato
- [ ] Refresh token funziona
- [ ] Rate limiting funziona
- [ ] CORS è configurato correttamente
- [ ] Headers di sicurezza sono presenti
- [ ] Errori 404 per risorse inesistenti
- [ ] Errori 500 per errori del server

## 8. Note Importanti

1. **Avvia il server** prima di eseguire i test: `npm run dev`
2. **Sostituisci i token** con quelli reali ottenuti dal login
3. **Sostituisci gli ID** con quelli reali del database
4. **Verifica le variabili d'ambiente** nel file `.env`
5. **Controlla i log del server** per debug
6. **Usa un database di test** per evitare di modificare dati di produzione
