import { Router } from "express";
import { z } from "zod";
import { login } from "../services/authService.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);

    res.json(await login(input.email, input.password, {
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    }));
  } catch (error) {
    next(error);
  }
});
