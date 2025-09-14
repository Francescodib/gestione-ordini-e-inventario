# 💾 **BACKUP SYSTEM DOCUMENTATION**

## 📋 **Panoramica**

Il sistema di backup automatico fornisce una soluzione completa per la protezione dei dati del sistema di gestione ordini e inventario. Il sistema supporta backup automatici schedulati e manuali per database e file system, con compressione, verifica integrità e politiche di retention configurabili.

### **🔧 Caratteristiche Principali**

- **Database Backup** - Backup SQLite con snapshot completi
- **Files Backup** - Backup compresso di directory specifiche
- **Automated Scheduling** - Scheduler cron per backup automatici
- **Compression** - Compressione ZIP per ridurre spazio storage
- **Integrity Verification** - Checksum SHA256 per verifica integrità
- **Retention Policies** - Pulizia automatica backup obsoleti
- **Manual Operations** - API per backup e restore manuali
- **Health Monitoring** - Monitoraggio stato sistema backup
- **Notifications** - Sistema notifiche per successi/errori

---

## 🛠️ **ARCHITETTURA**

### **Componenti Principali:**

#### **1. Configuration System (`src/config/backup.ts`)**
```typescript
interface BackupConfig {
  database: {
    enabled: boolean;
    schedule: string; // Cron expression
    retention: { daily: number; weekly: number; monthly: number };
    compression: boolean;
    encryption: boolean;
  };
  files: {
    enabled: boolean;
    schedule: string;
    directories: string[];
    exclusions: string[];
    compression: boolean;
  };
  storage: {
    local: { enabled: boolean; path: string };
    cloud: { enabled: boolean; provider: string };
  };
  notifications: {
    enabled: boolean;
    email?: string;
    webhook?: string;
    onSuccess: boolean;
    onFailure: boolean;
  };
}
```

#### **2. Database Backup Service (`src/services/databaseBackupService.ts`)**
- **createBackup()** - Crea backup database SQLite
- **restoreBackup()** - Ripristina database da backup
- **listBackups()** - Lista backup disponibili
- **cleanOldBackups()** - Pulizia backup obsoleti
- **verifyBackup()** - Verifica integrità backup

#### **3. Files Backup Service (`src/services/filesBackupService.ts`)**
- **createBackup()** - Crea backup compresso di file/directory
- **restoreBackup()** - Estrae backup in directory target
- **collectFiles()** - Raccoglie file basati su pattern/esclusioni
- **createArchive()** - Crea archivio ZIP compresso

#### **4. Backup Scheduler (`src/services/backupScheduler.ts`)**
- **initialize()** - Inizializza job scheduler cron
- **scheduleDatabaseBackup()** - Schedula backup database
- **scheduleFilesBackup()** - Schedula backup file
- **triggerJob()** - Esegue job manualmente
- **getAllJobsStatus()** - Status di tutti i job

#### **5. API Routes (`src/routes/backupRoutes.ts`)**
- **GET /api/backup/health** - Health check sistema
- **POST /api/backup/database** - Backup manuale database
- **POST /api/backup/files** - Backup manuale file
- **GET /api/backup/list** - Lista backup disponibili
- **POST /api/backup/restore/database** - Restore database
- **POST /api/backup/verify** - Verifica integrità backup

---

## ⚙️ **CONFIGURAZIONE**

### **Environment Variables:**
```bash
# Backup System
BACKUP_ENABLED=true
BACKUP_DATABASE_SCHEDULE="0 2 * * *"     # Daily 2 AM
BACKUP_FILES_SCHEDULE="0 3 * * 0"        # Weekly Sunday 3 AM
BACKUP_RETENTION_DAILY=7
BACKUP_LOCAL_PATH="/path/to/backups"
BACKUP_NOTIFICATION_EMAIL="admin@example.com"

# Database
DATABASE_URL="file:./dev.db"
```

### **Default Configuration:**
```typescript
const defaultBackupConfig: BackupConfig = {
  database: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: { daily: 7, weekly: 4, monthly: 12 },
    compression: true,
    encryption: false
  },
  files: {
    enabled: true,
    schedule: '0 3 * * 0', // Weekly Sunday 3 AM
    directories: ['uploads', 'logs', 'config'],
    exclusions: ['*.log', '*.tmp', 'node_modules', '.git'],
    compression: true,
    encryption: false
  },
  storage: {
    local: { enabled: true, path: './backups' },
    cloud: { enabled: false, provider: 'aws' }
  },
  notifications: {
    enabled: true,
    onSuccess: false,
    onFailure: true
  }
};
```

