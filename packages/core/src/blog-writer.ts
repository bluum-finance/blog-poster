import * as fs from "fs/promises";
import * as path from "path";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import type { BlogPost, GeneratedImages } from "./types.js";
import { formatBlogPost } from "./markdown-converter.js";

const execAsync = promisify(exec);

const BLUUM_REPO_URL = "https://github.com/bluum-finance/bluum-website.git";
const BLOG_PATH = "current/src/content/blog";
const IMAGES_PATH = "current/public/images/blog";

/**
 * Clone the bluum-website repository
 */
export async function cloneRepository(
  workDir: string,
  githubToken?: string
): Promise<string> {
  const repoDir = path.join(workDir, "bluum-website");

  // Check if already cloned
  try {
    await fs.access(repoDir);
    console.log("Repository already exists, pulling latest...");
    await execAsync("git fetch origin && git checkout dev && git pull origin dev", {
      cwd: repoDir,
    });
    return repoDir;
  } catch {
    // Clone fresh
  }

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

  return repoDir;
}

/**
 * Write blog post and images to the repository
 */
export async function writeBlogPost(
  repoDir: string,
  post: BlogPost,
  images: GeneratedImages
): Promise<{ postPath: string; imagePaths: string[] }> {
  // Generate filename from slug and date
  const dateStr = post.meta.date.split("T")[0]; // YYYY-MM-DD
  const filename = `${post.slug}.md`;

  // Paths
  const blogDir = path.join(repoDir, BLOG_PATH);
  const imagesDir = path.join(repoDir, IMAGES_PATH);
  const postPath = path.join(blogDir, filename);

  // Ensure directories exist
  await fs.mkdir(blogDir, { recursive: true });
  await fs.mkdir(imagesDir, { recursive: true });

  // Use default image (blog-img-6.png already exists in repo)
  // No need to copy images - just use the existing default path
  const imagePaths: string[] = [];

  // Check if images are custom (not default) and need to be copied
  const isDefaultImage = images.coverImage === "/images/blog/blog-img-6.png" ||
                         images.coverImage.startsWith("/images/blog/");

  if (!isDefaultImage) {
    // Only copy if custom images were generated
    const imageSlug = post.slug;
    const coverImageDest = path.join(imagesDir, `${imageSlug}-cover.png`);
    const postImageDest = path.join(imagesDir, `${imageSlug}-img.png`);

    try {
      await fs.copyFile(images.coverImage, coverImageDest);
      imagePaths.push(coverImageDest);
      console.log(`Copied cover image to: ${coverImageDest}`);
    } catch (error) {
      console.warn("Could not copy cover image, using default");
    }

    try {
      await fs.copyFile(images.postImage, postImageDest);
      imagePaths.push(postImageDest);
      console.log(`Copied post image to: ${postImageDest}`);
    } catch (error) {
      console.warn("Could not copy post image, using default");
    }
  } else {
    console.log("Using default image: /images/blog/blog-img-6.png");
  }

  // Keep the image paths as-is (use default or custom)
  const updatedPost: BlogPost = {
    ...post,
    meta: {
      ...post.meta,
      cover_image: images.coverImage,
      image: images.postImage,
    },
  };

  // Write markdown file
  const markdown = formatBlogPost(updatedPost);
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
