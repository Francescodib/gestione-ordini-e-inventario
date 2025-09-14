# 📝 Comprehensive Logging System Guide

## Overview

This project implements a **production-ready logging system** using **Winston** with structured JSON logging, multiple transports, and comprehensive security monitoring.

## Features Implemented

### ✅ **Structured Logging**
- **JSON format** for production environments
- **Colorized console** output for development
- **Multiple log levels** (error, warn, info, http, debug)
- **Request ID tracking** for distributed tracing
- **Timestamp and metadata** for all log entries

### ✅ **Multiple Log Transports**
- **Console logging** for development
- **Daily rotating files** for production
- **Separate files** for errors, access, security, and performance
- **Automatic file rotation** with size and date limits
- **Configurable retention** policies

### ✅ **Security Monitoring**
- **Authentication events** (login, logout, failed attempts)
- **Suspicious request detection** (XSS, SQL injection patterns)
- **Rate limiting violations** tracking
- **IP-based threat monitoring**
- **User activity auditing**

### ✅ **Performance Tracking**
- **Response time monitoring** for all requests
- **Slow request detection** (>1 second alerts)
- **Database operation timing**
- **Resource usage metrics**
- **Error rate tracking**

## Log Structure

### 🏗️ **Log Levels**

```typescript
LOG_LEVELS = {
  error: 0,    // System errors, exceptions
  warn: 1,     // Warnings, security events
  info: 2,     // General information, successful operations
  http: 3,     // HTTP requests/responses
  debug: 4     // Debug information, detailed traces
}
```

### 📁 **Log Files**

#### **Combined Logs** (`combined-YYYY-MM-DD.log`)
All log levels combined for comprehensive monitoring:
```json
{
  "timestamp": "2025-09-13T21:22:05.728Z",
  "level": "info",
  "message": "Request completed",
  "service": "quickstock-api",
  "environment": "development",
  "requestId": "49c9cfe7-e81a-41bc-a0b8-6476af3a1431",
  "method": "GET",
  "url": "/health",
  "statusCode": 200,
  "responseTime": 12,
  "type": "request_complete"
}
```

#### **Security Logs** (`security-YYYY-MM-DD.log`)
Authentication and security events:
```json
{
  "timestamp": "2025-09-13T21:22:12.803Z",
  "level": "info", 
  "message": "Authentication: login",
  "service": "quickstock-security",
  "environment": "development",
  "event": "login",
  "userId": "cmfirf9cg0000ia8bzdz4rs2l",
  "ip": "::1",
  "success": true,
  "type": "auth_event"
}
```

#### **Performance Logs** (`performance-YYYY-MM-DD.log`)
Response times and performance metrics:
```json
{
  "level": "info",
  "message": "Response Time",
  "method": "POST",
  "requestId": "a05b571f-7e23-4d59-8c6c-9679d183f457",
  "responseTime": 215,
  "statusCode": 200,
  "timestamp": "2025-09-13T21:22:12.803Z",
  "type": "performance_metric",
  "url": "/login"
}
```

#### **Error Logs** (`error-YYYY-MM-DD.log`)
Errors and exceptions only:
```json
{
  "timestamp": "2025-09-13T21:22:19.177Z",
  "level": "error",
  "message": "Application Error",
  "stack": "Error: Something went wrong...",
  "context": {
    "userId": "user123",
    "operation": "user_update"
  },
  "type": "application_error"
}
```

#### **Access Logs** (`access-YYYY-MM-DD.log`)
HTTP access logs in combined format:
```
::1 - - [13/Sep/2025:21:22:05 +0000] "GET /health HTTP/1.1" 200 123 "-" "curl/8.7.1"
```

#### **Database Logs** (`database-YYYY-MM-DD.log`)
Database operations and query performance:
```json
{
  "timestamp": "2025-09-13T21:22:12.500Z",
  "level": "debug",
  "message": "Database Operation",
  "operation": "SELECT",
  "table": "users",
  "duration": 15,
  "type": "db_operation"
}
```

## Logger Configuration

### 🔧 **Environment-Based Setup**

#### **Development Environment**
- **Console output**: Colorized, human-readable
- **Log level**: `debug` (all messages)
- **File logging**: Enabled
- **Error handling**: Detailed stack traces

#### **Production Environment**
- **Console output**: Structured JSON
- **Log level**: `info` (reduces noise)
- **File logging**: Enabled with rotation
- **Error handling**: Sanitized error messages

