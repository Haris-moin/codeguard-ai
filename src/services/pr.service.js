import { getInstallationOctokit } from "../github/auth.js";
import {
  generateStructuredReview,
  generateFixSuggestions,
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
    const allFixes = [];

    // -----------------------------
    // 🧠 PROCESS EACH FILE
    // -----------------------------
    for (const file of files) {
      if (!file.patch) continue;

      // -----------------------------
      // 1. AI REVIEW (COMMENTS)
      // -----------------------------
      const aiRaw = await generateStructuredReview(
        file.patch,
        file.filename
      );

      const aiComments = extractJSON(aiRaw);
      const addedLines = extractAddedLines(file.patch);

      for (const comment of aiComments) {
        const match = addedLines.find(
          (l) => l.line === comment.line
        );

        if (!match) continue;

        allComments.push({
          path: file.filename,
          line: match.line,
          side: "RIGHT",
          body: `💡 ${comment.comment}`,
        });
      }

      // -----------------------------
      // 2. AI FIX SUGGESTIONS (NO APPLY YET)
      // -----------------------------
      const fixesRaw = await generateFixSuggestions(
        file.patch,
        file.filename
      );

      const fixes = extractJSON(fixesRaw);

      if (fixes.length > 0) {
        allFixes.push(...fixes);
      }
    }

    // -----------------------------
    // 3. SAVE FIXES FOR LATER (IMPORTANT)
    // -----------------------------
    if (allFixes.length > 0) {
      saveFixSuggestions(pull_number, allFixes);
      console.log(`🧠 Saved ${allFixes.length} fix suggestions`);
    }

    // -----------------------------
    // 4. CREATE GITHUB REVIEW
    // -----------------------------
    if (allComments.length > 0) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        commit_id: sha,
        event: "COMMENT",
        body: "🤖 AI Review Completed (with suggestions)",
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