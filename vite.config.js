import { defineConfig } from "vite";

// Cloudflare Pages serves the site at /. GitHub Pages serves it at /scorch/,
// and that workflow sets SCORCH_BASE=/scorch/ for this build.
const base = process.env.SCORCH_BASE || "/";

export default defineConfig({
  base,
  build: {
    outDir: "dist",
  },
});