#### **Test Environment**
- **Console output**: Minimal
- **Log level**: `error` (errors only)
- **File logging**: Disabled
- **Error handling**: Suppress non-critical logs

### ⚙️ **Configuration Options**

```typescript
// Environment Variables
LOG_LEVEL=debug|info|warn|error      // Minimum log level
LOG_DIR=./logs                       // Log files directory
NODE_ENV=development|production|test  // Environment mode

// File Rotation Settings
MAX_SIZE=20m        // Maximum file size before rotation
MAX_FILES=14d       // Keep logs for 14 days
DATE_PATTERN=YYYY-MM-DD  // Daily rotation pattern
```

## Security Features

### 🛡️ **Threat Detection**

#### **Suspicious Request Patterns**
```typescript
const suspiciousPatterns = [
  /sql/i,           // SQL injection
  /script/i,        // XSS attempts
  /select\s+/i,     // SQL SELECT statements
  /union\s+/i,      // SQL UNION attacks
  /drop\s+/i,       // SQL DROP statements
  /<script/i,       // Script tags
  /javascript:/i,   // JavaScript protocols
  /onclick/i,       // Event handlers
  /onerror/i        // Error handlers
];
```

#### **Authentication Monitoring**
- **Successful logins**: User ID, IP, timestamp
- **Failed attempts**: Email, IP, reason
- **Password changes**: User ID, IP, success status
- **Account registration**: User details, IP
- **Token refresh**: User ID, IP, token status

#### **Audit Trail**
- **User actions**: Create, update, delete operations
- **Admin actions**: User management, role changes
- **Data access**: Sensitive data retrieval
- **Configuration changes**: System settings updates

### 🚨 **Security Alerts**

#### **Failed Login Monitoring**
```json
{
  "event": "failed_login",
  "ip": "192.168.1.100",
  "details": {
    "email": "admin@quickstock.com",
    "reason": "Invalid credentials",
    "attempts": 3
  }
}
```

#### **Suspicious Activity Detection**
```json
{
  "event": "suspicious_request",
  "ip": "192.168.1.100",
  "details": {
    "method": "GET",
    "url": "/api/users?search=<script>alert('xss')</script>",
    "reason": "suspicious_url"
  }
}
```

## Performance Monitoring

### ⚡ **Metrics Tracked**

#### **Response Time Monitoring**
- **All HTTP requests**: Method, URL, duration
- **Slow request alerts**: >1 second warnings
- **Database queries**: Query duration and type
- **External API calls**: Third-party service response times

#### **Resource Usage**
- **Memory usage**: Heap size, garbage collection
- **CPU usage**: Request processing time
- **Database connections**: Active connections, pool usage
- **File system**: Log file sizes, disk usage

#### **Error Rate Tracking**
- **HTTP errors**: 4xx and 5xx response codes
- **Application errors**: Unhandled exceptions
- **Database errors**: Connection failures, query errors
- **Validation errors**: Input validation failures

### 📊 **Performance Alerts**

#### **Slow Request Alert**
```json
{
  "type": "slow_request",
  "method": "POST",
  "url": "/api/orders",
  "responseTime": 2500,
  "threshold": 1000,
  "userId": "user123"
}
```

## Utility Functions

### 🔧 **LogUtils API**

#### **User Actions**
```typescript
logUtils.logUserAction(userId, 'user_update', {
  field: 'email',
  oldValue: '[REDACTED]',
  newValue: '[REDACTED]'
});
```

#### **Security Events**
```typescript
logUtils.logSecurityEvent('suspicious_request', userId, ip, {
  pattern: 'sql_injection',
  payload: sanitizedPayload
});
```

#### **Authentication**
```typescript
logUtils.logAuth('login', userId, ip, true);
logUtils.logAuth('failed_login', email, ip, false);
```

#### **Database Operations**
```typescript
logUtils.logDbOperation('SELECT', 'users', duration);
logUtils.logDbOperation('INSERT', 'orders', duration, error);
```

#### **Performance Metrics**
```typescript
logUtils.logPerformance('response_time', 250, 'ms', {
  endpoint: '/api/users',
  method: 'GET'
});
```

## Request Tracking

### 🔍 **Request ID System**

Every request gets a unique ID for end-to-end tracing:

```http
GET /api/users HTTP/1.1
X-Request-ID: 49c9cfe7-e81a-41bc-a0b8-6476af3a1431
```

