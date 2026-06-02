import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Manual chunk strategy — function-based to avoid circular dependencies.
 * React/MUI share internal imports; object-based manualChunks creates
 * circular chunk warnings. Function resolves each module independently.
 */
function chunkStrategy(id, { _getModuleInfo }) {
  if (id.includes("node_modules")) {
    // React core — keep together (react, react-dom, scheduler, prop-types)
    if (
    id.includes("/react-dom/") ||
    id.includes("/react/") ||
    id.includes("/scheduler/") ||
    id.includes("/object-assign/") ||
    id.includes("/loose-envify/") ||
    id.includes("/prop-types/")
    ) {
    return "react";
    }
    // MUI v4 — monorepo, heavy, stable (rarely changes)
    if (
      id.includes("/@material-ui/core/") ||
      id.includes("/@material-ui/icons/") ||
      id.includes("/@material-ui/lab/")
    ) {
      return "material-ui";
    }
    // Forms
    if (id.includes("/formik/") || id.includes("/yup/")) {
      return "forms";
    }
    // Charts — recharts + d3 subdeps (avoid vendor circular)
    if (
    id.includes("/recharts/") ||
    id.includes("/d3-") ||
    id.includes("/victory-") ||
    id.includes("/d3-array/") ||
    id.includes("/d3-scale/") ||
    id.includes("/d3-scale-chromatic/") ||
    id.includes("/d3-array/") ||
    id.includes("/d3-time/") ||
    id.includes("/d3-time-format/")
    ) {
    return "charts";
    }
    // Flow builder + DnD
    if (id.includes("/reactflow/") || id.includes("/react-beautiful-dnd/")) {
      return "flow";
    }
    // Networking
    if (id.includes("/axios/") || id.includes("/socket.io-client/")) {
      return "realtime";
    }
    // i18n
    if (id.includes("/i18next/") || id.includes("/i18next-browser-languagedetector/")) {
      return "i18n";
    }
    // Audio/media
    if (id.includes("/mic-recorder-to-mp3/") || id.includes("/use-sound/") || id.includes("/howler/")) {
      return "media";
    }
    // Animation — framer-motion is 300KB+, isolate it
    if (id.includes("/framer-motion/")) {
      return "animation";
    }
    // Date utilities — date-fns is tree-shakeable but chunked for cache
    if (id.includes("/date-fns/")) {
      return "date-utils";
    }
    // Emoji picker — heavy component (600KB+), isolate for lazy load
    if (id.includes("/emoji-mart/")) {
      return "emoji-picker";
    }
    // Color picker — separate for dynamic import in forms
    if (id.includes("/react-color/")) {
      return "color-picker";
    }
    // Modal image — separate for modal-heavy routes
    if (id.includes("/react-modal-image/")) {
      return "modal-image";
    }
    // Signature canvas — separate for ticket-heavy features
    if (id.includes("/react-signature-canvas/")) {
      return "signature-canvas";
    }
    // Toast notifications — separate for UI layer
    if (id.includes("/react-toastify/")) {
      return "toast-notifications";
    }
    // UI utilities — smaller libs grouped together
    if (
      id.includes("/markdown-to-jsx/") ||
      id.includes("/qrcode.react/")
    ) {
      return "ui-utils";
    }
    // Catch-all for remaining node_modules
    return "vendor";
  }
}

export default defineConfig({
  plugins: [
    react({
      // Use automatic runtime to support the /* @jsxImportSource react */ comments
      // or to handle JSX without manual React imports.
      jsxRuntime: "automatic",
    }),
  ],
  server: {
    port: 3000,
    open: false,
    host: true,
    allowedHosts: ["app.docker"],
  },
  build: {
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: chunkStrategy,
      },
    },
  },
  envPrefix: "VITE_",
  esbuild: {
    // Force JSX loader for .js files in src
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  define: {
    global: "globalThis",
    "process.env.npm_package_version": JSON.stringify(
      process.env.npm_package_version
    ),
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
    include: [
      "mic-recorder-to-mp3",
      "@material-ui/core",
      "@material-ui/icons",
      "@material-ui/lab",
    ],
    exclude: [],
  },
  resolve: {
    alias: {
      "jss-plugin-globalThis": "jss-plugin-global",
    },
  },
});
