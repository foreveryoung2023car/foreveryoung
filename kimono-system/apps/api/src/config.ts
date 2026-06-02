import "dotenv/config";

export const config = {
  databaseUrl: mustGet("DATABASE_URL"),
  jwtSecret: mustGet("JWT_SECRET"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  port: Number(process.env.PORT ?? "8787")
};

function mustGet(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
