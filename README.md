# QuickStock Solutions

## English Documentation

### Project Overview

QuickStock Solutions is a comprehensive full-stack inventory and order management system designed for e-commerce businesses. The application provides complete CRUD functionality for products, orders, users, and categories, with advanced features including real-time notifications, automated backups, monitoring, and role-based access control.

### Architecture

**Frontend (React + TypeScript + Vite)**
- **React 19.1.1**: Latest React with modern hooks and improved performance
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS 4.1.13**: Modern utility-first CSS framework with Vite integration
- **React Router DOM 7.9.0**: Client-side routing with protected routes
- **Socket.io Client 4.8.1**: Real-time WebSocket communication
- **Recharts 3.2.0**: Advanced charts and analytics visualization
- **Axios 1.12.1**: HTTP client with interceptors and error handling
- **Lucide React 0.544.0**: Modern icon library

**Backend (Node.js + Express + TypeScript)**
- **Node.js**: JavaScript runtime with Express framework
- **TypeScript**: Type-safe server-side development
- **Express 4.21.2**: Web application framework with comprehensive middleware
- **Sequelize 6.37.7**: Object-Relational Mapping (ORM) with SQLite
- **SQLite 5.1.7**: Lightweight, file-based database
- **Socket.io 4.8.1**: Real-time bidirectional communication
- **JWT (jsonwebtoken 9.0.2)**: Secure authentication tokens
- **Winston 3.17.0**: Advanced logging with daily rotation
- **Prometheus Client**: Metrics collection and monitoring
- **Sharp 0.34.3**: High-performance image processing
- **Joi 18.0.1**: Data validation schemas

**Security & Middleware**
- **Helmet 8.1.0**: Security headers and protection
- **CORS 2.8.5**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling protection
- **bcryptjs 3.0.2**: Password hashing and salting
- **Compression 1.8.1**: Response compression

### Tech Stack

**Frontend Technologies**
- React 19 with TypeScript for component development
- Tailwind CSS for responsive design and styling
- Vite for fast development and optimized builds
- Context API for state management
- Axios with interceptors for API communication
- Socket.io for real-time features
- Recharts for data visualization
- React Router for navigation and protected routes

**Backend Technologies**
- Express.js framework with TypeScript
- Sequelize ORM with SQLite database
- JWT-based authentication and authorization
- Winston logging with file rotation
- Prometheus metrics collection
- Socket.io for WebSocket communication
- Sharp for image processing and optimization
- Node-cron for scheduled tasks
- Joi for request validation

**Database & ORM**
- SQLite database for lightweight deployment
- Sequelize ORM with TypeScript models
- Comprehensive relationships and associations
- Database migrations and seeding support
- Automated backup and restore functionality

**Development & Build Tools**
- Vite for frontend development and building
- TypeScript for type safety across the stack
- ESLint for code quality and standards
- ts-node-dev for backend hot reloading
- tsx for TypeScript execution

### Features Implemented

**Core Business Functionality**
- **Product Management**: Complete CRUD with variants, images, stock tracking, and categories
- **Order Processing**: Full order lifecycle from creation to delivery with status tracking
- **Inventory Control**: Real-time stock management with low stock alerts and automated reordering
- **User Management**: Role-based access (CLIENT/MANAGER/ADMIN) with profile management
- **Category Hierarchy**: Nested product categories with parent-child relationships

**Advanced Features**
- **Real-time Notifications**: WebSocket-based notifications for order status changes and stock alerts
- **File Upload System**: Multi-size image processing for products and user avatars
- **Search & Filtering**: Advanced search across products, orders, and users with multiple filters
- **Analytics Dashboard**: Comprehensive statistics and data visualization with charts
- **Backup System**: Automated database and file backups with restoration capabilities
- **System Monitoring**: Health checks, metrics collection, and performance monitoring
- **Audit Logging**: Complete activity tracking with user action logs

**Security Features**
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Role-based Authorization**: Granular permissions for different user types
- **Input Validation**: Server-side validation with Joi schemas
- **Rate Limiting**: Protection against brute force and spam attacks
- **Security Headers**: Helmet.js for security best practices
- **Password Security**: bcrypt hashing with salt rounds

**API Endpoints & Services**

**Authentication & Users**
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `POST /api/users/refresh` - Token refresh
- `GET /api/users/me` - Current user profile
- `GET /api/users` - List all users (Admin/Manager)
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Deactivate user (Admin)
- `GET /api/users/stats` - User statistics (Admin)

