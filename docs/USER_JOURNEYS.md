# User Journeys and Interactions - Mixture of Experts Analysis

This document outlines the key user journeys and system interactions within Tyaprover (CapRover), analyzed through the lens of four distinct domain experts: The Architect, The Operator, The Security Officer, and The Developer.

## 🏗️ 1. The Architect's Perspective
*Focus: High-level system structure, entry points, and data flow.*

### Core System Structure
The system is built as an Express.js application acting as a central control plane for Docker Swarm. It mediates user intent into Docker commands.

*   **Entry Points**:
    *   **HTTP/REST API**: The primary interface for Web GUI and CLI.
        *   Prefix: `/api/v2/`
        *   Unsecured: Login, Downloads, Public Theme assets.
        *   Secured: User operations (Apps, System, Projects).
    *   **Reverse Proxy**: NetData monitoring dashboard is proxied via `/netdata/`.
    *   **Webhooks**: Git webhooks trigger deployments via `/api/v2/user/apps/webhooks/`.
    *   **MCP Server (AI Agent)**: A new interface for LLM-based control via `mcp-server/`.

### Key Data Flows
1.  **User Request** -> `app.ts` (Global Middleware) -> `UserRouter` (Auth Check) -> Specific Router -> `CaptainManager` / `ServiceManager` -> `DockerApi` -> **Docker Swarm**.
2.  **AI Request** -> `Claude CLI` -> `mcp-server` -> `Tyaprover API` -> **System**.

---

## ⚙️ 2. The Operator's Perspective
*Focus: Day-to-day management, deployment, and scaling.*

### Journey: Application Deployment
1.  **Creation**: Operator registers an app name (`POST /user/apps/register`).
2.  **Configuration**: Sets env vars, persistent volumes, and port mappings (`POST /user/apps/update`).
3.  **Deploy**:
    *   *Method A (Image)*: Updates the service with a specific Docker image (`deployNewApp` tool or UI).
    *   *Method B (Source)*: Uploads a tarball or `captain-definition` file.
    *   *Method C (Git)*: Configures a webhook URL in a git repo to trigger builds on push.

### Journey: App Management
*   **Scaling**: Adjusting instance counts (`POST /user/apps/update` -> `instanceCount`).
*   **Logs**: Viewing logs via `goaccess` integration or API.
*   **One-Click Apps**: Deploying templates from the One-Click library (`/user/oneclick/`).

### Journey: System Maintenance
*   **Backups**: Creating system snapshots (`POST /user/system/createbackup`).
*   **Updates**: Updating the Captain instance itself (`POST /user/system/versionInfo`).
*   **Node Management**: Joining worker nodes to the cluster (`POST /user/system/nodes`).
*   **Disk Cleanup**: Pruning unused Docker images (`POST /user/apps/appDefinitions/deleteImages`).

---

## 🔒 3. The Security Officer's Perspective
*Focus: Authentication, Authorization, Encryption, and Network Security.*

### Journey: Authentication & Authorization
*   **Login Flow**: Users authenticate via `POST /api/v2/login/`. A JWT (or session cookie) is issued.
*   **Middleware Enforcers**:
    *   `Authenticator.ts`: Validates tokens/cookies.
    *   `UserRouter.ts`: Ensures user is initialized and has a namespace.
*   **Change Password**: `POST /user/changepassword/`.

### Journey: SSL & Domains
*   **Root SSL**: Enabling Let's Encrypt for the main dashboard (`POST /user/system/enablessl`).
*   **App SSL**: Enabling SSL for specific apps (`POST /user/apps/appDefinitions/enablebasedomainssl`).
*   **Force SSL**: Enforcing HTTPS redirection globally (`POST /user/system/forcessl`).
*   **Custom Domains**: Mapping external domains and provisioning certs (`POST /user/apps/appDefinitions/customdomain`).

### Security Interactions
*   **NetData Protection**: NetData is protected by Captain's authentication middleware (`Injector.injectUserUsingCookieDataOnly()`).
*   **Webhook Security**: Webhooks allow unauthenticated triggers but often use secrets/hashes (though `WebhooksRouter` is "semi-secured").

---

## 💻 4. The Developer's Perspective
*Focus: Integration, API usage, and AI capabilities.*

### Journey: CI/CD Integration
*   Developers use the **Captain CLI** (npm package) which calls the API endpoints.
*   **Webhooks**: `POST /api/v2/user/apps/webhooks/incoming/` triggers builds from SCM (Github/Gitlab/Bitbucket).

### Journey: AI-Assisted DevOps (New)
*   **Interface**: Claude Code CLI configured with `mcp-config.json`.
*   **Tools**:
    *   `listApps`: Discovery of current state.
    *   `deployNewApp`: Declarative deployment.
    *   `getAppDetails`: Debugging configuration.
    *   `identifyUserJourneys` (Concept): Analyzing app state to suggest next steps.

### Interaction Patterns
*   **Polling**: The frontend polls `/user/system/loadbalancerinfo` and app statuses.
*   **Async Operations**: Deployments are often asynchronous; the API returns immediately, and the build happens in the background (monitored via logs/status).

---

## Summary of Interactions

| Actor | Interface | Key Actions | Secured? |
| :--- | :--- | :--- | :--- |
| **Admin** | Web GUI | Full control (Create, Deploy, Scale, Config) | Yes (JWT/Cookie) |
| **Admin** | Claude CLI | Natural Language Ops via MCP | Yes (API Token) |
| **CI System** | Webhook | Trigger Builds | Semi (Secret/Hash) |
| **Public User** | Public URL | Access Deployed Apps (via Nginx) | App-dependent |
| **Monitoring** | NetData | View Metrics | Yes (Cookie) |