---

## 🚀 **UTILIZZO**

### **1. Backup Automatici**

Il sistema si avvia automaticamente con il server:

```typescript
// src/server.ts
import { BackupScheduler } from './services/backupScheduler';
import { backupConfig } from './config/backup';

// Initialize backup scheduler
const backupScheduler = BackupScheduler.getInstance(backupConfig);
backupScheduler.initialize();
```

#### **Schedule di Default:**
- **Database Backup**: Ogni giorno alle 2:00 AM
- **Files Backup**: Ogni domenica alle 3:00 AM
- **Cleanup**: Ogni giorno all'1:00 AM (database) e 1:30 AM (files)

### **2. Backup Manuali**

#### **Database Backup tramite API:**
```bash
# Admin authentication required
curl -X POST "http://localhost:3000/api/backup/database" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### **Files Backup tramite API:**
```bash
curl -X POST "http://localhost:3000/api/backup/files" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### **Backup tramite Script:**
```bash
# Database backup
npm run backup:database

# Files backup  
npm run backup:files

# Con opzioni custom
npm run backup:database -- --no-compress --path /custom/path
```

### **3. Restore Operations**

#### **Database Restore:**
```bash
curl -X POST "http://localhost:3000/api/backup/restore/database" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupPath": "/backups/database_backup_2024-01-15_14-30-15.db.zip"}'
```

#### **Files Restore:**
```bash
curl -X POST "http://localhost:3000/api/backup/restore/files" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backupPath": "/backups/files_backup_2024-01-15_14-30-15.zip",
    "targetDirectory": "/restore/path"
  }'
```

### **4. Monitoring e Management**

#### **Health Check:**
```bash
curl "http://localhost:3000/api/backup/health"
```

**Response Example:**
```json
{
  "success": true,
  "message": "Backup system is operational",
  "data": {
    "status": "healthy",
    "scheduler": {
      "initialized": true,
      "activeJobs": 4,
      "totalJobs": 4,
      "errorJobs": 0
    },
    "configuration": {
      "databaseBackupEnabled": true,
      "filesBackupEnabled": true,
      "localStorageEnabled": true
    },
    "storage": {
      "backupDirectory": "/path/to/backups",
      "retention": { "daily": 7, "weekly": 4, "monthly": 12 }
    }
  }
}
```

#### **List Backups:**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/list?type=database"
```

#### **Backup Statistics:**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/stats"
```

#### **Trigger Manual Job:**
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/jobs/database-backup/trigger"
```

---

## 📁 **FILE STRUCTURE**

### **Backup Directory Layout:**
```
backups/
├── database_backup_2024-01-15_14-30-15.db.zip
├── database_backup_2024-01-15_14-30-15.db.zip.meta.json
├── database_backup_2024-01-16_02-00-01.db.zip
├── database_backup_2024-01-16_02-00-01.db.zip.meta.json
├── files_backup_2024-01-14_03-00-01.zip
├── files_backup_2024-01-14_03-00-01.zip.meta.json
├── files_backup_2024-01-21_03-00-01.zip
└── files_backup_2024-01-21_03-00-01.zip.meta.json
```

### **Backup Naming Convention:**
```
{type}_backup_{YYYY-MM-DD}_{HH-mm-ss}.{extension}
{type}_backup_{YYYY-MM-DD}_{HH-mm-ss}.{extension}.meta.json
```

**Examples:**
- `database_backup_2024-01-15_14-30-15.db.zip`
- `files_backup_2024-01-15_03-00-01.zip`

### **Metadata File Example:**
```json
{
  "timestamp": "2024-01-15T14:30:15.123Z",
  "type": "database",
  "version": "1.0",
  "backupPath": "/backups/database_backup_2024-01-15_14-30-15.db.zip",
  "tables": ["users", "products", "orders", "categories"],
  "recordCounts": {
    "users": 150,
    "products": 1250,
    "orders": 890,
    "categories": 45
  },
  "checksum": "a1b2c3d4e5f6...",
  "fileCount": 4,
  "totalSize": 1024000
}
```

---

## 🔧 **FEATURES AVANZATE**

### **1. Compression System**

#### **Database Compression:**
```typescript
// Automatic ZIP compression with level 9 (maximum)
const archive = archiver('zip', {
  zlib: { level: 9 }
});
```

#### **Files Compression:**
```typescript
// Balanced compression for files (level 6)
const archive = archiver('zip', {
  zlib: { level: 6 }
});
```

### **2. Integrity Verification**

#### **Checksum Generation:**
```typescript
const crypto = require('crypto');
const fileBuffer = await fs.readFile(filePath);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const checksum = hashSum.digest('hex');
```

#### **Verification Process:**
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/verify" \
  -d '{"backupPath": "/path/to/backup.zip", "type": "database"}'
```

