import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: ["node_modules/(?!(jose|nanoid)/)"],
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "!app/**/*.d.ts",
    "!app/**/*.stories.{js,jsx,ts,tsx}",
    "!app/**/_*.{js,jsx,ts,tsx}",
    "!app/layout.tsx",
    "!app/**/layout.tsx",
  ],
  // Enforce minimum coverage thresholds.
  // Increase these as test coverage improves.
  coverageThreshold: {
    global: {
      lines: 40,
      functions: 35,
      branches: 30,
      statements: 40,
    },
  },
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}",
    "<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
