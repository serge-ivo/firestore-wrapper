import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage",
};

export default config;
