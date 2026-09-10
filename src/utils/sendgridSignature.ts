import crypto from "crypto";

/**
 * Verifies SendGrid's Event Webhook signature (ECDSA/SHA256). SendGrid signs
 * `timestamp + rawBody` and sends the signature/timestamp as headers; the
 * public key comes from the "Signed Event Webhook" toggle on the Event
 * Webhook settings page (a bare base64 string, no PEM wrapper).
 *
 * https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
export const verifySendGridSignature = (
  publicKey: string,
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
): boolean => {
  if (!signature || !timestamp) return false;

  try {
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    const verifier = crypto.createVerify("sha256");
    verifier.update(timestamp + rawBody);
    verifier.end();

    return verifier.verify(pem, signature, "base64");
  } catch {
    return false;
  }
};