### **3. Retention Management**

#### **Automatic Cleanup:**
- **Daily Backups**: Mantiene ultimi 7 giorni
- **Weekly Backups**: Mantiene ultime 4 settimane  
- **Monthly Backups**: Mantiene ultimi 12 mesi

#### **Manual Cleanup:**
```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/cleanup"
```

### **4. File Filtering System**

#### **Inclusion Patterns:**
```typescript
directories: [
  'uploads',     // User uploaded files
  'logs',        // Application logs
  'config'       // Configuration files
]
```

#### **Exclusion Patterns:**
```typescript
exclusions: [
  '*.log',           // Log files
  '*.tmp',           // Temporary files
  'node_modules',    // Dependencies
  '.git',            // Git repository
  'coverage',        // Test coverage
  'dist'             // Build output
]
```

---

## 📊 **MONITORING E ALERTS**

### **1. Job Status Monitoring**

#### **Job States:**
- **pending** - Job programmato ma non ancora eseguito
- **running** - Job attualmente in esecuzione
- **idle** - Job completato, in attesa del prossimo ciclo
- **error** - Job fallito con errore

#### **Status API:**
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/jobs"
```

### **2. Health Checks**

#### **System Health Indicators:**
- **Scheduler Status** - Scheduler attivo e jobs configurati
- **Storage Availability** - Directory backup accessibile
- **Recent Backup Status** - Ultimi backup completati con successo
- **Error Rate** - Percentuale fallimenti backup

#### **Health Response Example:**
```json
{
  "status": "healthy",  // healthy | degraded | error
  "scheduler": {
    "initialized": true,
    "activeJobs": 4,
    "errorJobs": 0
  },
  "storage": {
    "backupDirectory": "/backups",
    "available": true,
    "freeSpace": "10.5 GB"
  }
}
```

### **3. Logging Integration**

#### **Log Events:**
- **BACKUP_STARTED** - Backup iniziato
- **BACKUP_COMPLETED** - Backup completato con successo
- **BACKUP_FAILED** - Backup fallito
- **RESTORE_STARTED** - Restore iniziato
- **RESTORE_COMPLETED** - Restore completato
- **CLEANUP_COMPLETED** - Pulizia backup completata

#### **Log Format:**
```json
{
  "timestamp": "2024-01-15T14:30:15.123Z",
  "level": "info",
  "message": "Database backup completed successfully",
  "service": "backup-system",
  "metadata": {
    "backupPath": "/backups/database_backup_2024-01-15_14-30-15.db.zip",
    "size": "2.5 MB",
    "duration": "1.2s",
    "compression": "85%"
  }
}
```

---

## 🚨 **TROUBLESHOOTING**

### **Problemi Comuni:**

#### **1. Backup Fails - Disk Space**
```bash
# Errore: No space left on device
# Soluzione: Verifica spazio disco e cleanup
df -h /path/to/backups
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/backup/cleanup"
```

#### **2. Database Locked Error**
```bash
# Errore: database is locked
# Soluzione: Backup durante periodi di bassa attività
# Modifica schedule: "0 2 * * *" (2 AM)
```

#### **3. Permission Issues**
```bash
# Errore: EACCES: permission denied
# Soluzione: Verifica permissions directory backup
chmod 755 /path/to/backups
chown -R app_user:app_group /path/to/backups
```

#### **4. Compression Failures**
```bash
# Errore: Archive creation failed
# Soluzione: Disabilita compressione temporaneamente
# Environment: BACKUP_COMPRESSION=false
```

### **Debug Commands:**

#### **Check Backup Status:**
```bash
# Health check
curl "http://localhost:3000/api/backup/health"

# Job status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/backup/jobs"

# Recent backups
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/backup/list"
```

#### **Manual Verification:**
```bash
# Verify backup integrity
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/backup/verify" \
  -d '{"backupPath": "/path/to/backup.zip", "type": "database"}'

