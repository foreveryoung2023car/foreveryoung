import { HttpError } from "../lib/constants.js";
import type { AuthContext } from "../lib/auth.js";

export async function checkInOrder(_orderId: string, _raw: unknown, _source: string, _actor?: AuthContext) {
  throw new HttpError(410, "Check-in flow is disabled");
}
