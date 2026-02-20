module.exports = {
  apps: [
    {
      name: "watink-bussines",
      cwd: "./bussines",
      script: "./backend-go", // binário local legado; nome lógico do serviço agora é watink-bussines
      env: {
        PORT_GO: 8082,
        DB_HOST: "localhost",
        DB_PORT: 5432,
        DB_USER: "postgres",
        DB_PASS: "rMOb4RHlVkMB4hKgMjYSSZ6TUTjiHUq7",
        DB_NAME: "watink",
        AMQP_URL: "amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "watink_secret_key_2026",
        JWT_REFRESH_SECRET: "***REMOVED_JWT_REFRESH_SECRET***",
        PLUGIN_HUB_URL: "https://marketplace.alltomatos.dev.br/api/v1/hub",
      },
    },
    {
      name: "engine-go",
      cwd: "./engine-go",
      script: "./engine-go",
      env: {
        AMQP_URL: "amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672",
        DB_HOST: "localhost",
        DB_PORT: 5432,
        DB_USER: "postgres",
        DB_PASS: "rMOb4RHlVkMB4hKgMjYSSZ6TUTjiHUq7",
        DB_NAME: "watink",
      },
    },
    {
      name: "marketplace-hub",
      cwd: "./marketplace-hub",
      script: "go",
      args: "run cmd/hub/main.go",
      env: {
        HUB_PORT: 8090,
      }
    },
    {
      name: "plugin-manager",
      cwd: "./plugin-manager",
      script: "go",
      args: "run main.go",
      env: {
        PORT: 8081,
      }
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
    },
  ],
};
