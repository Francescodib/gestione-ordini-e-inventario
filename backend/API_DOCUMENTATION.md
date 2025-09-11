# API RESTful per Gestione Utenti

## Endpoints Disponibili

### Autenticazione

#### POST /api/users/register
Registra un nuovo utente.

**Body:**
```json
{
  "username": "mario_rossi",
  "email": "mario.rossi@email.com",
  "password": "password123",
  "firstName": "Mario",
  "lastName": "Rossi",
  "role": "user"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "1",
    "username": "mario_rossi",
    "email": "mario.rossi@email.com",
    "firstName": "Mario",
    "lastName": "Rossi",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/users/login
Effettua il login di un utente.

**Body:**
```json
{
  "email": "mario.rossi@email.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "1",
    "username": "mario_rossi",
    "email": "mario.rossi@email.com",
    "firstName": "Mario",
    "lastName": "Rossi",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Gestione Utenti (Richiede Autenticazione)

#### GET /api/users
Ottiene tutti gli utenti.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": "1",
    "username": "mario_rossi",
    "email": "mario.rossi@email.com",
    "firstName": "Mario",
    "lastName": "Rossi",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/users/:id
Ottiene un utente specifico per ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "id": "1",
  "username": "mario_rossi",
  "email": "mario.rossi@email.com",
  "firstName": "Mario",
  "lastName": "Rossi",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### PUT /api/users/:id
Aggiorna un utente esistente.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Body:**
```json
{
  "firstName": "Mario",
  "lastName": "Rossi",
  "role": "admin",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "1",
  "username": "mario_rossi",
  "email": "mario.rossi@email.com",
  "firstName": "Mario",
  "lastName": "Rossi",
  "role": "admin",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### DELETE /api/users/:id
Elimina un utente.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## Codici di Stato HTTP

- `200` - Successo
- `201` - Creato con successo
- `400` - Richiesta non valida
- `401` - Non autorizzato
- `404` - Utente non trovato
- `500` - Errore del server

## Note

- Tutti gli endpoint tranne `/register` e `/login` richiedono autenticazione JWT
- Le password vengono hashate con bcryptjs
- I dati sono memorizzati in memoria (sostituire con database in produzione)
- Il token JWT scade dopo 24 ore
