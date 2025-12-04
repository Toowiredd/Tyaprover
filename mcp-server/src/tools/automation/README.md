# Citizen Developer Automation Tools

**Total Tools**: 10
**Target Audience**: Non-technical users, business users, citizen developers
**Goal**: Simplify complex DevOps tasks into single-command operations

## Overview

These tools abstract away the complexity of container orchestration, providing **high-level, business-friendly interfaces** for common deployment and management tasks.

## Philosophy

**Before (Technical Approach)**:
```bash
# Deploy WordPress = 15+ commands
1. Register app
2. Configure MySQL
3. Create database
4. Set environment variables
5. Deploy WordPress
6. Configure volumes
7. Enable SSL
8. Set custom domain
9. Configure backups
... and more
```

**After (Citizen Developer Approach)**:
```typescript
// Deploy WordPress = 1 command
oneClickWordPress({
    siteName: "myblog",
    customDomain: "blog.example.com"
})
// Done! WordPress running with MySQL, SSL, custom domain
```

## Tool Catalog

### 1. quickDeployWebsite

**Purpose**: Deploy a simple website (static or dockerized) with one command
**Target Use Case**: Landing pages, portfolios, marketing sites
**Auto-Configures**: SSL, port 80, custom domain

**Example**:
```typescript
quickDeployWebsite({
    websiteName: "mysite",
    dockerImage: "nginx:latest",
    customDomain: "www.example.com"
})
```

**Result**:
- App deployed and running
- SSL certificate auto-issued
- Custom domain configured
- HTTPS enforced
- Access at: https://www.example.com

---

### 2. deployFullStackApp

**Purpose**: Deploy complete 3-tier application (frontend + backend + database)
**Target Use Case**: Web applications, SaaS products, internal tools
**Auto-Configures**: Database with credentials, inter-service networking, environment variables

**Example**:
```typescript
deployFullStackApp({
    appName: "myapp",
    frontendImage: "myorg/frontend:latest",
    backendImage: "myorg/backend:latest",
    database: "postgres"
})
```

**Result**:
- PostgreSQL database deployed with secure password
- Backend API deployed with DATABASE_URL configured
- Frontend deployed with API_URL configured
- All services networked together
- Credentials provided for database access

---

### 3. createDevEnvironment

**Purpose**: Spin up a complete cloud IDE with database and cache
**Target Use Case**: Remote development, team collaboration, quick prototyping
**Auto-Configures**: Code-server (VS Code in browser), database, Redis cache

**Example**:
```typescript
createDevEnvironment({
    envName: "mydev",
    language: "node",
    includeDatabase: true,
    includeRedis: true
})
```

**Result**:
- Code-server running (VS Code in browser)
- PostgreSQL database available
- Redis cache available
- All services pre-connected
- Access dev environment from any browser

---

### 4. deployFromGitHub

**Purpose**: Deploy app directly from GitHub repository
**Target Use Case**: Open-source projects, GitHub-hosted code
**Auto-Configures**: Git integration, auto-deploy on push, Dockerfile detection

**Example**:
```typescript
deployFromGitHub({
    appName: "myapp",
    githubRepo: "owner/repo",
    branch: "main",
    port: 3000
})
```

**Result**:
- App configured to pull from GitHub
- Auto-deploy enabled (push = deploy)
- Webhook ready for setup
- Port and environment configured

---

### 5. scaleAppAutomatically

**Purpose**: Auto-scale apps based on time-based rules (business hours, etc.)
**Target Use Case**: Cost optimization, traffic patterns, business cycles
**Auto-Configures**: Instance scaling based on simple rules

**Example**:
```typescript
scaleAppAutomatically({
    appName: "myapp",
    rule: "business-hours",
    businessHoursInstances: 3,
    offHoursInstances: 1
})
```

**Result**:
- App scales to 3 instances during business hours (9am-5pm weekdays)
- App scales to 1 instance during off-hours
- Reduces costs by ~70% during off-peak
- Run hourly via cron for automatic scaling

---

### 6. createBackupSchedule

**Purpose**: Set up automatic backups (daily/weekly/monthly)
**Target Use Case**: Disaster recovery, compliance, data protection
**Auto-Configures**: Backup creation, schedule recommendations

