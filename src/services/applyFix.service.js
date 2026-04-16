import { getInstallationOctokit } from "../github/auth.js";

const applyChanges = (content, changes) => {
  let updated = content;

  for (const change of changes) {
    const regex = new RegExp(change.search, "g");
    updated = updated.replace(regex, change.replace);
  }

  return updated;
};

/**
 * Apply AI fixes by creating new branch + PR
 */
export const applyFixPR = async (prNumber, fixes, payload) => {
  const installationId = payload.installation.id;

  const octokit = await getInstallationOctokit(installationId);

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  const branchName = `ai-fix-${prNumber}`;

  const baseSha = payload.pull_request.head.sha;

  // -----------------------------
  // 1. CREATE NEW BRANCH
  // -----------------------------
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  console.log(`🌿 Created branch: ${branchName}`);

  // -----------------------------
  // 2. APPLY FIXES FILE BY FILE
  // -----------------------------
  for (const fileFix of fixes) {
    try {
      const { file, changes } = fileFix;

      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: file,
        ref: branchName,
      });

      const content = Buffer.from(fileData.content, "base64").toString("utf8");

      // 🧠 APPLY MULTIPLE CHANGES
      const updatedContent = applyChanges(content, changes);

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file,
        message: "🤖 AI Multi-file Refactor",
        content: Buffer.from(updatedContent).toString("base64"),
        branch: branchName,
        sha: fileData.sha,
      });

      console.log(`🔧 Updated: ${file}`);
    } catch (err) {
      console.warn(`⚠️ Skipping ${fileFix.file}`, err.message);
    }
  }

  // -----------------------------
  // 3. CREATE NEW PR
  // -----------------------------
  await octokit.pulls.create({
    owner,
    repo,
    title: `🤖 AI Fixes for PR #${prNumber}`,
    head: branchName,
    base: "main",
    body: `
AI-generated safe fixes applied.

- Reviewed PR #${prNumber}
- Applied safe improvements only
- Requires human review before merge
    `,
  });

  console.log("🚀 AI Fix PR created successfully");
};
