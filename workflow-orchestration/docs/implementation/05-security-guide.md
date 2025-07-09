# Security Guide

> 🔒 **Comprehensive Security Strategy for the Workflow Orchestration System**

[![Status](https://img.shields.io/badge/status-specification-orange.svg)](https://github.com/yourusername/workflow-orchestration-system)
[![Spec Version](https://img.shields.io/badge/spec-1.0.0-blue.svg)](specs/)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.org)

## 📋 Table of Contents

1. [Security Philosophy](#security-philosophy)
2. [Threat Model](#threat-model)
3. [Authentication & Authorization](#authentication--authorization)
4. [Input Validation](#input-validation)
5. [Data Protection](#data-protection)
6. [Network Security](#network-security)
7. [Secure Development](#secure-development)
8. [Security Testing](#security-testing)
9. [Incident Response](#incident-response)

---

## ⚠️ Important Note

**This is a specification project.** The security strategy described below is the planned approach for when implementation begins. Currently, no actual security measures are implemented - only the security framework design.

For now, you can:
- Review the [Architecture Guide](02-architecture.md) to understand the system design
- Study the [API Specification](../spec/mcp-api-v1.0.md) to understand the interface
- Examine the [Workflow Schema](../spec/workflow.schema.json) to understand data structures

---

## Security Philosophy

### Core Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Minimal access required for functionality
3. **Fail Secure**: System fails to secure state by default
4. **Security by Design**: Security integrated from the start
5. **Continuous Monitoring**: Ongoing security assessment

### Security Goals

- **Confidentiality**: Protect sensitive workflow data
- **Integrity**: Ensure workflow data remains unaltered
- **Availability**: Maintain system availability under attack
- **Non-repudiation**: Provide audit trails for actions

---

## Threat Model

### Attack Vectors

#### 1. **Input Validation Attacks**
- **SQL Injection**: Malicious workflow IDs or parameters
- **Path Traversal**: Attempting to access system files
- **Buffer Overflow**: Large input data causing memory issues
- **XSS**: Script injection in workflow content

#### 2. **Authentication Bypass**
- **Token Forgery**: Creating fake authentication tokens
- **Session Hijacking**: Stealing valid session tokens
- **Brute Force**: Attempting to guess credentials
- **Privilege Escalation**: Gaining higher access levels

#### 3. **Data Exposure**
- **Information Disclosure**: Exposing sensitive workflow data
- **Insecure Storage**: Storing data without encryption
- **Log Exposure**: Sensitive data in log files
- **Cache Poisoning**: Corrupting cached data

#### 4. **Denial of Service**
- **Resource Exhaustion**: Consuming system resources
- **Rate Limiting Bypass**: Circumventing request limits
- **Memory Leaks**: Causing system instability
- **CPU Exhaustion**: Overwhelming processing capacity

### Risk Assessment

```typescript
// security/risk-assessment.ts
export interface SecurityRisk {
  threat: string;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string[];
}

export const securityRisks: SecurityRisk[] = [
  {
    threat: 'Malicious workflow injection',
    likelihood: 'MEDIUM',
    impact: 'HIGH',
    mitigation: [
      'Input validation',
      'Workflow sandboxing',
      'Content security policy'
    ]
  },
  {
    threat: 'Authentication bypass',
    likelihood: 'LOW',
    impact: 'HIGH',
    mitigation: [
      'Strong authentication',
      'Session management',
      'Access controls'
    ]
  },
  {
    threat: 'Data exposure',
    likelihood: 'MEDIUM',
    impact: 'MEDIUM',
    mitigation: [
      'Encryption at rest',
      'Encryption in transit',
      'Access logging'
    ]
  }
];
```

---

## Authentication & Authorization

### Authentication Strategy

#### 1. **JWT-Based Authentication**

```typescript
// security/auth/jwt.ts
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

export class JWTAuthentication {
  private readonly secret: string;
  private readonly algorithm = 'HS256';
  
  constructor(secret: string) {
    this.secret = secret;
  }
  
  generateToken(userId: string, permissions: string[]): string {
    const payload = {
      sub: userId,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };
    
    return jwt.sign(payload, this.secret, { algorithm: this.algorithm });
  }
  
  verifyToken(token: string): { userId: string; permissions: string[] } {
    try {
      const decoded = jwt.verify(token, this.secret, { 
        algorithms: [this.algorithm] 
      }) as any;
      
      return {
        userId: decoded.sub,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  refreshToken(token: string): string {
    const decoded = this.verifyToken(token);
    return this.generateToken(decoded.userId, decoded.permissions);
  }
}
```

#### 2. **API Key Authentication**

```typescript
// security/auth/api-key.ts
export class APIKeyAuthentication {
  private readonly validKeys: Set<string>;
  
  constructor(keys: string[]) {
    this.validKeys = new Set(keys);
  }
  
  validateKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // Rate limiting check
    if (this.isRateLimited(key)) {
      return false;
    }
    
    return this.validKeys.has(key);
  }
  
  private isRateLimited(key: string): boolean {
    // Implement rate limiting logic
    return false;
  }
}
```

#### 3. **Session Management**

```typescript
// security/auth/session.ts
export class SessionManager {
  private sessions = new Map<string, SessionData>();
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  createSession(userId: string): string {
    const sessionId = this.generateSessionId();
    const sessionData: SessionData = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      permissions: this.getUserPermissions(userId)
    };
    
    this.sessions.set(sessionId, sessionData);
    return sessionId;
  }
  
  validateSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check session timeout
    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }
  
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### Authorization Strategy

#### 1. **Role-Based Access Control (RBAC)**

```typescript
// security/auth/rbac.ts
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'execute';
}

export class RBACManager {
  private roles: Map<string, Role> = new Map();
  
  constructor() {
    this.initializeDefaultRoles();
  }
  
  private initializeDefaultRoles(): void {
    // Admin role
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      permissions: [
        { resource: 'workflows', action: 'read' },
        { resource: 'workflows', action: 'write' },
        { resource: 'workflows', action: 'delete' },
        { resource: 'workflows', action: 'execute' },
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'write' }
      ]
    });
    
    // User role
    this.roles.set('user', {
      id: 'user',
      name: 'User',
      permissions: [
        { resource: 'workflows', action: 'read' },
        { resource: 'workflows', action: 'execute' }
      ]
    });
  }
  
  hasPermission(userRole: string, resource: string, action: string): boolean {
    const role = this.roles.get(userRole);
    if (!role) {
      return false;
    }
    
    return role.permissions.some(
      permission => permission.resource === resource && permission.action === action
    );
  }
}
```

#### 2. **Resource-Level Authorization**

```typescript
// security/auth/resource-auth.ts
export class ResourceAuthorization {
  private readonly rbac: RBACManager;
  
  constructor(rbac: RBACManager) {
    this.rbac = rbac;
  }
  
  canAccessWorkflow(userId: string, workflowId: string): boolean {
    const userRole = this.getUserRole(userId);
    
    // Check basic workflow access
    if (!this.rbac.hasPermission(userRole, 'workflows', 'read')) {
      return false;
    }
    
    // Check workflow-specific permissions
    const workflowPermissions = this.getWorkflowPermissions(workflowId);
    return workflowPermissions.some(permission => 
      permission.userId === userId || permission.role === userRole
    );
  }
  
  canExecuteWorkflow(userId: string, workflowId: string): boolean {
    if (!this.canAccessWorkflow(userId, workflowId)) {
      return false;
    }
    
    const userRole = this.getUserRole(userId);
    return this.rbac.hasPermission(userRole, 'workflows', 'execute');
  }
}
```

---

## Input Validation

### Validation Strategy

#### 1. **Workflow ID Validation**

```typescript
// security/validation/workflow-id.ts
export class WorkflowIDValidator {
  private readonly validPattern = /^[a-z0-9-]+$/;
  private readonly minLength = 3;
  private readonly maxLength = 64;
  
  validate(workflowId: string): ValidationResult {
    const errors: string[] = [];
    
    // Check if input is string
    if (typeof workflowId !== 'string') {
      errors.push('Workflow ID must be a string');
      return { valid: false, errors };
    }
    
    // Check length
    if (workflowId.length < this.minLength) {
      errors.push(`Workflow ID must be at least ${this.minLength} characters`);
    }
    
    if (workflowId.length > this.maxLength) {
      errors.push(`Workflow ID must be at most ${this.maxLength} characters`);
    }
    
    // Check pattern
    if (!this.validPattern.test(workflowId)) {
      errors.push('Workflow ID can only contain lowercase letters, numbers, and hyphens');
    }
    
    // Check for reserved words
    if (this.isReservedWord(workflowId)) {
      errors.push('Workflow ID cannot be a reserved word');
    }
    
    // Check for path traversal attempts
    if (this.containsPathTraversal(workflowId)) {
      errors.push('Workflow ID cannot contain path traversal characters');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private isReservedWord(id: string): boolean {
    const reserved = ['admin', 'system', 'internal', 'test'];
    return reserved.includes(id.toLowerCase());
  }
  
  private containsPathTraversal(id: string): boolean {
    const dangerousPatterns = [
      /\.\./,
      /\/\//,
      /\\/,
      /\.\.\//,
      /\.\.\\/
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(id));
  }
}
```

#### 2. **JSON Schema Validation**

```typescript
// security/validation/schema.ts
import Ajv from 'ajv';
import workflowSchema from '../../specs/workflow.schema.json';

export class SchemaValidator {
  private ajv: Ajv;
  
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: true
    });
    
    // Add custom formats
    this.ajv.addFormat('workflow-id', {
      type: 'string',
      validate: (id: string) => {
        const validator = new WorkflowIDValidator();
        return validator.validate(id).valid;
      }
    });
  }
  
  validateWorkflow(workflow: any): ValidationResult {
    const validate = this.ajv.compile(workflowSchema);
    const valid = validate(workflow);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }
  
  validateStep(step: any): ValidationResult {
    const stepSchema = {
      type: 'object',
      required: ['id', 'title', 'prompt'],
      properties: {
        id: { type: 'string', format: 'workflow-id' },
        title: { type: 'string', maxLength: 200 },
        prompt: { type: 'string', maxLength: 10000 },
        requireConfirmation: { type: 'boolean' }
      }
    };
    
    const validate = this.ajv.compile(stepSchema);
    const valid = validate(step);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }
}
```

#### 3. **Content Security**

```typescript
// security/validation/content.ts
export class ContentSecurityValidator {
  private readonly maxContentLength = 1024 * 1024; // 1MB
  private readonly dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /document\./gi,
    /window\./gi
  ];
  
  validateContent(content: string): ValidationResult {
    const errors: string[] = [];
    
    // Check content length
    if (content.length > this.maxContentLength) {
      errors.push('Content exceeds maximum allowed length');
    }
    
    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(content)) {
        errors.push('Content contains potentially dangerous code');
        break;
      }
    }
    
    // Check for SQL injection patterns
    if (this.containsSQLInjection(content)) {
      errors.push('Content contains SQL injection patterns');
    }
    
    // Check for path traversal
    if (this.containsPathTraversal(content)) {
      errors.push('Content contains path traversal patterns');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private containsSQLInjection(content: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi,
      /(\b(or|and)\b\s+\d+\s*=\s*\d+)/gi,
      /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(union|select|insert|update|delete|drop|create|alter)\b)/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(content));
  }
  
  private containsPathTraversal(content: string): boolean {
    const pathPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /\/etc\/passwd/,
      /\/windows\/system32/
    ];
    
    return pathPatterns.some(pattern => pattern.test(content));
  }
}
```

---

## Data Protection

### Encryption Strategy

#### 1. **Encryption at Rest**

```typescript
// security/encryption/storage.ts
import crypto from 'crypto';

export class StorageEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  
  constructor(key: string) {
    this.key = Buffer.from(key, 'hex');
  }
  
  encrypt(data: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('workflow-data'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('workflow-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 2. **Encryption in Transit**

```typescript
// security/encryption/transport.ts
export class TransportEncryption {
  private readonly tlsConfig = {
    minVersion: 'TLSv1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ]
  };
  
  createSecureServer(): https.Server {
    return https.createServer({
      key: fs.readFileSync('certs/private-key.pem'),
      cert: fs.readFileSync('certs/certificate.pem'),
      ...this.tlsConfig
    });
  }
  
  createSecureClient(): https.Agent {
    return new https.Agent({
      rejectUnauthorized: true,
      ...this.tlsConfig
    });
  }
}
```

### Data Sanitization

```typescript
// security/sanitization/data.ts
export class DataSanitizer {
  sanitizeWorkflow(workflow: any): any {
    return {
      id: this.sanitizeString(workflow.id),
      name: this.sanitizeString(workflow.name),
      description: this.sanitizeString(workflow.description),
      steps: workflow.steps?.map(step => this.sanitizeStep(step)) || [],
      metaGuidance: workflow.metaGuidance?.map(guidance => 
        this.sanitizeString(guidance)
      ) || []
    };
  }
  
  sanitizeStep(step: any): any {
    return {
      id: this.sanitizeString(step.id),
      title: this.sanitizeString(step.title),
      prompt: this.sanitizeString(step.prompt),
      requireConfirmation: Boolean(step.requireConfirmation)
    };
  }
  
  private sanitizeString(input: any): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // HTML encode special characters
    sanitized = this.htmlEncode(sanitized);
    
    return sanitized;
  }
  
  private htmlEncode(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
```

---

## Network Security

### Rate Limiting

```typescript
// security/network/rate-limiter.ts
export class RateLimiter {
  private requests = new Map<string, RequestRecord[]>();
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests = 100; // per window
  
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    
    // Remove old requests outside the window
    const recentRequests = clientRequests.filter(
      req => now - req.timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push({ timestamp: now });
    this.requests.set(clientId, recentRequests);
    
    return true;
  }
  
  getRemainingRequests(clientId: string): number {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    const recentRequests = clientRequests.filter(
      req => now - req.timestamp < this.windowMs
    );
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}
```

### CORS Configuration

```typescript
// security/network/cors.ts
export const corsConfig = {
  origin: (origin: string, callback: Function) => {
    const allowedOrigins = [
      'https://localhost:3000',
      'https://yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};
```

### Request Validation

```typescript
// security/network/request-validator.ts
export class RequestValidator {
  validateHeaders(headers: any): ValidationResult {
    const errors: string[] = [];
    
    // Check required headers
    if (!headers['content-type']) {
      errors.push('Content-Type header is required');
    }
    
    // Validate Content-Type
    if (headers['content-type'] && 
        !headers['content-type'].includes('application/json')) {
      errors.push('Content-Type must be application/json');
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto'
    ];
    
    for (const header of suspiciousHeaders) {
      if (headers[header]) {
        errors.push(`Suspicious header detected: ${header}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  validateBody(body: any): ValidationResult {
    const errors: string[] = [];
    
    // Check body size
    const bodySize = JSON.stringify(body).length;
    if (bodySize > 1024 * 1024) { // 1MB
      errors.push('Request body too large');
    }
    
    // Check for circular references
    if (this.hasCircularReferences(body)) {
      errors.push('Request body contains circular references');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private hasCircularReferences(obj: any): boolean {
    const seen = new WeakSet();
    
    const check = (value: any): boolean => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return true;
        }
        seen.add(value);
        
        for (const key in value) {
          if (check(value[key])) {
            return true;
          }
        }
      }
      return false;
    };
    
    return check(obj);
  }
}
```

---

## Secure Development

### Secure Coding Guidelines

#### 1. **Input Validation**
- Always validate all inputs
- Use whitelist approach over blacklist
- Validate at boundaries (API, file system, database)
- Sanitize data before processing

#### 2. **Authentication & Authorization**
- Use strong authentication mechanisms
- Implement proper session management
- Apply principle of least privilege
- Regularly rotate secrets and keys

#### 3. **Data Protection**
- Encrypt sensitive data at rest and in transit
- Use secure random number generation
- Implement proper key management
- Sanitize data before storage

#### 4. **Error Handling**
- Don't expose sensitive information in errors
- Log security events appropriately
- Implement graceful error handling
- Use secure error messages

### Security Code Review Checklist

```typescript
// security/review/checklist.ts
export const securityChecklist = {
  inputValidation: [
    'All inputs are validated',
    'Path traversal is prevented',
    'SQL injection is prevented',
    'XSS is prevented',
    'Input size limits are enforced'
  ],
  authentication: [
    'Strong authentication is used',
    'Sessions are properly managed',
    'Tokens are securely handled',
    'Password policies are enforced'
  ],
  authorization: [
    'Access controls are implemented',
    'Principle of least privilege is applied',
    'Resource-level permissions are checked',
    'Role-based access is used'
  ],
  dataProtection: [
    'Sensitive data is encrypted',
    'Keys are properly managed',
    'Data is sanitized before storage',
    'Secure communication is used'
  ],
  errorHandling: [
    'Errors don\'t expose sensitive data',
    'Security events are logged',
    'Graceful error handling is implemented',
    'Error messages are secure'
  ]
};
```

---

## Security Testing

### Automated Security Testing

```typescript
// tests/security/automated.test.ts
describe('Automated Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInputs = [
      "'; DROP TABLE workflows; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];
    
    for (const input of maliciousInputs) {
      await expect(
        client.call('workflow_get', { id: input })
      ).rejects.toThrow('Invalid input');
    }
  });
  
  it('should prevent path traversal', async () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config',
      'workflows/../../../etc/passwd'
    ];
    
    for (const path of maliciousPaths) {
      await expect(
        client.call('workflow_get', { id: path })
      ).rejects.toThrow('Invalid path');
    }
  });
  
  it('should prevent XSS attacks', async () => {
    const maliciousContent = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">'
    ];
    
    for (const content of maliciousContent) {
      await expect(
        client.call('workflow_validate', {
          workflowId: 'test',
          stepId: 'test',
          output: content
        })
      ).rejects.toThrow('Invalid content');
    }
  });
});
```

### Penetration Testing

```typescript
// tests/security/penetration.test.ts
describe('Penetration Testing', () => {
  it('should resist brute force attacks', async () => {
    const startTime = Date.now();
    
    // Attempt multiple failed logins
    for (let i = 0; i < 10; i++) {
      try {
        await client.call('workflow_list', null, {
          headers: { Authorization: 'Bearer invalid-token' }
        });
      } catch (error) {
        // Expected to fail
      }
    }
    
    // Should be rate limited after multiple failures
    await expect(
      client.call('workflow_list', null, {
        headers: { Authorization: 'Bearer invalid-token' }
      })
    ).rejects.toThrow('Rate limited');
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(5000); // Should be quick
  });
  
  it('should handle large payload attacks', async () => {
    const largePayload = 'x'.repeat(1024 * 1024 + 1); // > 1MB
    
    await expect(
      client.call('workflow_validate', {
        workflowId: 'test',
        stepId: 'test',
        output: largePayload
      })
    ).rejects.toThrow('Payload too large');
  });
});
```

---

## Incident Response

### Security Monitoring

```typescript
// security/monitoring/security-monitor.ts
export class SecurityMonitor {
  private readonly alerts: SecurityAlert[] = [];
  