Response includes the same ID:
```http
HTTP/1.1 200 OK
X-Request-ID: 49c9cfe7-e81a-41bc-a0b8-6476af3a1431
```

### 📋 **Request Lifecycle**

1. **Request Start**: Method, URL, headers, user info
2. **Processing**: Database queries, business logic
3. **Response**: Status code, response time, data size
4. **Error Handling**: Exception details, stack traces

## Data Sanitization

### 🧹 **Sensitive Data Protection**

Automatically redacts sensitive information:

```typescript
const sensitiveFields = [
  'password', 'token', 'authorization', 'cookie',
  'secret', 'key', 'private', 'confidential',
  'ssn', 'creditcard'
];
```

**Before logging:**
```json
{
  "email": "user@example.com",
  "password": "secretpassword123",
  "token": "jwt-token-here"
}
```

**After sanitization:**
```json
{
  "email": "user@example.com", 
  "password": "[REDACTED]",
  "token": "[REDACTED]"
}
```

## Log Analysis

### 📈 **Monitoring Queries**

#### **Find Failed Logins**
```bash
grep "failed_login" logs/security-*.log | jq .
```

#### **Slow Requests**
```bash
grep "slow_request" logs/combined-*.log | jq .
```

#### **Error Analysis**
```bash
grep '"level":"error"' logs/error-*.log | jq .
```

#### **User Activity**
```bash
grep "user_action" logs/combined-*.log | jq '. | select(.userId == "user123")'
```

### 🔍 **Log Aggregation**

For production environments, consider:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Splunk**: Enterprise log management
- **Grafana**: Visualization and alerting
- **Datadog**: Cloud-based monitoring

## Troubleshooting

### ❗ **Common Issues**

#### **Log Files Not Created**
```bash
# Check permissions
ls -la logs/
chmod 755 logs/

# Check disk space
df -h

# Verify LOG_DIR environment variable
echo $LOG_DIR
```

#### **High Log Volume**
```bash
# Adjust log level
export LOG_LEVEL=warn

# Check file sizes
du -h logs/*.log

# Rotate logs manually
npm run logs:rotate
```

#### **Missing Request IDs**
```typescript
// Ensure middleware order
app.use(requestIdMiddleware());  // Must be first
app.use(requestLoggingMiddleware());
```

### 🔧 **Performance Optimization**

#### **Reduce Log Volume**
```typescript
// Skip health check logging
if (req.url === '/health') {
  req.skipLogging = true;
}

// Sample high-frequency endpoints
if (Math.random() > 0.1) {
  req.skipLogging = true;
}
```

#### **Async Logging**
```typescript
// Use async transport for high-throughput
new winston.transports.File({
  filename: 'app.log',
  options: { flags: 'a' }
});
```

## Best Practices

### ✅ **Do's**
- **Use structured logging** (JSON format)
- **Include context** in every log entry
- **Sanitize sensitive data** before logging
- **Use appropriate log levels** for different events
- **Implement log rotation** to manage disk space
- **Monitor log volume** and performance impact
- **Use request IDs** for tracing
- **Log both success and failure** events

### ❌ **Don'ts**
- **Don't log passwords** or sensitive data
- **Don't use console.log** in production
- **Don't ignore log file permissions**
- **Don't log every database query** in production
- **Don't forget to rotate logs**
- **Don't mix logging levels** inappropriately
- **Don't log personal information** without consent

## Integration Examples

### 🔌 **Express Middleware Integration**
```typescript
app.use(requestIdMiddleware());
app.use(requestLoggingMiddleware());
app.use(responseLoggingMiddleware());
app.use(securityLoggingMiddleware());
app.use(errorLoggingMiddleware());
```

### 🔌 **Custom Service Integration**
```typescript
import { logger, logUtils } from './config/logger';

class OrderService {
  async createOrder(orderData: any, userId: string) {
    try {
      const order = await this.repository.create(orderData);
      
      logUtils.logUserAction(userId, 'order_create', {
        orderId: order.id,
        totalAmount: order.totalAmount
      });
      
      return order;
    } catch (error) {
      logger.error('Order creation failed', {
        userId,
        error: error.message,
        orderData: sanitizeLogData(orderData)
      });
      throw error;
    }
  }
}
```

This comprehensive logging system provides **production-ready monitoring**, **security threat detection**, and **performance tracking** for the QuickStock API.
