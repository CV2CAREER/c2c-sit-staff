import admin from "firebase-admin";
import serviceAccount from './cvtocareer-394713-70414219c916.json';
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("firebase-config");

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    logger.info("Firebase Admin SDK initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

const bucket = admin.storage().bucket('gs://cvtocareer-394713.appspot.com/');

export default bucket;