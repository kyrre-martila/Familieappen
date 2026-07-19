const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const packageRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(packageRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const startCommand = packageJson.scripts?.start;

if (!startCommand) {
  throw new Error('Missing package.json scripts.start command');
}

const match = startCommand.match(/^node\s+([^\s]+)$/);
if (!match) {
  throw new Error(`Expected scripts.start to be a simple node command, received: ${startCommand}`);
}

const entrypoint = match[1];
const entrypointPath = path.resolve(packageRoot, entrypoint);

if (!fs.existsSync(entrypointPath)) {
  throw new Error(`Production start entrypoint does not exist: ${entrypoint}`);
}

const requireFromEntrypoint = Module.createRequire(entrypointPath);
requireFromEntrypoint.resolve(entrypointPath);

console.log(`Production API start command resolves ${entrypoint}`);
