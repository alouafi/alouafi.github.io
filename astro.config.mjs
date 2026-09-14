import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://alouafi.github.io",
  output: "static",
  build: {
    format: "directory",
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
    },
  },
});
