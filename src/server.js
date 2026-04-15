import express from "express";
import dotenv from "dotenv";
import webhookRoutes from "./routes/webhook.routes.js";
import fixRoutes from "./routes/fix.routes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/webhook", webhookRoutes);
app.use("/fix", fixRoutes);

app.get("/", (req, res) => {
  res.send("CodeGuard AI running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


