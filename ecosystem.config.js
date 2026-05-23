module.exports = {
  apps: [
    {
      name: "watink-bussines",
      cwd: "./bussines",
      script: "./backend-go",
      env: {
        PORT_GO: process.env.PORT_GO || 8082,
        DB_HOST: process.env.DB_HOST || "localhost",
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || "postgres",
        DB_PASS: process.env.DB_PASS,
        DB_NAME: process.env.DB_NAME || "watink",
        AMQP_URL: process.env.AMQP_URL || "amqp://localhost:5672",
        REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        PLUGIN_HUB_URL: process.env.PLUGIN_HUB_URL || "https://marketplace.alltomatos.dev.br/api/v1/hub",
      },
    },
    {
      name: "engine-go",
      cwd: "./engine-go",
      script: "./engine-go",
      env: {
        AMQP_URL: process.env.AMQP_URL || "amqp://localhost:5672",
        DB_HOST: process.env.DB_HOST || "localhost",
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || "postgres",
        DB_PASS: process.env.DB_PASS,
        DB_NAME: process.env.DB_NAME || "watink",
      },
    },
    {
      name: "marketplace-hub",
      cwd: "./marketplace-hub",
      script: "go",
      args: "run cmd/hub/main.go",
      env: {
        HUB_PORT: process.env.HUB_PORT || 8090,
      },
    },
    {
      name: "plugin-manager",
      cwd: "./plugin-manager",
      script: "go",
      args: "run main.go",
      env: {
        PORT: process.env.PLUGIN_MANAGER_PORT || 8081,
      },
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
    },
  ],
};
