import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
if (!getApps().length) {
    initializeApp();
}
export const db = getFirestore();
export const auth = getAuth();
export { FieldValue, Timestamp };
//# sourceMappingURL=firebase.js.map