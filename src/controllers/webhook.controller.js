import { processPullRequest } from "../services/pr.service.js";

export const handleWebhook = async (req, res) => {
  try {
    var event = req.headers["x-github-event"];
    console.log('event: testing ', event);

    if (event === "pull_request") {
      await processPullRequest(req.body);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).send("Internal Server Error");
  }
};
