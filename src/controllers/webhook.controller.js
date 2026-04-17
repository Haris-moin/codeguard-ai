import { processPullRequest } from "../services/pr.service.js";

export const handleWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    res.status(200).send("OK");

    setImmediate(async () => {
      try {
        if (event === "pull_request") {
          await processPullRequest(req.body);
        }
      } catch (err) {
        console.error("Async PR processing error:", err);
      }
    });
  } catch (err) {
    console.error("Webhook error:", err.message);

    // even here respond fast
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
};
