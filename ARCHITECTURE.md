# Tyaprover Architecture Documentation

This document describes the architecture of Tyaprover, a CapRover fork enhanced with AI capabilities through Model Context Protocol (MCP) integration.

## 🏗 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Tyaprover Ecosystem                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐ │
│  │   Claude CLI    │◄──►│   MCP Server     │◄──►│   Tyaprover     │ │
│  │   (AI Client)   │    │  (Bridge/API)    │    │  (Main App)     │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘ │
│          │                       │                        │         │
│          ▼                       ▼                        ▼         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐ │
│  │ User Interface  │    │ Config & Logging │    │ Docker Engine   │ │
│  │ (Natural Lang.) │    │ (JSON/ENV)       │    │ (Containers)    │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🧩 Component Architecture

### 1. Core Tyaprover Application

**Based on**: CapRover platform
**Purpose**: Container orchestration and web application deployment
**Technology**: Node.js, Express, Docker API

#### Key Components:
- **Web Dashboard**: React-based frontend for traditional management
- **REST API**: HTTP API for programmatic access
- **Docker Integration**: Direct communication with Docker daemon
- **Nginx Proxy**: Automatic reverse proxy configuration
- **SSL Management**: Let's Encrypt integration

#### Directory Structure:
```
src/
├── backend/           # Express.js backend
├── frontend/          # React frontend
├── shared/           # Shared utilities
├── docker/           # Docker-related modules
└── nginx/            # Nginx configuration
```

### 2. MCP Server (AI Bridge)

**Purpose**: Translate natural language commands to Tyaprover API calls
**Technology**: Node.js, TypeScript, MCP SDK
**Location**: `mcp-server/`

#### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Tool       │  │   HTTP       │  │    Configuration     │  │
│  │  Registry    │  │   Client     │  │     Manager         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                  │                     │            │
│         ▼                  ▼                     ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  MCP Tools   │  │  API Client  │  │   Logging System     │  │
│  │ (listApps,   │  │ (fetch,auth) │  │  (structured logs)   │  │
│  │  deployApp)  │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Core Classes:
```typescript
class TyaproverMCPServer {
  constructor()                    // Initialize server
  setupHandlers()                  // Register MCP tools
  makeAPICall(endpoint, options)   // HTTP client
  log(level, message, data)        // Structured logging
  run()                           // Start server
}
```

### 3. Communication Flow

#### Natural Language to Action:
```
1. User Input:     "Deploy a Node.js app called my-api"
2. Claude Processing: Parse intent, extract parameters
3. MCP Tool Call:  tyaprover/deployApp(appName: "my-api", imageName: "node:latest")
4. HTTP Request:   POST /api/v2/user/apps/appData
5. Docker Action:  Create and start container
6. Response:       Success confirmation to user
```

#### Data Flow Diagram:
```
Human ──► Claude CLI ──► MCP Server ──► Tyaprover API ──► Docker Engine
  ▲                         │              │               │
  │                         ▼              ▼               ▼
  └─── Response ◄─── JSON Response ◄─── HTTP 200 ◄─── Container Created
```

## 🔧 Configuration Architecture

### 1. Environment-Based Configuration

```bash
# Runtime Configuration (Environment Variables)
TYAPROVER_API_URL=https://captain.toowired.win
TYAPROVER_AUTH_TOKEN=secret-token
TYAPROVER_NAMESPACE=captain
NODE_ENV=production
LOG_LEVEL=info
API_TIMEOUT=30000
```

### 2. File-Based Configuration

```json
// config.json - Detailed Server Configuration
{
  "server": {
    "name": "tyaprover",
    "version": "0.1.0"
  },
  "api": {
    "baseUrl": "https://captain.toowired.win",
    "version": "v2",
    "timeout": 30000,
    "retries": 3
  },
  "security": {
    "authHeader": "x-captain-auth",
    "validateCerts": true
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": "/var/log/tyaprover/mcp.log"
  }
}
```

### 3. MCP Configuration for Claude CLI

```json
// mcp-config-tyaprover.json
{
  "tyaprover": {
    "command": "node",
    "args": ["/path/to/mcp-server/build/index.js"],
    "cwd": "/path/to/mcp-server",
    "env": {
      "NODE_ENV": "production",
      "TYAPROVER_API_URL": "https://captain.toowired.win",
      "TYAPROVER_NAMESPACE": "captain"
    }
  }
}
```

## 🔌 API Architecture

### 1. MCP Protocol Integration

```typescript
// MCP Tool Definition
interface MCPTool {
  name: string;                    // e.g., "tyaprover/listApps"
  description: string;             // Human-readable description
  inputSchema: JSONSchema;         // Parameter validation schema
  handler: (params) => Promise<Response>;  // Implementation
}
```

### 2. HTTP API Layer

```typescript
// API Client Architecture
class APIClient {
  baseURL: string;
  timeout: number;
  authToken: string;

  async makeRequest(endpoint: string, options: RequestOptions): Promise<Response> {
    // Add authentication headers
    // Handle timeouts and retries
    // Parse JSON responses
    // Log requests and responses
  }
}
```

### 3. Error Handling Strategy

```typescript
// Structured Error Response
interface ErrorResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError: true;
  errorCode?: string;
  details?: any;
}
```

## 🔐 Security Architecture

### 1. Authentication Flow

