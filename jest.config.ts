import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": [
      "<rootDir>/src/webview/$1",
      "<rootDir>/src/$1",
    ],
    "^@vercel/analytics$": "<rootDir>/src/__mocks__/@vercel/analytics.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

export default config;
