import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL && context.parentURL.includes("node_modules")) {
      return nextResolve(specifier, context);
    }
    if (specifier.startsWith("@/")) {
      const targetBase = path.join(rootDir, "src", specifier.slice(2));
      for (const ext of ["", ".ts", ".tsx", ".js", "/index.ts"]) {
        if (existsSync(targetBase + ext)) {
          return nextResolve(pathToFileURL(targetBase + ext).href, context);
        }
      }
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL &&
      context.parentURL.startsWith("file:") &&
      !path.extname(specifier)
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      for (const ext of [".ts", ".tsx", ".js"]) {
        if (existsSync(candidate + ext)) {
          return nextResolve(pathToFileURL(candidate + ext).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