**Products Management**
- `GET /api/products` - List products with filtering and pagination
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create new product (Admin/Manager)
- `PUT /api/products/:id` - Update product (Admin/Manager)
- `DELETE /api/products/:id` - Delete product (Admin)
- `POST /api/products/:id/stock` - Update product stock
- `GET /api/products/low-stock` - Get low stock products
- `GET /api/products/stats` - Product statistics

**Order Processing**
- `GET /api/orders` - List orders with filtering
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order (Admin/Manager)
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/stats` - Order statistics
- `GET /api/orders/my` - Current user's orders

**Categories Management**
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category details
- `POST /api/categories` - Create category (Admin/Manager)
- `PUT /api/categories/:id` - Update category (Admin/Manager)
- `DELETE /api/categories/:id` - Delete category (Admin)
- `GET /api/categories/tree` - Get category hierarchy

**Search Functionality**
- `GET /api/search/products` - Search products
- `GET /api/search/orders` - Search orders
- `GET /api/search/categories` - Search categories
- `GET /api/search` - Global search across all entities

**File Management**
- `POST /api/files/products/:id/images` - Upload product images
- `GET /api/files/products/:id/images` - Get product images
- `DELETE /api/files/products/images/:id` - Delete product image
- `POST /api/files/users/:id/avatar` - Upload user avatar
- `GET /api/files/users/:id/avatar` - Get user avatar
- `POST /api/files/documents` - Upload documents

**Monitoring & System**
- `GET /api/monitoring/health` - System health check
- `GET /api/monitoring/system` - System metrics
- `GET /api/monitoring/dashboard` - Dashboard statistics
- `GET /api/monitoring/metrics` - Prometheus metrics

**Backup Management**
- `GET /api/backup/status` - Backup system status
- `POST /api/backup/database` - Create database backup
- `POST /api/backup/files` - Create files backup
- `GET /api/backup/list` - List available backups
- `POST /api/backup/restore/database` - Restore database
- `POST /api/backup/restore/files` - Restore files

### Installation & Setup

**Prerequisites**
- Node.js 18+ and npm
- Git for version control
- Modern web browser (Chrome, Firefox, Safari)

**Environment Configuration**
1. Clone the repository
2. Create `.env` file in backend directory:
```env
DATABASE_URL=sqlite:./database.db
JWT_SECRET=your-super-secure-jwt-secret-key
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Backend Setup**
```bash
cd backend
npm install
npm run dev    # Starts development server with hot reload
```

**Frontend Setup**
```bash
cd frontend
npm install
npm run dev    # Starts Vite dev server at http://localhost:5173
```

**Database Initialization**
The database will be automatically created and synced when starting the backend server. Demo data will be seeded if no users exist.

**Demo Credentials**
- **Email**: `demo@demo.com`
- **Password**: `Demo123!`
- **Role**: ADMIN (full access)

**Production Build**
```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm run preview
```

### Future Roadmap

**Technical Improvements**
- **Database Migration**: Transition from SQLite to PostgreSQL for production scalability
- **Caching Layer**: Implement Redis for session management and data caching
- **API Documentation**: Generate OpenAPI/Swagger documentation
- **Container Deployment**: Docker containers and Kubernetes orchestration
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Performance Optimization**: Database indexing, query optimization, and caching strategies

**Feature Enhancements**
- **Payment Integration**: Stripe, PayPal, or other payment gateway integration
- **Email System**: Automated email notifications and marketing campaigns
- **Advanced Analytics**: Machine learning for demand forecasting and inventory optimization
- **Multi-language Support**: Internationalization (i18n) for global markets
- **Mobile App**: React Native companion app for mobile access
- **Advanced Reporting**: PDF generation and custom report builder

**Scalability Considerations**
- **Microservices Architecture**: Break down monolith into specialized services
- **Message Queue**: Implement Redis or RabbitMQ for asynchronous processing
- **Load Balancing**: Multiple server instances with proper load distribution
- **CDN Integration**: Static asset delivery optimization
- **Database Sharding**: Horizontal scaling for large datasets
- **API Rate Limiting**: Advanced throttling and quota management

