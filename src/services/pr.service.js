import { getInstallationOctokit } from "../github/auth.js";
import {
  generateStructuredReview,
  generateFixSuggestions,
  generateMultiFileFix,
} from "./ai.service.js";

import { saveFixSuggestions } from "./fixStore.service.js";

// ================================
// HELPERS
// ================================

const uniqueByKey = (arr, keyFn) => {
  const seen = new Set();

  return arr.filter((item) => {
    const key = keyFn(item);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const getLineNumberFromPatch = (patch, lineText) => {
  const lines = patch.split("\n");

  let lineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // count only actual diff lines (+ additions context)
    if (!line.startsWith("-")) {
      lineNumber++;
    }

    if (line.includes(lineText)) {
      return lineNumber;
    }
  }

  return null;
};

// ================================
// MAIN PR PROCESSOR
// ================================

export const processPullRequest = async (payload) => {
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

  // ================================
  // 1. FILE BY FILE ANALYSIS
  // ================================
  for (const file of files) {
    if (!file.patch) continue;

    // ------------------------
    // AI STRUCTURED REVIEW
    // ------------------------
    const aiComments = await generateStructuredReview(
      file.patch,
      file.filename,
    );

    const cleanedComments = uniqueByKey(
      aiComments,
      (c) => `${file.filename}-${c.lineText}`,
    );

    for (const comment of cleanedComments) {
      const lineNumber = getLineNumberFromPatch(file.patch, comment.lineText);

      if (!lineNumber) continue;

      allComments.push({
        path: file.filename,
        line: lineNumber,
        side: "RIGHT",
        body: `💡 ${comment.comment}`,
      });
    }

    // ------------------------
    // SINGLE FILE FIXES
    // ------------------------
    const fixes = await generateFixSuggestions(file.patch, file.filename);

    const cleanedFixes = uniqueByKey(
      fixes,
      (f) => `${file.filename}-${f.issue}`,
    );

    if (cleanedFixes.length > 0) {
      allFixes.push(...cleanedFixes);
    }
  }

  // ================================
  // 2. MULTI-FILE AI ANALYSIS
  // ================================
  let multiFileRun = false;
  if (!multiFileRun) {
    const multiFileFixes = await generateMultiFileFix(files);
    multiFileRun = true;

    if (multiFileFixes?.length > 0) {
      const cleanedMulti = uniqueByKey(
        multiFileFixes,
        (f) => `${f.file}-${JSON.stringify(f.changes)}`,
      );

      allFixes.push(...cleanedMulti);
    }
    await saveFixSuggestions({
      pull_number,
      owner,
      repo,
      fixes: multiFileFixes,
    });
  }

  // ================================
  // 3. SAVE ALL FIXES
  // ================================
  if (allFixes.length > 0) {
    await saveFixSuggestions({
      pull_number,
      owner,
      repo,
      fixes: multiFileFixes,
    });
  }

  // ================================
  // 4. GITHUB REVIEW SUBMISSION
  // ================================
  if (allComments.length > 0) {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      commit_id: sha,
      event: "COMMENT",
      body: "🤖 AI Review Completed with inline suggestions and multi-file analysis",
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

  console.log("✅ PR processed successfully");
};
