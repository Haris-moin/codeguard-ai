import fs from "fs";
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

dotenv.config();

export const getInstallationOctokit = async (installationId) => {
  try {
    const privateKey = fs.readFileSync(
      process.env.GITHUB_PRIVATE_KEY_PATH,
      "utf8"
    );

    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey,
      installationId,
    });

    const installationAuth = await auth({
      type: "installation",
    });

    return new Octokit({
      auth: installationAuth.token,
    });
  } catch (error) {
    console.error("GitHub Auth Error:", error.message);
    throw error;
  }
};