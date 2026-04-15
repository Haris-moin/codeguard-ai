import express from "express";
import { verifySignature } from "../middleware/verifySignature.js";
import { handleWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();

router.post("/", verifySignature, handleWebhook);

export default router;
