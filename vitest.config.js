import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    // Each test file gets a fresh in-memory database; never touches data/bot.db.
    env: { DB_PATH: ":memory:", GEMINI_API: "test-key" },
    restoreMocks: true,
  },
});
