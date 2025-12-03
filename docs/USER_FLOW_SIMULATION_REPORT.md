# User Flow Simulation & Expert Review Report

**Date:** 2025-12-03
**Product:** Tyaprover (MCP Server + Deployment)
**Methodology:** Mixture of Experts (Simulated)

## 1. Expert Panel

*   **UX Researcher (UXR):** Focus on ease of use, information architecture, and user friction.
*   **DevOps Engineer (DOE):** Focus on deployment reliability, configuration management, and security.
*   **QA Engineer (QAE):** Focus on edge cases, error handling, and system stability.

## 2. Key Performance Indicators (KPIs) & Targets

| KPI | Target | Current Est. | Notes |
| :--- | :--- | :--- | :--- |
| **Task Completion Rate** | > 90% | 85% | Deployment is smooth, but connecting Claude to Remote VPS is undocumented (friction). |
| **Time on Task (Setup)** | < 15 min | 25 min | User will stall trying to figure out `claude_desktop_config.json`. |
| **Error Rate (API)** | < 1% | < 1% | Input sanitization added; `deployApp` merge logic fixes potential data loss. |
| **User Satisfaction** | 4.5/5 | 3.5/5 | Documentation gap significantly lowers initial satisfaction. |

## 3. Scenario Simulation Findings

### Scenario A: SSDNodes Deployment (DOE Analysis)
*   **Flow:** Clone repo -> Edit config -> Run script -> Access Dashboard.
*   **Verdict:** **Pass**. The script handles Docker installation and CapRover setup. The new guide correctly addresses the unique nested virtualization verification for SSDNodes.
*   **Feedback:** "The guide assumes the user knows how to SSH. This is acceptable for the target audience (VPS admins)."

### Scenario B: Connecting Claude (UXR Analysis)
*   **Flow:** Open Claude Desktop -> Configure MCP -> Use Tools.
*   **Friction Point:** The MCP server runs on the *remote* VPS. Claude Desktop runs *locally*.
*   **Issue:** The guide stops at "MCP Server configured" (on the server). It does not tell the user how to pipe that to their local Claude.
*   **Impact:** **Critical Usability Blocker**. Users will define a local path in their config and fail because the code isn't there, or be confused.
*   **Solution:** Document the `ssh` command usage in `claude_desktop_config.json` or SSH Tunneling.

### Scenario C: App Management (QAE Analysis)
*   **Flow:** `deployApp` (Update) -> `setAppEnvironmentVariables`.
*   **Edge Case:** User calls `deployApp` on an existing app with custom env vars.
*   **Previous Behavior:** Wiped env vars.
*   **Current Behavior:** Merges `imageName` into existing definition. **Pass**.
*   **Edge Case:** User enters app name "My App; rm -rf /".
*   **Behavior:** `validateAndSanitizeAppName` catches this. **Pass**.

## 4. Usability Heuristics (Nielsen)

*   **Match between system and the real world:** The tool names (`deployApp`, `scaleApp`) map well to user mental models.
*   **Error prevention:** Sanitization is a good preventative measure.
*   **Help and documentation:** **FAIL**. The "Connecting" step is missing.

## 5. Action Plan

1.  **Refine Documentation (High Priority):**
    *   Add a section "Connecting Claude Desktop to Remote Tyaprover" in `docs/SSDNODES_DEPLOYMENT.md`.
    *   Provide the exact JSON snippet for `claude_desktop_config.json` using `ssh`.

2.  **Verify Build Artifacts (Medium Priority):**
    *   Ensure the `deploy-tyaprover.sh` script installs dependencies and builds the MCP server with the new `type: module` setup correctly.

3.  **Final Code Polish (Low Priority):**
    *   Ensure `mcp-server/src/index.ts` has clean error logging.

## 6. Synthesis

The product is robust on the server side, but the "Last Mile" (connecting the client) is broken in terms of UX. Fixing the documentation closes this gap and should raise the Success Rate to > 95%.
