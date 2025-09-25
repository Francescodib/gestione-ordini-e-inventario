# Documentazione API - QuickStock Solutions

## Autenticazione & Utenti
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST   | `/api/users/register` | Registrazione utente |
| POST   | `/api/users/login` | Autenticazione utente |
| POST   | `/api/users/refresh` | Refresh token |
| GET    | `/api/users/me` | Profilo utente corrente |
| GET    | `/api/users` | Elenco utenti (Admin/Manager) |
| PUT    | `/api/users/:id` | Aggiorna profilo utente |
| DELETE | `/api/users/:id` | Disattiva utente (Admin) |
| GET    | `/api/users/stats` | Statistiche utenti (Admin) |

---

## Gestione Prodotti
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/products` | Lista prodotti con filtri e paginazione |
| GET    | `/api/products/:id` | Dettagli prodotto |
| POST   | `/api/products` | Crea nuovo prodotto (Admin/Manager) |
| PUT    | `/api/products/:id` | Aggiorna prodotto (Admin/Manager) |
| DELETE | `/api/products/:id` | Elimina prodotto (Admin) |
| POST   | `/api/products/:id/stock` | Aggiorna scorte prodotto |
| GET    | `/api/products/low-stock` | Prodotti con scorte basse |
| GET    | `/api/products/stats` | Statistiche prodotti |

---

## Gestione Ordini
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/orders` | Lista ordini con filtri |
| GET    | `/api/orders/:id` | Dettagli ordine |
| POST   | `/api/orders` | Crea nuovo ordine |
| PUT    | `/api/orders/:id` | Aggiorna ordine (Admin/Manager) |
| PUT    | `/api/orders/:id/status` | Aggiorna stato ordine |
| POST   | `/api/orders/:id/cancel` | Annulla ordine |
| GET    | `/api/orders/stats` | Statistiche ordini |
| GET    | `/api/orders/my` | Ordini dell’utente corrente |

---

## Gestione Categorie
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/categories` | Lista categorie |
| GET    | `/api/categories/:id` | Dettagli categoria |
| POST   | `/api/categories` | Crea categoria (Admin/Manager) |
| PUT    | `/api/categories/:id` | Aggiorna categoria (Admin/Manager) |
| DELETE | `/api/categories/:id` | Elimina categoria (Admin) |
| GET    | `/api/categories/tree` | Gerarchia categorie |

---

## Ricerca
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/search/products` | Ricerca prodotti |
| GET    | `/api/search/orders` | Ricerca ordini |
| GET    | `/api/search/categories` | Ricerca categorie |
| GET    | `/api/search` | Ricerca globale su tutte le entità |

---

## Gestione File
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST   | `/api/files/products/:id/images` | Upload immagini prodotto |
| GET    | `/api/files/products/:id/images` | Ottieni immagini prodotto |
| DELETE | `/api/files/products/images/:id` | Elimina immagine prodotto |
| POST   | `/api/files/users/:id/avatar` | Upload avatar utente |
| GET    | `/api/files/users/:id/avatar` | Ottieni avatar utente |
| POST   | `/api/files/documents` | Upload documenti |

---

## Monitoraggio & Sistema
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/monitoring/health` | Controllo stato sistema |
| GET    | `/api/monitoring/system` | Metriche sistema |
| GET    | `/api/monitoring/dashboard` | Statistiche dashboard |
| GET    | `/api/monitoring/metrics` | Metriche Prometheus |

---

## Gestione Backup
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET    | `/api/backup/status` | Stato sistema di backup |
| POST   | `/api/backup/database` | Crea backup database |
| POST   | `/api/backup/files` | Crea backup file |
| GET    | `/api/backup/list` | Elenco backup disponibili |
| POST   | `/api/backup/restore/database` | Ripristina database |
| POST   | `/api/backup/restore/files` | Ripristina file |