**Example**:
```typescript
createBackupSchedule({
    schedule: "daily",
    includeApps: ["myapp", "mydb"]
})
```

**Result**:
- Backup created immediately
- Cron schedule provided for automation
- Backup token saved
- Recommendations for off-server storage

---

### 7. healthCheck

**Purpose**: Comprehensive system and app health check in one command
**Target Use Case**: Monitoring, troubleshooting, proactive maintenance
**Auto-Analyzes**: System status, app health, SSL status, common issues

**Example**:
```typescript
healthCheck()
```

**Result**:
- System health: ✓ HEALTHY or ⚠ NEEDS ATTENTION
- Apps running vs stopped
- SSL issues detected
- Recommendations provided
- Issues prioritized

---

### 8. cloneApp

**Purpose**: Clone existing app with all configuration (staging, testing)
**Target Use Case**: Creating staging environments, A/B testing, backups
**Auto-Configures**: Duplicate configuration, separate volumes

**Example**:
```typescript
cloneApp({
    sourceApp: "myapp-prod",
    newAppName: "myapp-staging",
    includeData: false
})
```

**Result**:
- New app created with identical configuration
- Environment variables cloned
- Volumes created (data not copied for safety)
- Separate custom domain (not cloned)
- Ready for independent testing

---

### 9. oneClickWordPress

**Purpose**: Deploy complete WordPress site with MySQL in one command
**Target Use Case**: Blogs, content sites, marketing pages
**Auto-Configures**: WordPress, MySQL, database connection, SSL

**Example**:
```typescript
oneClickWordPress({
    siteName: "myblog",
    customDomain: "blog.example.com",
    adminEmail: "admin@example.com"
})
```

**Result**:
- WordPress deployed and running
- MySQL database configured
- Database credentials auto-generated
- Custom domain with SSL enabled
- WordPress admin URL provided
- Ready for setup wizard

---

### 10. deployMinecraftServer

**Purpose**: Deploy Minecraft (Java Edition) server for gaming
**Target Use Case**: Gaming servers, educational Minecraft projects
**Auto-Configures**: Minecraft server, world persistence, EULA acceptance

**Example**:
```typescript
deployMinecraftServer({
    serverName: "myserver",
    version: "1.20.1",
    maxPlayers: 20,
    difficulty: "normal",
    gameMode: "survival"
})
```

**Result**:
- Minecraft server deployed
- World data persisted to volume
- Server configuration ready
- Connection info provided
- Port 25565 exposed

---

## Design Principles

### 1. **Single Command Complexity**

Each tool encapsulates multiple technical steps into one high-level operation.

**Example**: `deployFullStackApp` internally:
- Registers 3 apps
- Deploys database with persistence
- Generates secure credentials
- Configures environment variables
- Sets up inter-service networking
- Provides connection strings

User just says: "Deploy my full-stack app" → Done.

### 2. **Sensible Defaults**

Every tool has smart defaults for non-technical users:
- Port 80 for web apps
- Port 3000 for APIs
- PostgreSQL for databases (most popular)
- 1 instance for cost efficiency
- SSL enabled by default
- Secure random passwords

### 3. **Clear Output**

Every tool returns:
- ✓ Success confirmation
- Access URLs
- Credentials (when applicable)
- Next steps
- Important warnings

**No jargon, no technical details unless necessary.**

### 4. **Safety First**

- Never delete data without explicit confirmation
- Generate secure passwords automatically
- Enable SSL by default
- Provide rollback instructions
- Warn about security implications

### 5. **Business Language**

Tools use **business terms**, not technical jargon:
- "Deploy website" (not "register app + configure nginx")
- "Create dev environment" (not "deploy code-server container")
- "Health check" (not "query system metrics API")

## Use Cases

### Scenario 1: **Non-Technical Founder**

**Goal**: Launch a SaaS product without DevOps knowledge

**Tools Used**:
1. `deployFullStackApp` → Deploy React + Node.js + Postgres
2. `quickDeployWebsite` → Deploy marketing landing page
3. `createBackupSchedule` → Daily backups
4. `healthCheck` → Daily monitoring

**Result**: Full production stack running in <5 minutes

---

### Scenario 2: **Marketing Team**

**Goal**: Launch WordPress blog for content marketing

