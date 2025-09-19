# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack inventory and order management system called "QuickStock Solutions" with a Node.js/Express backend and React frontend. The system provides comprehensive e-commerce functionality including user management, product catalog, inventory tracking, order processing, file uploads, search capabilities, monitoring, and automated backups.

## Architecture

**Backend (Node.js/Express/TypeScript/Sequelize/SQLite)**
- RESTful API with JWT authentication
- Sequelize ORM with SQLite database
- Comprehensive logging system with Winston
- Monitoring with Prometheus metrics
- Automated backup system for database and files
- File upload handling with image processing (Sharp)
- Real-time features ready (Socket.io configured)

**Frontend (React/TypeScript/Tailwind)**
- React 19 with TypeScript
- Context API for state management
- Tailwind CSS for styling
- Vite as build tool
- Protected routes with JWT authentication

## Common Development Commands

### Backend Commands (`cd backend`)
```bash
# Development
npm run dev                    # Start development server with hot reload
npm run build                  # Build TypeScript to dist/
npm start                      # Start production server from dist/

# Database
npm run db:seed                # Seed database with test data
npm run db:verify              # Verify database data integrity
npm run db:demo-user           # Create demo user manually

# Testing
npm test                       # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Run tests with coverage report
npm run test:verbose           # Run tests with verbose output
npm run test:auth              # Run authentication tests only
npm run test:products          # Run product tests only
npm run test:search            # Run search tests only
npm run test:ci                # Run tests for CI (no watch)

# Backup
npm run backup:database        # Manual database backup
npm run backup:files           # Manual files backup
npm run backup:restore         # Restore from backup
```

### Frontend Commands (`cd frontend`)
```bash
npm run dev                    # Start development server (http://localhost:5173)
npm run build                  # Build for production
npm run lint                   # Run ESLint
npm run preview                # Preview production build
```

## First Time Access

### Demo User Credentials
When you first start the application, a demo user will be automatically created if no users exist in the database:

- **Email**: `demo@demo.com`
- **Password**: `Demo123!`
- **Role**: ADMIN (full access)

Use these credentials to log in and explore the system functionality.

## Database Architecture

The system uses Sequelize with SQLite and includes these main entities:
- **User**: Authentication, roles (USER/ADMIN/MANAGER), profile management
- **Category**: Hierarchical product categories with parent/child relationships
- **Product**: Complete product management with variants, images, inventory tracking
- **Order**: Order processing with items, status tracking, payment status
- **ProductImage/UserAvatar**: File upload management with multiple sizes
- **UploadedFile**: Generic file storage system

Key relationships:
- Users have many Orders
- Products belong to Categories (hierarchical)
- Orders contain OrderItems (products with quantities/prices at time of order)
- Products have many ProductImages
- Users have one UserAvatar

## Key Features & Services

### Authentication System
- JWT-based authentication with refresh tokens
- Role-based access control (USER/ADMIN/MANAGER)
- Middleware in `middleware/auth.ts`: `verifyToken`, `requireRole`, `requireActiveUser`
- Authentication services in `services/authService.ts`

### File Upload System
- Multi-format image processing with Sharp (thumbnail, medium, large sizes)
- Organized upload directories: `/uploads/products/`, `/uploads/avatars/`, `/uploads/documents/`
- File validation and security checks
- API endpoints in `/api/files/*`

### Search System
- Full-text search across products, categories, and orders
- Advanced filtering and sorting capabilities
- Search service in `services/searchService.ts`
- API endpoints in `/api/search/*`

### Monitoring & Logging
- Comprehensive logging system with Winston (files in `/logs/`)
- Prometheus metrics collection
- System monitoring with alerts
- Performance tracking and health checks
- API endpoints in `/api/monitoring/*`

### Backup System
- Automated scheduled backups (database and files)
- Manual backup triggers available
- Backup restoration capabilities
- Backup files stored in `/backups/`
- API endpoints in `/api/backup/*`

## Important Configuration

### Environment Variables
- Create `.env` file in backend directory
- Required variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`
- Optional: monitoring, backup, and logging configurations

### Database Setup
The database uses Sequelize and will automatically sync models on startup:
```bash
npm run dev  # Automatically syncs models and creates demo user
```

To manually create a demo user:
```bash
npm run db:demo-user
```

### Development Workflow
1. Backend changes: Modify code → Run `npm run dev` → Test with API calls
2. Database changes: Update schema → Run migrations → Regenerate client
3. Frontend changes: Modify components → Vite hot reload handles updates
4. Full testing: Run backend tests, then integration tests with frontend

## API Structure

The API follows RESTful conventions with these main routes:
- `/api/users/*` - User management and authentication
- `/api/products/*` - Product catalog management
- `/api/categories/*` - Category hierarchy management
- `/api/orders/*` - Order processing and tracking
- `/api/search/*` - Search functionality
- `/api/files/*` - File upload and management
- `/api/backup/*` - Backup system management
- `/api/monitoring/*` - System monitoring and metrics

All routes except registration/login require JWT authentication via `Authorization: Bearer <token>` header.

## Type System

The project uses a comprehensive TypeScript type system:
- Domain types organized by feature (`types/auth.ts`, `types/product.ts`, etc.)
- Prisma-generated types available from `@prisma/client`
- Central type exports in `types/index.ts`
- Validation schemas using Joi in `validation/schemas.ts`

## Testing Strategy

- Unit tests for services and utilities
- Integration tests for API endpoints
- Test database isolation and cleanup
- Coverage reports generated in `/coverage/`
- Separate test commands for different modules
- Jest configuration optimized for TypeScript and database testing

## Production Considerations

- Build backend with `npm run build` before deployment
- Run database migrations in production environment
- Configure proper environment variables
- Set up log rotation and monitoring
- Configure backup schedules appropriately
- Ensure file upload directories have proper permissions
- non cambiare la porta a 3001, la porta deve restare 3000, se necessario riavvio il pc, in tal caso se devi interrompere o se raggiungi il limite temporale crea un promemoria per ripartire da dove hai lasciato