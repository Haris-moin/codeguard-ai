import { execSync } from "child_process";

/**
 * Create safe AI fix branch
 */
export const createFixBranch = (branchName) => {
  execSync(`git checkout -b ${branchName}`);
};

/**
 * Commit AI changes
 */
export const commitChanges = (message) => {
  execSync(`git add .`);
  execSync(`git commit -m "${message}"`);
};

/**
 * Push branch to GitHub
 */
export const pushBranch = (branchName) => {
  execSync(`git push origin ${branchName}`);
};