**Security Enhancements**
- **OAuth Integration**: Google, GitHub, or other OAuth providers
- **Two-Factor Authentication**: Enhanced security with 2FA
- **API Security**: Advanced rate limiting, request signing, and validation
- **Data Encryption**: End-to-end encryption for sensitive data
- **Audit Trail**: Complete audit logging and compliance features
- **Penetration Testing**: Regular security assessments and vulnerability scanning

---

## Documentazione Italiana

### Panoramica del Progetto

QuickStock Solutions è un sistema completo full-stack per la gestione di inventario e ordini, progettato per aziende e-commerce. L'applicazione fornisce funzionalità CRUD complete per prodotti, ordini, utenti e categorie, con caratteristiche avanzate incluse notifiche in tempo reale, backup automatici, monitoraggio e controllo degli accessi basato sui ruoli.

### Architettura

**Frontend (React + TypeScript + Vite)**
- **React 19.1.1**: Ultima versione di React con hook moderni e prestazioni migliorate
- **TypeScript**: Sicurezza dei tipi completa in tutta l'applicazione
- **Tailwind CSS 4.1.13**: Framework CSS utility-first moderno con integrazione Vite
- **React Router DOM 7.9.0**: Routing lato client con rotte protette
- **Socket.io Client 4.8.1**: Comunicazione WebSocket in tempo reale
- **Recharts 3.2.0**: Visualizzazione avanzata di grafici e analitiche
- **Axios 1.12.1**: Client HTTP con intercettatori e gestione errori
- **Lucide React 0.544.0**: Libreria di icone moderna

**Backend (Node.js + Express + TypeScript)**
- **Node.js**: Runtime JavaScript con framework Express
- **TypeScript**: Sviluppo server-side type-safe
- **Express 4.21.2**: Framework per applicazioni web con middleware completo
- **Sequelize 6.37.7**: Object-Relational Mapping (ORM) con SQLite
- **SQLite 5.1.7**: Database leggero basato su file
- **Socket.io 4.8.1**: Comunicazione bidirezionale in tempo reale
- **JWT (jsonwebtoken 9.0.2)**: Token di autenticazione sicuri
- **Winston 3.17.0**: Logging avanzato con rotazione giornaliera
- **Prometheus Client**: Raccolta metriche e monitoraggio
- **Sharp 0.34.3**: Elaborazione immagini ad alte prestazioni
- **Joi 18.0.1**: Schemi di validazione dati

**Sicurezza & Middleware**
- **Helmet 8.1.0**: Header di sicurezza e protezione
- **CORS 2.8.5**: Condivisione risorse cross-origin
- **Rate Limiting**: Protezione throttling richieste
- **bcryptjs 3.0.2**: Hashing e salting password
- **Compression 1.8.1**: Compressione risposta

### Stack Tecnologico

**Tecnologie Frontend**
- React 19 con TypeScript per sviluppo componenti
- Tailwind CSS per design responsive e styling
- Vite per sviluppo veloce e build ottimizzati
- Context API per gestione stato
- Axios con intercettatori per comunicazione API
- Socket.io per funzionalità tempo reale
- Recharts per visualizzazione dati
- React Router per navigazione e rotte protette

**Tecnologie Backend**
- Framework Express.js con TypeScript
- ORM Sequelize con database SQLite
- Autenticazione e autorizzazione basata su JWT
- Logging Winston con rotazione file
- Raccolta metriche Prometheus
- Socket.io per comunicazione WebSocket
- Sharp per elaborazione e ottimizzazione immagini
- Node-cron per task schedulati
- Joi per validazione richieste

**Database & ORM**
- Database SQLite per deployment leggero
- ORM Sequelize con modelli TypeScript
- Relazioni e associazioni complete
- Supporto migrazioni e seeding database
- Funzionalità backup e restore automatizzate

**Strumenti Sviluppo & Build**
- Vite per sviluppo e build frontend
- TypeScript per type safety nell'intero stack
- ESLint per qualità e standard del codice
- ts-node-dev per hot reloading backend
- tsx per esecuzione TypeScript

### Funzionalità Implementate

**Funzionalità Business Core**
- **Gestione Prodotti**: CRUD completo con varianti, immagini, tracking scorte e categorie
- **Elaborazione Ordini**: Ciclo di vita ordine completo dalla creazione alla consegna con tracking stato
- **Controllo Inventario**: Gestione scorte in tempo reale con avvisi scorte basse e riordino automatizzato
- **Gestione Utenti**: Accesso basato su ruoli (CLIENT/MANAGER/ADMIN) con gestione profilo
- **Gerarchia Categorie**: Categorie prodotti nidificate con relazioni parent-child

