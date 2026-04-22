import { getInstallationOctokit } from "../github/auth.js";
import {
  generateStructuredReview,
  generateFixSuggestions,
  generateMultiFileFix,
} from "./ai.service.js";

import { saveFixSuggestions } from "./fixStore.service.js";

const uniqueByKey = (arr, keyFn) => {
  const seen = new Set();

  return arr.filter((item) => {
    const key = keyFn(item);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const normalizeFixes = (fixes, filename = null) => {
  const normalized = [];

  for (const fix of fixes) {
    // ✅ Case 1: Already in correct format (multi-file)
    if (fix.file && fix.changes) {
      normalized.push(fix);
      continue;
    }

    // ⚠️ Case 2: Single-file fix → convert it
    if (fix.issue && fix.fix && filename) {
      normalized.push({
        file: filename,
        changes: [
          {
            search: fix.issue, // TEMP (will fix in Step 2)
            replace: fix.fix,
          },
        ],
      });
    }
  }

  return normalized;
};

const getPositionFromPatch = (patch, targetLineText) => {
  const lines = patch.split("\n");

  let lineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.startsWith("-")) {
      lineNumber++;
    }

    if (line.includes(targetLineText)) {
      return lineNumber;
    }
  }

  return null;
};

// MAIN PR PROCESSOR
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

  // FILE BY FILE ANALYSIS
  for (const file of files) {
    if (!file.patch) continue;

    const aiComments = await generateStructuredReview(
      file.patch,
      file.filename,
    );

    const cleanedComments = uniqueByKey(
      aiComments,
      (c) => `${file.filename}-${c.lineText}`,
    );

    for (const comment of cleanedComments) {
      const lineNumber = getPositionFromPatch(file.patch, comment.lineText);

      if (!lineNumber) continue;

      allComments.push({
        path: file.filename,
        line: lineNumber,
        side: "RIGHT",
        body: `💡 ${comment.comment}`,
      });
    }

    // SINGLE FILE FIXES
    const fixes = await generateFixSuggestions(file.patch, file.filename);

    const cleanedFixes = uniqueByKey(
      fixes,
      (f) => `${file.filename}-${f.issue}`,
    );

    const normalizedSingleFixes = normalizeFixes(cleanedFixes, file.filename);

    if (normalizedSingleFixes.length > 0) {
      allFixes.push(...normalizedSingleFixes);
    }
  }

  // MULTI-FILE AI ANALYSIS
  let multiFileRun = false;
  if (!multiFileRun) {
    const multiFileFixes = await generateMultiFileFix(files);
    multiFileRun = true;

    if (multiFileFixes?.length > 0) {
      const cleanedMulti = uniqueByKey(
        multiFileFixes,
        (f) => `${f.file}-${JSON.stringify(f.changes)}`,
      );

      const normalizedMultiFixes = normalizeFixes(cleanedMulti);

      if (normalizedMultiFixes.length > 0) {
        allFixes.push(...normalizedMultiFixes);
      }
    }
  }

  // SAVE ALL FIXES
  if (allFixes.length > 0) {
    await saveFixSuggestions({
      pull_number,
      owner,
      repo,
      fixes: allFixes,
    });
  }

  // GITHUB REVIEW SUBMISSION
  if (allComments.length > 0) {
    console.log("FINAL COMMENTS:", JSON.stringify(allComments, null, 2));
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
