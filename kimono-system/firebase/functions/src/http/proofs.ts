import { onRequest } from "firebase-functions/v2/https";
import { handleHttp, requireMethod } from "../lib/http.js";
import { uploadOrderProof as uploadOrderProofService } from "../services/proofs.js";

export const uploadOrderProof = onRequest(
  { region: "asia-northeast1", cors: true, memory: "512MiB" },
  (req, res) => handleHttp(req, res, async () => {
    requireMethod(req, "POST");
    return uploadOrderProofService(req.body);
  })
);