**Funzionalità Avanzate**
- **Notifiche Tempo Reale**: Notifiche basate su WebSocket per cambi stato ordine e avvisi scorte
- **Sistema Upload File**: Elaborazione immagini multi-dimensionali per prodotti e avatar utenti
- **Ricerca & Filtraggio**: Ricerca avanzata tra prodotti, ordini e utenti con filtri multipli
- **Dashboard Analytics**: Statistiche complete e visualizzazione dati con grafici
- **Sistema Backup**: Backup automatici database e file con capacità di ripristino
- **Monitoraggio Sistema**: Controlli salute, raccolta metriche e monitoraggio prestazioni
- **Audit Logging**: Tracking attività completo con log azioni utenti

**Funzionalità Sicurezza**
- **Autenticazione JWT**: Autenticazione sicura basata su token con refresh token
- **Autorizzazione Basata su Ruoli**: Permessi granulari per diversi tipi utenti
- **Validazione Input**: Validazione server-side con schemi Joi
- **Rate Limiting**: Protezione contro attacchi brute force e spam
- **Header Sicurezza**: Helmet.js per best practice sicurezza
- **Sicurezza Password**: Hashing bcrypt con salt round

### Installazione & Setup

**Prerequisiti**
- Node.js 18+ e npm
- Git per controllo versione
- Browser web moderno (Chrome, Firefox, Safari)

**Configurazione Ambiente**
1. Clonare il repository
2. Creare file `.env` nella directory backend:
```env
DATABASE_URL=sqlite:./database.db
JWT_SECRET=your-super-secure-jwt-secret-key
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Setup Backend**
```bash
cd backend
npm install
npm run dev    # Avvia server sviluppo con hot reload
```

**Setup Frontend**
```bash
cd frontend
npm install
npm run dev    # Avvia server Vite dev su http://localhost:5173
```

**Inizializzazione Database**
Il database sarà automaticamente creato e sincronizzato all'avvio del server backend. I dati demo saranno inseriti se non esistono utenti.

**Credenziali Demo**
- **Email**: `demo@demo.com`
- **Password**: `Demo123!`
- **Ruolo**: ADMIN (accesso completo)

**Build Produzione**
```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm run preview
```

### Roadmap Futura

**Miglioramenti Tecnici**
- **Migrazione Database**: Transizione da SQLite a PostgreSQL per scalabilità produzione
- **Layer Caching**: Implementare Redis per gestione sessioni e caching dati
- **Documentazione API**: Generare documentazione OpenAPI/Swagger
- **Deployment Container**: Container Docker e orchestrazione Kubernetes
- **Pipeline CI/CD**: Testing, building e deployment automatizzati
- **Ottimizzazione Prestazioni**: Indicizzazione database, ottimizzazione query e strategie caching

**Miglioramenti Funzionalità**
- **Integrazione Pagamenti**: Integrazione gateway Stripe, PayPal o altri
- **Sistema Email**: Notifiche email automatizzate e campagne marketing
- **Analytics Avanzate**: Machine learning per previsioni domanda e ottimizzazione inventario
- **Supporto Multi-lingua**: Internazionalizzazione (i18n) per mercati globali
- **App Mobile**: App companion React Native per accesso mobile
- **Reportistica Avanzata**: Generazione PDF e builder report personalizzati

**Considerazioni Scalabilità**
- **Architettura Microservizi**: Suddividere monolito in servizi specializzati
- **Coda Messaggi**: Implementare Redis o RabbitMQ per elaborazione asincrona
- **Load Balancing**: Istanze server multiple con distribuzione carico appropriata
- **Integrazione CDN**: Ottimizzazione delivery asset statici
- **Sharding Database**: Scaling orizzontale per dataset grandi
- **Rate Limiting API**: Throttling avanzato e gestione quote

**Miglioramenti Sicurezza**
- **Integrazione OAuth**: Provider OAuth Google, GitHub o altri
- **Autenticazione Due Fattori**: Sicurezza migliorata con 2FA
- **Sicurezza API**: Rate limiting avanzato, firma richieste e validazione
- **Crittografia Dati**: Crittografia end-to-end per dati sensibili
- **Audit Trail**: Logging audit completo e funzionalità compliance
- **Penetration Testing**: Valutazioni sicurezza regolari e scansione vulnerabilità