```
Claude CLI ──► MCP Server ──► Tyaprover API
     │             │               │
     │             ▼               ▼
     │      [Auth Token]    [x-captain-auth]
     │         (env var)        (HTTP header)
     │             │               │
     └─────────────┴───────────────┘
              Secure Token Chain
```

### 2. Security Layers

1. **Environment Isolation**: Separate configs for dev/staging/prod
2. **Token Security**: Auth tokens stored in environment variables
3. **Network Security**: Internal communication over localhost
4. **SSL/TLS**: HTTPS for all external API communication
5. **Input Validation**: JSON schema validation for all inputs

### 3. Security Best Practices

```typescript
// Security Implementations
class SecurityManager {
  validateAuthToken(token: string): boolean
  sanitizeInput(input: any): any
  logSecurityEvent(event: SecurityEvent): void
  checkRateLimit(clientId: string): boolean
}
```

## 📊 Monitoring and Observability

### 1. Logging Architecture

```typescript
interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  component: 'mcp-server' | 'api-client' | 'tool-handler';
  data?: any;
  requestId?: string;
}
```

### 2. Metrics Collection

```typescript
interface Metrics {
  api_requests_total: Counter;
  api_request_duration: Histogram;
  mcp_tool_calls_total: Counter;
  active_deployments: Gauge;
  error_rate: Rate;
}
```

### 3. Health Monitoring

```typescript
interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  details?: any;
}
```

## 🚀 Deployment Architecture

### 1. Development Environment

```yaml
# docker-compose.yml
version: '3.8'
services:
  tyaprover:
    build: .
    ports:
      - "7474:7474"
    environment:
      - NODE_ENV=development
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  mcp-server:
    build: ./mcp-server
    environment:
      - TYAPROVER_API_URL=http://tyaprover:7474
      - NODE_ENV=development
    depends_on:
      - tyaprover
```

### 2. Production Deployment

```bash
# PM2 Ecosystem
module.exports = {
  apps: [
    {
      name: 'tyaprover-main',
      script: './built/app.js',
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'tyaprover-mcp',
      script: './build/index.js',
      cwd: './mcp-server',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
```

### 3. Scaling Strategy

```
Load Balancer (Nginx)
         │
    ┌────┴────┐
    ▼         ▼
Tyaprover   Tyaprover
Instance 1  Instance 2
    │         │
    └────┬────┘
         ▼
   Shared Docker
      Engine
```

## 🔄 Data Flow Patterns

### 1. Application Deployment Flow

```
User Command ──► Natural Language Processing ──► Parameter Extraction
     │                                               │
     ▼                                               ▼
AI Understanding ──► MCP Tool Selection ──► API Parameter Mapping
     │                                               │
     ▼                                               ▼
HTTP Request ──► Authentication ──► Docker API Call
     │                                               │
     ▼                                               ▼
Container Creation ──► Health Check ──► Status Response
     │                                               │
     ▼                                               ▼
User Confirmation ◄── Success Message ◄── Deployment Complete
```

### 2. Error Handling Flow

```
Error Occurs ──► Error Detection ──► Error Classification
     │                                    │
     ▼                                    ▼
Logging ──► User Notification ──► Recovery Suggestion
     │                                    │
     ▼                                    ▼
Monitoring Alert ──► Admin Notification ──► Manual Intervention
```

## 🧪 Testing Architecture

### 1. Test Pyramid

```
┌─────────────────────────────────────┐
│            E2E Tests                │  ← AI Integration Tests
├─────────────────────────────────────┤
│        Integration Tests            │  ← API Communication Tests
├─────────────────────────────────────┤
│           Unit Tests                │  ← Component Logic Tests
└─────────────────────────────────────┘
```

### 2. Test Structure

```typescript
// MCP Server Tests
describe('TyaproverMCPServer', () => {
  describe('Tool Registration', () => {
    test('should register all tools correctly')
    test('should validate tool schemas')
  })

  describe('API Communication', () => {
    test('should authenticate correctly')
    test('should handle API errors')
  })

  describe('AI Integration', () => {
    test('should process natural language commands')
    test('should return structured responses')
  })
})
```

## 🔮 Future Architecture Considerations

### 1. Planned Enhancements

- **Multi-tenant Support**: Separate MCP servers per organization
- **Plugin Architecture**: Extensible tool system
- **Event-driven Architecture**: WebSocket-based real-time updates
- **Microservices Split**: Separate API and deployment services

### 2. Scalability Roadmap

```
Current: Monolithic + MCP Server
    ↓
Phase 1: Microservices Split
    ↓
Phase 2: Event-Driven Architecture
    ↓
Phase 3: Multi-Region Deployment
```

### 3. Technology Evolution

```typescript
// Future Architecture Vision
interface FutureTyaprover {
  ai: {
    providers: Array<'claude' | 'gpt' | 'gemini'>;
    capabilities: Array<'deployment' | 'monitoring' | 'optimization'>;
  };
  infrastructure: {
    kubernetes: boolean;
    serverless: boolean;
    edge: boolean;
  };
  integrations: {
    ci_cd: Array<'github' | 'gitlab' | 'jenkins'>;
    monitoring: Array<'prometheus' | 'datadog' | 'newrelic'>;
  };
}
```

## 📚 References

- [CapRover Documentation](https://caprover.com/docs/)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Claude Code CLI Documentation](https://github.com/anthropics/claude-cli)
- [Docker API Reference](https://docs.docker.com/engine/api/)

---

<!-- Generated by Copilot -->
