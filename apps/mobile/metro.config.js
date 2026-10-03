// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

/**
 * Metro watches the whole monorepo so `packages/shared` resolves, which also drags in the other
 * apps. Block their build output and the backend: the mobile bundle never imports them, and on
 * OneDrive the web `dist` files can become cloud placeholders that make Metro's crawler fail
 * with `EINVAL: readlink`.
 */
const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockedDirs = ['apps/web/dist', 'apps/web/node_modules/.vite', 'apps/backend', 'docs', 'node_modules.recovery'];
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList].filter(Boolean)),
  ...blockedDirs.map((dir) => new RegExp(`^${escapeForRegex(path.join(monorepoRoot, dir) + path.sep)}.*`)),
];

module.exports = config;
