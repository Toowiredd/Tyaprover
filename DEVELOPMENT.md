# Tyaprover Development Guide

This guide covers development setup, coding standards, and contribution workflows for Tyaprover.

## 🚀 Quick Development Setup

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- Claude Code CLI (for testing AI integration)

### Initial Setup
```bash
# Clone repository
git clone https://github.com/yourusername/tyaprover.git
cd tyaprover

# Install main dependencies
npm install

# Setup MCP server
cd mcp-server
npm install
npm run build
cd ..

# Start development environment
docker-compose up -d
```

### Development Workflow
```bash
# Start development servers
npm run dev                    # Main Tyaprover app
cd mcp-server && npm run dev   # MCP server with hot reload

# Run tests
npm test                       # Main app tests
cd mcp-server && npm test      # MCP server tests

# Lint code
npm run lint                   # Main app linting
cd mcp-server && npm run lint  # MCP server linting
```

## 🏗 Project Structure

```
tyaprover/
├── src/                       # Main Tyaprover application
│   ├── backend/              # Express.js backend
│   ├── frontend/             # React frontend
│   ├── shared/               # Shared utilities
│   └── docker/               # Docker integration
├── mcp-server/               # MCP server for AI integration
│   ├── src/                  # TypeScript source
│   │   ├── index.ts         # Main server file
│   │   ├── tools/           # MCP tool implementations
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── build/                # Compiled JavaScript
│   ├── tests/                # Test files
│   └── config.json           # Server configuration
├── docs/                     # Documentation
├── tests/                    # Integration tests
├── docker-compose.yml        # Development environment
└── deploy-tyaprover.sh      # Deployment script
```

## 🛠 Development Environment

### Docker Compose Development Stack

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  tyaprover:
    build:
      context: .
      dockerfile: dockerfile-captain.dev
    ports:
      - "7474:7474"
    environment:
      - NODE_ENV=development
      - DEBUG=tyaprover:*
    volumes:
      - .:/app
      - /var/run/docker.sock:/var/run/docker.sock
    command: npm run dev

  mcp-server:
    build:
      context: ./mcp-server
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - TYAPROVER_API_URL=http://tyaprover:7474
      - LOG_LEVEL=debug
    volumes:
      - ./mcp-server:/app
    command: npm run dev
    depends_on:
      - tyaprover

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: tyaprover_dev
      POSTGRES_USER: tyaprover
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Environment Configuration

```bash
# .env.development
NODE_ENV=development
DEBUG=tyaprover:*

# Main app
PORT=7474
DATABASE_URL=postgresql://tyaprover:dev_password@localhost:5432/tyaprover_dev

# MCP server
TYAPROVER_API_URL=http://localhost:7474
TYAPROVER_AUTH_TOKEN=dev-token-12345
TYAPROVER_NAMESPACE=captain
LOG_LEVEL=debug
API_TIMEOUT=10000
```

## 🧪 Testing Framework

### Unit Testing Setup

```javascript
// jest.config.js (main app)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

```javascript
// jest.config.js (MCP server)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
```

### Test Structure

```typescript
// tests/setup.ts
import { TyaproverMCPServer } from '../src';

// Mock environment variables
process.env.TYAPROVER_API_URL = 'http://localhost:7474';
process.env.TYAPROVER_AUTH_TOKEN = 'test-token';
process.env.NODE_ENV = 'test';

// Global test helpers
global.createTestServer = () => new TyaproverMCPServer();
global.mockApiResponse = (data: any) => {
  // Mock implementation
};
```

### Example Test Cases

```typescript
// src/tools/__tests__/listApps.test.ts
import { TyaproverMCPServer } from '../../index';

describe('listApps tool', () => {
  let server: TyaproverMCPServer;

  beforeEach(() => {
    server = new TyaproverMCPServer();
  });

  test('should return list of applications', async () => {
    // Mock API response
    const mockApps = [
      { appName: 'test-app', status: 'running' }
    ];

    jest.spyOn(server, 'makeAPICall').mockResolvedValue({
      data: mockApps
    });

    const result = await server.handleListApps({});

    expect(result.content[0].text).toContain('test-app');
  });

  test('should handle API errors gracefully', async () => {
    jest.spyOn(server, 'makeAPICall').mockRejectedValue(
      new Error('API Error')
    );

    const result = await server.handleListApps({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error listing apps');
  });
});
```

### Integration Testing

```typescript
// tests/integration/mcp-integration.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('MCP Integration', () => {
  test('should start MCP server successfully', async () => {
    const { stdout, stderr } = await execAsync(
      'node build/index.js',
      { cwd: './mcp-server', timeout: 5000 }
    );

    expect(stderr).toContain('Tyaprover MCP server running');
  });

  test('should respond to MCP protocol messages', async () => {
    // Test MCP protocol communication
    // This would require a mock MCP client
  });
});
```

## 🎨 Coding Standards

### TypeScript Configuration

```json
// tsconfig.json (MCP server)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "tests"]
}
```

### ESLint Configuration

```javascript
// .eslintrc.js (MCP server)
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    // Tyaprover-specific rules
    'prefer-const': 'error',
    'no-var': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',

    // Comment requirement
    'spaced-comment': ['error', 'always', {
      'markers': ['Generated by Copilot']
    }]
  }
};
```

### Code Style Guidelines

```typescript
// Example: Proper code structure with required comment
/**
 * Deploy a new application to Tyaprover
 * Generated by Copilot
 */
