module.exports = {
  apps: [
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
        JWT_REFRESH_SECRET: "***REMOVED_JWT_REFRESH_SECRET***",
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
      name: "frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
    },
  ],
};
