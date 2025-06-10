// mcp-server/jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Handle module aliases if any, though not strictly needed for this simple setup yet
  },
  // Since package.json has "type": "module", Jest needs experimental ESM support
  // or specific configuration if facing issues with ES module imports.
  // For ts-jest with ESM, it usually works well with Node16+ module resolution.
  // If import issues arise with node-fetch or other ESM modules in tests:
  // transform: { '^.+\.tsx?$': ['ts-jest', { useESM: true }] },
  // extensionsToTreatAsEsm: ['.ts'],
  // moduleNameMapper: { '^(\.{1,2}/.*)\.js$': '$1' }, // If node-fetch v3 needs this
};
