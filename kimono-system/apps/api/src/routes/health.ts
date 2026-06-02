import { Router } from "express";
import { pool } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const started = Date.now();
  try {
    await pool.query("select 1");
    res.json({
      status: "ok",
      service: "kimono-api",
      database: "ok",
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "kimono-api",
      database: "error",
      message: error instanceof Error ? error.message : "database unavailable",
      checkedAt: new Date().toISOString()
    });
  }
});
