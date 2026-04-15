import { processPullRequest } from "../services/pr.service.js";

export const handleWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"];

    if (event === "pull_request") {
      await processPullRequest(req.body);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).send("Internal Server Error");
  }
};