  logSecurityEvent(event: SecurityEvent): void {
    // Log the event
    console.log(`[SECURITY] ${event.type}: ${event.message}`);
    
    // Check for suspicious patterns
    if (this.isSuspicious(event)) {
      this.createAlert(event);
    }
    
    // Store for analysis
    this.alerts.push({
      timestamp: Date.now(),
      event,
      severity: this.calculateSeverity(event)
    });
  }
  
  private isSuspicious(event: SecurityEvent): boolean {
    const suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_access_pattern',
      'large_payload',
      'suspicious_input'
    ];
    
    return suspiciousPatterns.includes(event.type);
  }
  
  private calculateSeverity(event: SecurityEvent): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch (event.type) {
      case 'authentication_failure':
        return 'MEDIUM';
      case 'suspicious_input':
        return 'HIGH';
      case 'rate_limit_exceeded':
        return 'LOW';
      default:
        return 'LOW';
    }
  }
  
  getRecentAlerts(minutes: number = 60): SecurityAlert[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }
}
```

### Incident Response Plan

```typescript
// security/incident/response-plan.ts
export class IncidentResponse {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 1. Assess severity
    const severity = this.assessSeverity(incident);
    
    // 2. Immediate response
    await this.immediateResponse(incident, severity);
    
    // 3. Investigation
    const investigation = await this.investigate(incident);
    
