import { getInstallationOctokit } from "../github/auth.js";
import {
  generateStructuredReview,
  generateFixSuggestions,
  generateMultiFileFix,
} from "./ai.service.js";

import { extractJSON } from "../utils/extractJSON.js";
import { extractAddedLines } from "../utils/extractAddedLines.js";
import { saveFixSuggestions } from "./fixStore.service.js";

export const processPullRequest = async (payload) => {
  try {
    const installationId = payload.installation.id;

    const octokit = await getInstallationOctokit(installationId);

    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pull_number = payload.pull_request.number;
    const sha = payload.pull_request.head.sha;

    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    const allComments = [];

    // -----------------------------
    // 🧠 1. INLINE AI REVIEW (COMMENTS ONLY)
    // -----------------------------
    for (const file of files) {
      if (!file.patch) continue;

      const aiRaw = await generateStructuredReview(file.patch, file.filename);

      const aiComments = extractJSON(aiRaw);
      const addedLines = extractAddedLines(file.patch);

      for (const comment of aiComments) {
        const match = addedLines.find((l) => l.line === comment.line);

        if (!match) continue;

        allComments.push({
          path: file.filename,
          line: match.line,
          side: "RIGHT",
          body: `💡 ${comment.comment}`,
        });
      }
    }

    // -----------------------------
    // 🧠 2. MULTI-FILE FIX GENERATION (ONLY ONE SOURCE OF TRUTH)
    // -----------------------------
    const multiFileFixes = await generateMultiFileFix(files);

    if (multiFileFixes?.length > 0) {
      await saveFixSuggestions(pull_number, multiFileFixes, payload);
      console.log("🧠 Multi-file fixes stored");
    }

    // -----------------------------
    // 3. CREATE GITHUB REVIEW
    // -----------------------------
    if (allComments.length > 0) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        event: "COMMENT",
        body: `
🤖 AI Review Completed

✔ Inline comments added  
⚡ Fix suggestions available (click Apply Fix)
        `,
        comments: allComments,
      });
    } else {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        event: "APPROVE",
        body: "✅ No issues found by AI",
      });
    }

    console.log("✅ PR processing completed successfully");
  } catch (error) {
    console.error("❌ PR Service Error:", error);
  }
};
