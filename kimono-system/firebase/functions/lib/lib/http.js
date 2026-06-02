import { HttpError } from "./constants.js";
export function setCors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
}
export async function handleHttp(req, res, fn) {
    setCors(res);
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    try {
        const result = await fn();
        res.json(result);
    }
    catch (error) {
        const statusCode = error instanceof HttpError ? error.statusCode : 500;
        const message = error instanceof Error ? error.message : "Internal server error";
        res.status(statusCode).json({ status: "error", message });
    }
}
export function requireMethod(req, method) {
    if (req.method !== method) {
        throw new HttpError(405, `Method not allowed: ${req.method}`);
    }
}
//# sourceMappingURL=http.js.map