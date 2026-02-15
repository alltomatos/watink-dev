import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    allowedHosts: ["app.docker"]
  },
  build: {
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "material-ui": [
            "@material-ui/core",
            "@material-ui/icons",
            "@material-ui/lab",
          ],
        },
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
