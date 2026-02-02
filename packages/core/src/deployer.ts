import { Octokit } from "@octokit/rest";

const REPO_OWNER = "bluum-finance";
const REPO_NAME = "bluum-website";
const DEFAULT_BRANCH = "dev";

/**
 * Get the latest commit SHA for a branch using GitHub API
 * This replaces the need for git commands
 */
export async function getLatestCommitSha(
  githubToken: string,
  branch: string = DEFAULT_BRANCH
): Promise<string> {
  const octokit = new Octokit({ auth: githubToken });

  const { data } = await octokit.repos.getBranch({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    branch,
  });

  return data.commit.sha;
}

/**
 * Check if a branch exists
 */
export async function branchExists(
  githubToken: string,
  branch: string
): Promise<boolean> {
  const octokit = new Octokit({ auth: githubToken });

  try {
    await octokit.repos.getBranch({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get the default branch for the repository
 */
export async function getDefaultBranch(githubToken: string): Promise<string> {
  const octokit = new Octokit({ auth: githubToken });

  const { data } = await octokit.repos.get({
    owner: REPO_OWNER,
    repo: REPO_NAME,
  });

  return data.default_branch;
}

/**
 * Note: With the GitHub API approach, we don't need explicit deploy functions.
 * Each call to createOrUpdateFileContents in blog-writer.ts already creates a commit.
 * The commit is pushed automatically, so there's no separate "push" step needed.
 *
 * This file is kept for compatibility and future enhancements (e.g., creating PRs).
 */
