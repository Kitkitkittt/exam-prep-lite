import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const localWorkspace = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  base: "./",
  server: process.env.EXAM_PREP_LOCAL === "1" ? {
    fs: { allow: [localWorkspace] },
  } : undefined,
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
