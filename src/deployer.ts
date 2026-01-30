import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Deploy changes to the dev branch
 */
export async function deployToDev(
  repoDir: string,
  commitMessage: string
): Promise<{ success: boolean; commitHash?: string; error?: string }> {
  try {
    // Check for changes
    const { stdout: status } = await execAsync("git status --porcelain", {
      cwd: repoDir,
    });

    if (!status.trim()) {
      console.log("No changes to commit");
      return { success: true };
    }

    console.log("Changes detected:");
    console.log(status);

    // Stage all changes
    await execAsync("git add -A", { cwd: repoDir });

    // Commit
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: repoDir,
    });

    // Get commit hash
    const { stdout: hash } = await execAsync("git rev-parse --short HEAD", {
      cwd: repoDir,
    });

    // Push to dev branch
    console.log("Pushing to dev branch...");
    await execAsync("git push origin dev", { cwd: repoDir });

    console.log(`Successfully pushed commit ${hash.trim()} to dev branch`);

    return {
      success: true,
      commitHash: hash.trim(),
    };
  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(repoDir: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync("git status --porcelain", {
      cwd: repoDir,
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(repoDir: string): Promise<string> {
  const { stdout } = await execAsync("git branch --show-current", {
    cwd: repoDir,
  });
  return stdout.trim();
}

/**
 * Ensure we're on the dev branch
 */
export async function ensureDevBranch(repoDir: string): Promise<void> {
  const branch = await getCurrentBranch(repoDir);
  if (branch !== "dev") {
    console.log(`Switching from ${branch} to dev branch...`);
    await execAsync("git checkout dev", { cwd: repoDir });
  }
}
