/**
 * @blog-poster/core
 *
 * Core library for posting Notion pages as blog posts to Bluum website.
 * Can be used by CLI, MCP server, or Web API.
 */

// Re-export all modules
export * from "./types.js";
export * from "./notion-reader.js";
export * from "./markdown-converter.js";
export * from "./image-generator.js";
export * from "./blog-writer.js";
export * from "./deployer.js";

// Import for orchestrator
import { createNotionClient, fetchNotionPage, extractPageId } from "./notion-reader.js";
import { convertToBlogPost, formatBlogPost } from "./markdown-converter.js";
import { generateBlogImages } from "./image-generator.js";
import { cloneRepository, writeBlogPost } from "./blog-writer.js";
import { deployToDev, ensureDevBranch } from "./deployer.js";
import type { BlogPostMeta, NotionPage, BlogPost, GeneratedImages } from "./types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

/**
 * Options for posting a blog
 */
export interface PostBlogOptions {
  // Notion source - either URL or pre-fetched page data
  notionUrl?: string;
  notionPage?: NotionPage;

  // Credentials (can be omitted if using MCP for Notion)
  notionApiKey?: string;
  githubToken?: string;
  geminiApiKey?: string;

  // Blog metadata overrides
  author?: string;
  authorImage?: string;
  draft?: boolean;

  // Image options
  skipImages?: boolean;
  customImages?: GeneratedImages;

  // Execution options
  dryRun?: boolean;
  workDir?: string;

  // Progress callback
  onProgress?: (step: string, message: string) => void;
}

/**
 * Result of posting a blog
 */
export interface PostBlogResult {
  success: boolean;
  blogPost?: BlogPost;
  markdown?: string;
  commitHash?: string;
  error?: string;
  slug?: string;
}

/**
 * Main orchestrator - posts a Notion page as a blog to Bluum website
 *
 * This function can be called from:
 * - CLI
 * - MCP server
 * - Web API
 */
export async function postBlog(options: PostBlogOptions): Promise<PostBlogResult> {
  const progress = options.onProgress || ((step, msg) => console.log(`[${step}] ${msg}`));
  const workDir = options.workDir || os.tmpdir();

  try {
    // Step 1: Get Notion page (from URL or pre-fetched)
    let notionPage: NotionPage;

    if (options.notionPage) {
      notionPage = options.notionPage;
      progress("notion", `Using provided page: "${notionPage.title}"`);
    } else if (options.notionUrl && options.notionApiKey) {
      progress("notion", "Fetching Notion page...");
      const pageId = extractPageId(options.notionUrl);
      const client = createNotionClient(options.notionApiKey);
      notionPage = await fetchNotionPage(client, pageId);
      progress("notion", `Fetched: "${notionPage.title}"`);
    } else {
      throw new Error("Either notionPage or (notionUrl + notionApiKey) must be provided");
    }

    // Step 2: Convert to blog post
    progress("convert", "Converting to markdown...");
    const meta: Partial<BlogPostMeta> = {
      author: options.author || "Bluum Team",
      author_image: options.authorImage || "/images/blog/author/default.jpg",
      draft: options.draft || false,
    };
    const blogPost = convertToBlogPost(notionPage, meta);
    progress("convert", `Converted (slug: ${blogPost.slug})`);

    // Step 3: Generate images (default to blog-img-6.png)
    let images: GeneratedImages = options.customImages || {
      coverImage: "/images/blog/blog-img-6.png",
      postImage: "/images/blog/blog-img-6.png",
    };

    if (!options.skipImages && !options.customImages && options.geminiApiKey) {
      progress("images", "Generating images with Gemini...");
      const imageDir = path.join(workDir, "blog-images");
      await fs.mkdir(imageDir, { recursive: true });
      images = await generateBlogImages(
        options.geminiApiKey,
        blogPost.meta.title,
        blogPost.meta.description,
        imageDir
      );
      progress("images", "Images generated");
    } else {
      progress("images", "Using default images");
    }

    // Update blog post with image paths
    blogPost.meta.cover_image = images.coverImage;
    blogPost.meta.image = images.postImage;

    const markdown = formatBlogPost(blogPost);

    // Dry run - return without deploying
    if (options.dryRun) {
      progress("done", "Dry run complete");
      return {
        success: true,
        blogPost,
        markdown,
        slug: blogPost.slug,
      };
    }

    // Step 4: Clone and write
    if (!options.githubToken) {
      throw new Error("githubToken is required for deployment");
    }

    progress("repo", "Cloning bluum-website repository...");
    const repoDir = await cloneRepository(workDir, options.githubToken);
    await ensureDevBranch(repoDir);
    progress("repo", "Repository ready");

    progress("write", "Writing blog post...");
    await writeBlogPost(repoDir, blogPost, images);
    progress("write", `Written: ${blogPost.slug}.md`);

    // Step 5: Deploy
    progress("deploy", "Pushing to dev branch...");
    const commitMessage = `Add blog post: ${blogPost.meta.title}`;
    const result = await deployToDev(repoDir, commitMessage);

    if (result.success) {
      progress("done", `Published! Commit: ${result.commitHash}`);
      return {
        success: true,
        blogPost,
        markdown,
        commitHash: result.commitHash,
        slug: blogPost.slug,
      };
    } else {
      throw new Error(result.error || "Deployment failed");
    }
  } catch (error: any) {
    progress("error", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Preview a Notion page as markdown without deploying
 */
export async function previewBlog(options: {
  notionUrl?: string;
  notionPage?: NotionPage;
  notionApiKey?: string;
  author?: string;
  authorImage?: string;
}): Promise<{ markdown: string; blogPost: BlogPost }> {
  let notionPage: NotionPage;

  if (options.notionPage) {
    notionPage = options.notionPage;
  } else if (options.notionUrl && options.notionApiKey) {
    const pageId = extractPageId(options.notionUrl);
    const client = createNotionClient(options.notionApiKey);
    notionPage = await fetchNotionPage(client, pageId);
  } else {
    throw new Error("Either notionPage or (notionUrl + notionApiKey) must be provided");
  }

  const meta: Partial<BlogPostMeta> = {
    author: options.author || "Bluum Team",
    author_image: options.authorImage || "/images/blog/author/default.jpg",
  };

  const blogPost = convertToBlogPost(notionPage, meta);
  const markdown = formatBlogPost(blogPost);

  return { markdown, blogPost };
}