# Test restore (dry run)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/backup/restore/database" \
  -d '{"backupPath": "/path/to/backup.zip", "dryRun": true}'
```

#### **Log Analysis:**
```bash
# Backup system logs
grep "backup" logs/application.log | tail -50

# Error logs
grep "ERROR.*backup" logs/application.log

# Performance logs
grep "duration" logs/application.log | grep "backup"
```

---

## 🔒 **SECURITY**

### **1. Access Control**
- **API Endpoints**: Solo ADMIN role
- **File System**: Permissions restrictive
- **Database**: Transaction isolation

### **2. Data Protection**
- **Encryption**: Supporto per encryption at rest (configurabile)
- **Checksums**: Verifica integrità SHA256
- **Audit Trail**: Log completo operazioni

### **3. Best Practices**
- **Regular Testing**: Test restore periodici
- **Off-site Backup**: Storage cloud per disaster recovery
- **Monitoring**: Alert automatici per fallimenti
- **Documentation**: Procedure recovery aggiornate

---

## 🚀 **PERFORMANCE**

### **Metriche Tipiche:**

#### **Database Backup:**
- **Size**: 10-50 MB (tipico SQLite)
- **Duration**: 1-5 secondi
- **Compression**: 70-85% riduzione size
- **I/O**: Minimal impact during low activity

#### **Files Backup:**
- **Size**: 100 MB - 2 GB (uploads + logs)
- **Duration**: 30 secondi - 5 minuti
- **Compression**: 60-80% riduzione size
- **Network**: Minimal bandwidth usage

### **Optimization Tips:**

#### **Database Performance:**
```typescript
// Backup durante low activity periods
schedule: '0 2 * * *'  // 2 AM

// Use WAL mode for concurrent access
PRAGMA journal_mode=WAL;
```

#### **Files Performance:**
```typescript
// Selective backup directories
directories: ['uploads', 'config']  // Exclude logs if not needed

// Efficient exclusions
exclusions: ['*.tmp', '*.log', 'node_modules/**']
```

---

## 📋 **MAINTENANCE**

### **Routine Tasks:**

#### **Weekly:**
- Verifica backup completati
- Check storage space
- Review error logs

#### **Monthly:**
- Test restore procedure
- Update retention policies
- Performance review

#### **Quarterly:**
- Disaster recovery test
- Update documentation
- Security audit

### **Monitoring Checklist:**

#### **Daily Checks:**
- [ ] Backup scheduler running
- [ ] Recent backups successful
- [ ] Storage space available
- [ ] No error alerts

#### **Weekly Checks:**
- [ ] Backup integrity verification
- [ ] Cleanup job performance
- [ ] Log rotation working
- [ ] Notification system active

---

## 🔮 **FUTURE ENHANCEMENTS**

### **Planned Features:**
1. **Cloud Storage Integration** - AWS S3, Google Cloud Storage
2. **Incremental Backups** - Delta backup support
3. **Backup Encryption** - AES-256 encryption at rest
4. **Advanced Scheduling** - Multiple schedules per backup type
5. **Webhook Notifications** - Slack, Discord, Teams integration
6. **Backup Analytics** - Performance metrics dashboard
7. **Auto-scaling** - Dynamic retention based on storage
8. **Backup Validation** - Automated restore testing

### **Configuration Future:**
```typescript
// Enhanced configuration example
{
  database: {
    type: 'incremental',  // full | incremental | differential
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keyRotation: 30  // days
    }
  },
  cloud: {
    provider: 'aws',
    region: 'eu-west-1',
    bucket: 'company-backups',
    lifecycle: {
      ia: 30,      // Move to IA after 30 days
      glacier: 90,  // Move to Glacier after 90 days
      delete: 2555 // Delete after 7 years
    }
  }
}
```

---

## 📝 **SUPPORTO**

### **Documentation:**
- **API Reference**: `/api/backup` endpoints
- **Configuration Guide**: Environment variables
- **Troubleshooting**: Common issues and solutions

### **Monitoring:**
- **Health Endpoint**: `/api/backup/health`
- **Metrics API**: `/api/backup/stats`
- **Job Status**: `/api/backup/jobs`

### **Recovery Procedures:**
- **Database Recovery**: Step-by-step restore guide
- **Files Recovery**: Selective restore procedures
- **Disaster Recovery**: Complete system restore

**Il sistema di backup è ora completamente implementato e pronto per proteggere i dati del sistema!** 💾✨
