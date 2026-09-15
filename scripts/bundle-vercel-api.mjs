import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "apps/api/src/vercel-handler.ts")],
  outfile: path.join(root, "api/index.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: false,
  logLevel: "info",
  plugins: [
    {
      name: "external-npm-keep-workspace",
      setup(build) {
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith("@ranger/")) {
            return null;
          }
          return { path: args.path, external: true };
        });
      },
    },
  ],
});

console.log("Bundled api/index.js for Vercel");
