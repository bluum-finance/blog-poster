import { Octokit } from "@octokit/rest";
import type { BlogPost } from "./types.js";
import { formatBlogPost } from "./markdown-converter.js";

const REPO_OWNER = "bluum-finance";
const REPO_NAME = "bluum-website";
const BLOG_PATH = "current/src/content/blog";
const IMAGES_PATH = "current/public/images/blog";
const DEFAULT_BRANCH = "dev";

/**
 * Create an Octokit instance with authentication
 */
export function createGitHubClient(githubToken: string): Octokit {
  return new Octokit({ auth: githubToken });
}

/**
 * Get the latest commit SHA for a branch
 */
async function getLatestCommitSha(
  octokit: Octokit,
  branch: string = DEFAULT_BRANCH
): Promise<string> {
  const { data } = await octokit.repos.getBranch({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    branch,
  });
  return data.commit.sha;
}

/**
 * Get a file from the repository
 * Returns null if file doesn't exist
 */
async function getFile(
  octokit: Octokit,
  path: string,
  branch: string = DEFAULT_BRANCH
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: branch,
    });

    if ("content" in data && data.type === "file") {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { content, sha: data.sha };
    }
    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create or update a file in the repository
 */
async function createOrUpdateFile(
  octokit: Octokit,
  path: string,
  content: string,
  message: string,
  branch: string = DEFAULT_BRANCH,
  sha?: string
): Promise<void> {
  const contentEncoded = Buffer.from(content).toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    content: contentEncoded,
    branch,
    ...(sha ? { sha } : {}),
  });
}

/**
 * Upload an image file to the repository
 */
async function uploadImage(
  octokit: Octokit,
  imageBuffer: Buffer,
  fileName: string,
  branch: string = DEFAULT_BRANCH
): Promise<string> {
  const imagePath = `${IMAGES_PATH}/${fileName}`;
  const contentEncoded = imageBuffer.toString("base64");

  // Check if file already exists
  const existingFile = await getFile(octokit, imagePath, branch);

  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: imagePath,
    message: `Add blog image: ${fileName}`,
    content: contentEncoded,
    branch,
    ...(existingFile ? { sha: existingFile.sha } : {}),
  });

  return `/images/blog/${fileName}`;
}

/**
 * Write blog post to the repository using GitHub API
 */
export async function writeBlogPostToGitHub(
  githubToken: string,
  post: BlogPost,
  uploadedImageBuffer?: Buffer,
  branch: string = DEFAULT_BRANCH
): Promise<{ postPath: string; imagePath?: string }> {
  const octokit = createGitHubClient(githubToken);

  // Generate filename from slug
  const filename = `${post.slug}.md`;
  const postPath = `${BLOG_PATH}/${filename}`;

  let imagePath: string | undefined;

  // Handle uploaded image
  if (uploadedImageBuffer) {
    try {
      const imageFileName = `${post.slug}-cover.png`;
      imagePath = await uploadImage(octokit, uploadedImageBuffer, imageFileName, branch);
      console.log(`Uploaded image: ${imagePath}`);
    } catch (error) {
      console.warn("Could not upload image, using default:", error);
    }
  }

  // Write markdown file
  const markdown = formatBlogPost(post);

  // Check if file already exists
  const existingFile = await getFile(octokit, postPath, branch);

  await createOrUpdateFile(
    octokit,
    postPath,
    markdown,
    existingFile
      ? `Update blog post: ${post.meta.title}`
      : `Add blog post: ${post.meta.title}`,
    branch,
    existingFile?.sha
  );

  console.log(`Blog post ${existingFile ? 'updated' : 'created'}: ${postPath}`);

  return { postPath, imagePath };
}

/**
 * List existing blog posts from the repository
 */
export async function listExistingPosts(
  githubToken: string,
  branch: string = DEFAULT_BRANCH
): Promise<string[]> {
  const octokit = createGitHubClient(githubToken);

  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: BLOG_PATH,
      ref: branch,
    });

    if (Array.isArray(data)) {
      return data
        .filter((item) => item.type === "file" && item.name.endsWith(".md"))
        .map((item) => item.name);
    }
    return [];
  } catch {
    return [];
  }
}
