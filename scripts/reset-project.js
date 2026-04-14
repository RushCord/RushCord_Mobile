#!/usr/bin/env node

/**
 * reset-project.js
 * Clears Expo cache and Metro bundler cache.
 * Run: node scripts/reset-project.js
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const cacheDir = path.join(root, ".expo");

console.log("Resetting project...");

// Remove .expo cache
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log("✓ Removed .expo cache");
}

// Clear Metro bundler cache
try {
  execSync("npx expo start --clear --non-interactive", {
    stdio: "inherit",
    cwd: root,
    timeout: 5000,
  });
} catch {
  // Expected: it exits quickly in non-interactive mode
}

console.log("✓ Project reset complete. Run `npm start` to restart.");
