# Tyaprover Roadmap: Improvements, Enhancements, and Capabilities

This document outlines a strategic roadmap for the evolution of Tyaprover, focusing on modernizing the codebase, deepening the AI integration, and expanding the platform's capabilities.

## 5 Improvements (Code Quality & Architecture)

1.  **Monorepo Workspace Migration**
    *   **Context:** Currently, `mcp-server` is a nested directory with its own `package.json`, managed independently.
    *   **Proposal:** Convert the repository into a proper Monorepo using `npm workspaces` or `pnpm`. This allows for shared dependencies (e.g., shared types between the main app and MCP server), unified build processes, and simpler developer onboarding.
    *   **Benefit:** Reduced code duplication, consistent dependency versions, and streamlined CI/CD.

2.  **Unified & Strict Error Handling**
    *   **Context:** Error handling in `src` often relies on `console.error` or ad-hoc `res.status().send()`.
    *   **Proposal:** Implement a centralized error handling middleware in the Express application. Introduce a typed `AppError` class hierarchy. Ensure the MCP server also propagates errors with structured details that the AI can interpret (e.g., "Missing Parameter" vs "System Error").
    *   **Benefit:** More reliable debugging and better feedback for the AI assistant when things go wrong.

3.  **Comprehensive API Documentation (OpenAPI/Swagger)**
    *   **Context:** The API is implicitly defined by the routes.
    *   **Proposal:** Generate an OpenAPI v3 specification for the Tyaprover REST API.
    *   **Benefit:** Allows the MCP server (and other clients) to be auto-generated or strictly typed against the API schema. It also enables the AI to "read" the API docs dynamically to understand new capabilities without code changes.

4.  **Structured Logging (Winston/Pino)**
    *   **Context:** The application currently uses a basic `Logger` class wrapping `console.log`.
    *   **Proposal:** Replace the logging system with a structured logger like `pino` or `winston`. Include request IDs, timestamps, and log levels.
    *   **Benefit:** Enables better observability, log parsing, and integration with monitoring tools (which the AI can then query).

5.  **Multi-Stage Docker Builds & Image Optimization**
    *   **Context:** Review existing Dockerfiles for size and security.
    *   **Proposal:** Ensure all internal services (including the new MCP server) use multi-stage builds to minimize the final image size. implementations. Scan for vulnerabilities in base images.
    *   **Benefit:** Faster deployments, reduced bandwidth, and improved security posture.

## 5 Enhancements (Upgrading Existing Features)

1.  **Interactive MCP Log Retrieval (`getAppLogs`)**
    *   **Current:** The AI can see app status but not what's happening inside.
    *   **Enhancement:** Add a `tyaprover/getAppLogs` tool to the MCP server. Allow filtering by number of lines or timestamps.
    *   **Impact:** Enables "Conversational Debugging" — e.g., "Why is my API crashing?" -> AI fetches logs, analyzes the stack trace, and suggests a fix.

2.  **Smart Deployment Progress Streaming**
    *   **Current:** `deployNewApp` triggers a deployment and returns.
    *   **Enhancement:** Implement a mechanism (possibly via MCP notification or polling helper) to report the *live* progress of the build and deployment.
    *   **Impact:** Prevents the "It's stuck" feeling. The AI can report "Building... (50%)", "Pushing image...", "Service starting...".

3.  **App Restart & Maintenance Tools**
    *   **Current:** Basic CRUD.
    *   **Enhancement:** Add `restartApp`, `rebuildApp`, and `stopApp` tools to the MCP server.
    *   **Impact:** Allows the AI to perform routine maintenance or recovery actions defined in the "Operator" user journey.

4.  **Environment Variable Schema Validation**
    *   **Current:** AI sets env vars as simple key-value pairs.
    *   **Enhancement:** Allow defining a "schema" for apps (e.g., in a `captain-definition` file). When the AI sets variables, validate them (e.g., "PORT must be a number").
    *   **Impact:** Reduces configuration errors caused by AI hallucinations or typos.

5.  **Rich MCP Tool Feedback**
    *   **Current:** Tools return simple text/JSON.
    *   **Enhancement:** Format tool outputs to be highly optimized for LLM consumption. Include "Hints" in the output (e.g., "Deployment successful. You might want to check the logs now.").
    *   **Impact:** Guides the AI agent toward the next logical step, improving the "flow" of the conversation.

## 5 Additional Capabilities (New Features)

1.  **AI-Driven Database Provisioning**
    *   **Concept:** First-class support for requesting databases.
    *   **Workflow:** "I need a Postgres DB." -> Tyaprover creates a volume, deploys a secure Postgres container, generates a random password, and returns the internal connection string (or automatically injects it into a linked app).

2.  **"Self-Healing" Autonomous Agent**
    *   **Concept:** A background worker that uses the MCP server.
    *   **Workflow:** The system detects a crashing container -> The Agent reads the logs -> Identifies "Out of Memory" -> Automatically scales up RAM -> Notifies the user.

3.  **GitOps Integration via AI**
    *   **Concept:** Bridge the gap between chat and git.
    *   **Workflow:** "Deploy this repo." -> AI generates a deploy key, adds it to the GitHub repo (via GitHub MCP), and configures the Tyaprover webhook.

4.  **Cost & Resource Estimation**
    *   **Concept:** Pre-deployment analysis.
    *   **Workflow:** User asks "Can I deploy a Minecraft server?" -> AI analyzes available node resources (RAM/CPU) vs. the requirements of the image -> Advises "Yes, but you'll need to stop 'test-app' first to free up RAM."

5.  **Blue/Green Deployment Orchestration**
    *   **Concept:** Zero-downtime updates managed by AI.
    *   **Workflow:** "Update my production app safely." -> AI deploys the new version as a separate service -> Waits for health checks -> Switches the Nginx router -> Scales down the old version.
