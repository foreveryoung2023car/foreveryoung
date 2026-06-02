import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { auditRouter } from "./routes/audit.js";
import { authRouter } from "./routes/auth.js";
import { checkinsRouter } from "./routes/checkins.js";
import { financeRouter } from "./routes/finance.js";
import { healthRouter } from "./routes/health.js";
import { ordersRouter } from "./routes/orders.js";
import { refundsRouter } from "./routes/refunds.js";
import { reconciliationRouter } from "./routes/reconciliation.js";
import { reportsRouter } from "./routes/reports.js";

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/audit", auditRouter);
app.use("/finance", financeRouter);
app.use("/orders", ordersRouter);
app.use("/", checkinsRouter);
app.use("/", refundsRouter);
app.use("/reconciliation", reconciliationRouter);
app.use("/reports", reportsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(400).json({ status: "error", message });
});

app.listen(config.port, () => {
  console.log(`kimono api listening on :${config.port}`);
});
