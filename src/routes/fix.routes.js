import express from "express";
import { applyFixHandler } from "../controllers/fix.controller.js";

const router = express.Router();

router.post("/apply", applyFixHandler);

export default router;