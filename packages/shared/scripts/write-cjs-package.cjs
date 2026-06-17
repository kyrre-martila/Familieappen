const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const distCjsDir = join(__dirname, "..", "dist-cjs");
mkdirSync(distCjsDir, { recursive: true });
writeFileSync(join(distCjsDir, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
