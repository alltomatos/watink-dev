module.exports = {
  apps: [
    {
      name: "backend",
      cwd: "./backend",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development",
        DB_DIALECT: "postgres",
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_USER: "postgres",
        DB_PASS: "rMOb4RHlVkMB4hKgMjYSSZ6TUTjiHUq7",
        DB_NAME: "watink",
        AMQP_URL: "amqp://guest:guest@localhost:5672",
        REDIS_URL: "redis://localhost:6379",
        PORT: "8080",
        JWT_SECRET: "watink_secret_key_2026",
        JWT_REFRESH_SECRET: "75756756756",
        FRONTEND_URL: "http://100.123.62.90:3001",
        URL_BACKEND: "http://100.123.62.90:8080",
        ENGINE_STANDARD_URL: "http://localhost:3334",
        RABBITMQ_MGMT_URL: "http://localhost:15673/api/overview",
        FLOW_ENGINE_URL: "http://localhost:8080" // In Dev, backend handles flows internally
      }
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
      env: {
        VITE_BACKEND_URL: "/api"
      }
    },
    {
      name: "engine-standard",
      cwd: "./engine-standard",
      script: "npm",
      args: "run dev",
      env: {
        AMQP_URL: "amqp://guest:guest@localhost:5672",
        REDIS_URL: "redis://localhost:6379"
      }
    }
  ]
};
