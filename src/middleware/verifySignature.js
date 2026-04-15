import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export const verifySignature = (req, res, next) => {
  const signature = req.headers["x-hub-signature-256"];
  const body = JSON.stringify(req.body);

  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return res.status(401).send("Missing signature or secret");
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(body).digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );

  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  next();
};