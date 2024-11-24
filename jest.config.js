// jest.config.js
export default {
    preset: "ts-jest",
    testEnvironment: "node",
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"],
    testMatch: ["**/test/**/*.test.ts"],
};
