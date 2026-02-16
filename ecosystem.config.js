module.exports = {
  apps: [
    {
      name: "backend",
      cwd: "./backend",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development",
        PORT: 8080,
      },
    },
    {
      name: "backend-go",
      cwd: "./backend-go",
      script: "./backend-go",
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
      },
    },
    {
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
    },
    {
      name: "engine-standard",
      cwd: "./engine-standard",
      script: "npm",
      args: "run dev",
    },
  ],
};