async function deployApplication(
  appName: string,
  imageName: string
): Promise<DeploymentResult> {
  // Validate inputs
  if (!appName || !imageName) {
    throw new Error('App name and image name are required');
  }

  // Log deployment attempt
  this.log('info', 'Starting deployment', { appName, imageName });

  try {
    // Make API call
    const response = await this.makeAPICall('/user/apps/appData', {
      method: 'POST',
      body: JSON.stringify({ appName, imageName })
    });

    // Return success result
    return {
      success: true,
      message: `Successfully deployed ${appName}`,
      data: response.data
    };
  } catch (error) {
    // Handle and log error
    this.log('error', 'Deployment failed', {
      appName,
      imageName,
      error: error.message
    });
    throw error;
  }
}
```

### Documentation Standards

```typescript
/**
 * Interface for MCP tool responses
 * Generated by Copilot
 */
interface MCPResponse {
  /** Array of content blocks to return to the user */
  content: Array<{
    type: 'text';
    text: string;
  }>;
  /** Whether this response represents an error */
  isError?: boolean;
  /** Optional error code for programmatic handling */
  errorCode?: string;
}

/**
 * Configuration options for API calls
 * Generated by Copilot
 */
interface APIOptions {
  /** HTTP method (GET, POST, PUT, DELETE) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request body for POST/PUT requests */
  body?: string;
  /** Additional headers to include */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}
```

## 🔧 Development Tools

### VS Code Configuration

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/build": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/build": true
  }
}
```

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/mcp-server/src/index.ts",
      "outFiles": ["${workspaceFolder}/mcp-server/build/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "TYAPROVER_API_URL": "http://localhost:7474",
        "LOG_LEVEL": "debug"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Git Hooks Setup

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# Run linting
npm run lint || exit 1
cd mcp-server && npm run lint || exit 1
cd ..

# Run tests
npm test || exit 1
cd mcp-server && npm test || exit 1
cd ..

# Check TypeScript compilation
cd mcp-server && npm run build || exit 1
cd ..

echo "All pre-commit checks passed!"
```

## 🚢 Deployment Process

### Build Process

```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "Building Tyaprover..."

# Build main application
npm run build

# Build MCP server
cd mcp-server
npm install --production
npm run build
cd ..

# Create deployment package
tar -czf tyaprover-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=tests \
  .

echo "Build completed successfully!"
```

### Release Process

```bash
#!/bin/bash
# scripts/release.sh

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Update version in package.json files
npm version $VERSION --no-git-tag-version
cd mcp-server && npm version $VERSION --no-git-tag-version && cd ..

# Build and test
npm run build
npm test
cd mcp-server && npm run build && npm test && cd ..

# Commit and tag
git add .
git commit -m "Release version $VERSION

- Updated version numbers
- Built and tested release
- Generated by Copilot"

git tag -a "v$VERSION" -m "Version $VERSION"

echo "Release $VERSION ready for deployment!"
```

## 🐛 Debugging Guidelines

### Debugging MCP Server

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Add breakpoints in VS Code
debugger; // This will trigger VS Code debugger

// Manual logging for complex issues
console.error(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'debug',
  message: 'Debug checkpoint',
  data: { variable1, variable2 }
}, null, 2));
```

### Common Issues and Solutions

1. **Authentication Failures**
   ```bash
   # Check token validity
   curl -H "x-captain-auth: $TYAPROVER_AUTH_TOKEN" \
        $TYAPROVER_API_URL/api/v2/user/system/info
   ```

2. **MCP Communication Issues**
   ```bash
   # Test MCP server directly
   echo '{"method":"tools/list"}' | node build/index.js
   ```

3. **Build Failures**
   ```bash
   # Clean build
   rm -rf build node_modules
   npm install
   npm run build
   ```

## 🤝 Contributing Guidelines

### Pull Request Process

1. **Fork and Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Development**
   - Follow coding standards
   - Add tests for new features
   - Update documentation
   - Include "Generated by Copilot" comments

3. **Testing**
   ```bash
   npm test
   cd mcp-server && npm test
   ```

4. **Commit**
   ```bash
   git commit -m "Add feature: your feature description

   - Detailed change description
   - Any breaking changes noted
   - Generated by Copilot"
   ```

5. **Pull Request**
   - Provide clear description
   - Link related issues
   - Include testing instructions

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes without version bump
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] "Generated by Copilot" comments included

## 📚 Additional Resources

- [CapRover Development Docs](https://caprover.com/docs/development/)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [TypeScript Best Practices](https://typescript-eslint.io/docs/)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-6-testing-and-overall-quality-practices)

---

<!-- Generated by Copilot -->