    // 4. Remediation
    await this.remediate(incident, investigation);
    
    // 5. Documentation
    await this.documentIncident(incident, investigation);
  }
  
  private assessSeverity(incident: SecurityIncident): 'LOW' | 'MEDIUM' | 'HIGH' {
    const factors = {
      dataExposure: incident.dataExposure ? 3 : 0,
      systemAccess: incident.systemAccess ? 2 : 0,
      userImpact: incident.userImpact ? 1 : 0
    };
    
    const score = Object.values(factors).reduce((sum, value) => sum + value, 0);
    
    if (score >= 4) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    return 'LOW';
  }
  
  private async immediateResponse(incident: SecurityIncident, severity: string): Promise<void> {
    switch (severity) {
      case 'HIGH':
        // Immediate system shutdown if necessary
        await this.emergencyShutdown();
        break;
      case 'MEDIUM':
        // Rate limiting and monitoring
        await this.enableEnhancedMonitoring();
        break;
      case 'LOW':
        // Log and monitor
        await this.logIncident(incident);
        break;
    }
  }
}
```

---

## Next Steps

This security guide provides comprehensive protection strategies. To continue:

1. **Learn Performance**: Read [06-performance-guide.md](06-performance-guide.md)
2. **Understand Deployment**: Read [07-deployment-guide.md](07-deployment-guide.md)
3. **Explore Contributing**: Read [08-contributing.md](08-contributing.md)
4. **Advanced Security**: Read [Advanced Security](../advanced/security.md)

For security best practices, see the [Security Reference](../reference/security.md) section.

---

**Need help with security?** Check the [Troubleshooting Guide](../reference/troubleshooting.md) or create an issue on GitHub. 