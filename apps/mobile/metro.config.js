// Monorepo-aware Metro config.
//
// The Expo app lives in apps/mobile but consumes packages/shared, so Metro has to
// watch the repo root and resolve modules from both the app's and the root's
// node_modules. This is the standard Expo monorepo setup.
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole repo so changes in packages/shared trigger fast refresh.
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app first, then fall back to the repo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
