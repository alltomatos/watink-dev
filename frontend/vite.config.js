import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
  server: {
    port: 3000,
    open: false,
    host: true,
    allowedHosts: ["app.docker", "api.docker", "100.123.62.90"],
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/plugins": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    include: [
      "mic-recorder-to-mp3",
      "@material-ui/core",
      "@material-ui/icons",
      "@material-ui/lab",
      "howler",
    ],
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  define: {
    global: "globalThis",
    "process.env.npm_package_version": JSON.stringify(
      process.env.npm_package_version
    ),
  },
  resolve: {
    alias: {
      "jss-plugin-globalThis": "jss-plugin-global",
    },
  },
});
