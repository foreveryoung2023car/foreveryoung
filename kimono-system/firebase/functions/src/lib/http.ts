import type { Request, Response } from "express";
import { HttpError } from "./constants.js";

export function setCors(res: Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
}

export async function handleHttp(req: Request, res: Response, fn: () => Promise<unknown>) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  try {
    res.json(await fn());
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(statusCode).json({ status: "error", message });
  }
}

export function requireMethod(req: Request, method: string) {
  if (req.method !== method) {
    throw new HttpError(405, `Method not allowed: ${req.method}`);
  }
}
