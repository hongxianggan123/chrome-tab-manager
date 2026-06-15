import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

function manifestPlugin(): Plugin {
  return {
    name: "chrome-extension-manifest",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(
          {
            manifest_version: 3,
            name: "Chrome Tab Manager",
            version: "0.0.0",
            description:
              "Manage open Chrome tabs from the side panel with duplicate detection and local archives.",
            permissions: ["tabs", "storage", "sidePanel"],
            action: {
              default_title: "Chrome Tab Manager"
            },
            background: {
              service_worker: "service-worker.js",
              type: "module"
            },
            side_panel: {
              default_path: "side-panel.html"
            }
          },
          null,
          2
        )
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), manifestPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "side-panel": resolve(__dirname, "side-panel.html"),
        "service-worker": resolve(__dirname, "src/extension/service-worker.ts")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  }
})
