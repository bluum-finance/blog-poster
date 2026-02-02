import * as fs from "fs/promises";
import * as path from "path";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import type { BlogPost } from "./types.js";
import { formatBlogPost } from "./markdown-converter.js";

const execAsync = promisify(exec);

const BLUUM_REPO_URL = "https://github.com/bluum-finance/bluum-website.git";
const BLOG_PATH = "current/src/content/blog";
const IMAGES_PATH = "current/public/images/blog";

/**
 * Clone the bluum-website repository
 * If workDir points to an existing bluum-website repo, uses that instead of cloning
 */
export async function cloneRepository(
  workDir: string,
  githubToken?: string
): Promise<string> {
  // Check if workDir itself is the repo (contains .git and current directory)
  let repoDir: string;
  const workDirIsRepo = await isBluumWebsiteRepo(workDir);
  
  if (workDirIsRepo) {
    // workDir is already the bluum-website repository
    repoDir = workDir;
    console.log("Using existing repository at:", repoDir);
  } else {
    // Check if bluum-website subdirectory exists
    repoDir = path.join(workDir, "bluum-website");
    const subDirIsRepo = await isBluumWebsiteRepo(repoDir);
    
    if (subDirIsRepo) {
      console.log("Repository already exists, pulling latest...");
      await execAsync("git fetch origin && git checkout dev && git pull origin dev", {
        cwd: repoDir,
      });
      return repoDir;
    }
  }

  // Clone fresh if not found
  if (!workDirIsRepo) {
    console.log("Cloning bluum-website repository...");

    // Build clone URL with token if provided
    let cloneUrl = BLUUM_REPO_URL;
    if (githubToken) {
      cloneUrl = BLUUM_REPO_URL.replace(
        "https://",
        `https://${githubToken}@`
      );
    }

    await execAsync(`git clone ${cloneUrl} ${repoDir}`);

    // Checkout dev branch
    await execAsync("git checkout dev", { cwd: repoDir });
  } else {
    // Pull latest if using existing repo
    try {
      await execAsync("git fetch origin && git checkout dev && git pull origin dev", {
        cwd: repoDir,
      });
    } catch (error) {
      console.warn("Could not pull latest changes:", error);
    }
  }

  return repoDir;
}

/**
 * Check if a directory is the bluum-website repository
 */
async function isBluumWebsiteRepo(dir: string): Promise<boolean> {
  try {
    const gitDir = path.join(dir, ".git");
    const currentDir = path.join(dir, "current");
    const blogPath = path.join(dir, "current", "src", "content", "blog");
    
    const hasGit = await fs.access(gitDir).then(() => true).catch(() => false);
    const hasCurrent = await fs.access(currentDir).then(() => true).catch(() => false);
    const hasBlogPath = await fs.access(blogPath).then(() => true).catch(() => false);
    
    return hasGit && hasCurrent && hasBlogPath;
  } catch {
    return false;
  }
}

/**
 * Write blog post and images to the repository
 */
export async function writeBlogPost(
  repoDir: string,
  post: BlogPost,
  uploadedImagePath?: string
): Promise<{ postPath: string; imagePaths: string[] }> {
  // Generate filename from slug
  const filename = `${post.slug}.md`;

  // Paths
  const blogDir = path.join(repoDir, BLOG_PATH);
  const imagesDir = path.join(repoDir, IMAGES_PATH);
  const postPath = path.join(blogDir, filename);

  // Ensure directories exist
  await fs.mkdir(blogDir, { recursive: true });
  await fs.mkdir(imagesDir, { recursive: true });

  const imagePaths: string[] = [];

  // Handle uploaded image
  if (uploadedImagePath) {
    try {
      const imageDestPath = path.join(imagesDir, `${post.slug}-cover.png`);
      await fs.copyFile(uploadedImagePath, imageDestPath);
      imagePaths.push(imageDestPath);
      console.log(`Copied uploaded image to: ${imageDestPath}`);
    } catch (error) {
      console.warn("Could not copy uploaded image, using default:", error);
    }
  } else {
    console.log("Using default image: /images/blog/blog-img-6.png");
  }

  // Write markdown file (image paths already set in blogPost.meta)
  const markdown = formatBlogPost(post);
  await fs.writeFile(postPath, markdown, "utf-8");
  console.log(`Blog post written to: ${postPath}`);

  return { postPath, imagePaths };
}

/**
 * Get the blog directory path
 */
export function getBlogPath(repoDir: string): string {
  return path.join(repoDir, BLOG_PATH);
}

/**
 * Get the images directory path
 */
export function getImagesPath(repoDir: string): string {
  return path.join(repoDir, IMAGES_PATH);
}

/**
 * List existing blog posts
 */
export async function listExistingPosts(repoDir: string): Promise<string[]> {
  const blogDir = path.join(repoDir, BLOG_PATH);
  try {
    const files = await fs.readdir(blogDir);
    return files.filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}