**Tools Used**:
1. `oneClickWordPress` → Blog deployed with MySQL
2. `cloneApp` → Create staging environment for testing

**Result**: Production blog + staging environment, no IT support needed

---

### Scenario 3: **Educator/Gaming Community**

**Goal**: Host Minecraft server for students/community

**Tools Used**:
1. `deployMinecraftServer` → Server deployed
2. `createBackupSchedule` → Weekly world backups
3. `scaleAppAutomatically` → Scale up during peak hours

**Result**: Minecraft server with auto-scaling and backups

---

### Scenario 4: **Developer Testing**

**Goal**: Quick environment for testing new features

**Tools Used**:
1. `createDevEnvironment` → Cloud IDE with database
2. `deployFromGitHub` → Deploy test branch
3. `cloneApp` → Clone production for A/B testing

**Result**: Complete testing environment in <2 minutes

---

## Comparison: Technical vs Citizen Developer

| Task | Technical Approach | Citizen Developer Approach |
|------|-------------------|---------------------------|
| Deploy WordPress | 15+ API calls, manual config | `oneClickWordPress()` |
| Full-stack app | 20+ steps, networking setup | `deployFullStackApp()` |
| Auto-scaling | Cron + scripts + monitoring | `scaleAppAutomatically()` |
| Backups | Manual scripting + storage | `createBackupSchedule()` |
| Health monitoring | Custom dashboards + alerts | `healthCheck()` |

**Time savings**: 80-90% reduction in deployment time
**Error reduction**: Automated configuration eliminates human errors
**Accessibility**: Non-technical users can deploy production apps

## Integration with Existing Tools

These automation tools **build on top of** the 57 existing MCP tools:

```
Automation Tools (Layer 3)
      ↓ orchestrates
Core MCP Tools (Layer 2)
      ↓ calls
CapRover API (Layer 1)
```

**Example**: `deployFullStackApp` internally calls:
- `registerApp` (3 times)
- `deployApp` (3 times)
- `setAppEnvironmentVariables` (2 times)
- `deployDatabase` (1 time)

**Benefit**: Reusable components, tested building blocks

## Future Enhancements

### Planned Additions

1. **oneClickNextJS** - Deploy Next.js app with database
2. **deployEcommerce** - Full e-commerce stack (Stripe + database)
3. **createStagingEnvironment** - Clone prod → staging with data anonymization
4. **deployMobileBackend** - Firebase alternative (auth + database + storage)
5. **oneClickAnalytics** - Deploy Matomo/Plausible analytics
6. **deployCI/CD** - Jenkins/GitLab CI setup
7. **createMultitenantApp** - Deploy multi-tenant SaaS architecture
8. **deploySocketIOServer** - Real-time communication server
9. **oneClickMailServer** - Email server (Postfix + Dovecot)
10. **deployVideoStreaming** - Video streaming server (Jitsi/OwnCast)

### Workflow Templates

Future enhancement: Pre-built workflows for common business needs:

```typescript
// Workflow: Launch SaaS Product
launchSaaSProduct({
    name: "myproduct",
    stack: "react-node-postgres",
    features: ["auth", "payments", "email", "analytics"]
})

// Internally orchestrates:
// 1. deployFullStackApp
// 2. Enable auth (JWT)
// 3. Stripe integration
// 4. Email service (SendGrid)
// 5. Analytics (Matomo)
// 6. Backup schedule
// 7. Health monitoring
```

## Contributing

When adding new automation tools:

1. **Target a specific user persona** (marketer, educator, gamer, etc.)
2. **Abstract complexity** - hide technical details
3. **Use business language** - avoid jargon
4. **Provide clear output** - URLs, credentials, next steps
5. **Safe defaults** - SSL on, secure passwords, minimal instances
6. **One-command goal** - entire workflow in one tool call

## Naming Convention

- **Verb-Noun pattern**: `deployFullStackApp`, `createDevEnvironment`
- **Business-friendly names**: `quickDeploy`, `oneClick`, `healthCheck`
- **Descriptive**: Name should explain what it does in plain English

---

**Total Tools**: 67 (57 core + 10 automation)
**Code Reduction**: ~90% for common tasks
**Target Users**: Non-technical founders, marketers, educators, small teams
**Philosophy**: DevOps for humans, not just engineers
