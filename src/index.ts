#!/usr/bin/env node

import { program } from "commander";
import * as readline from "readline";
import { createNotionClient, fetchNotionPage, extractPageId } from "./notion-reader.js";
import { convertToBlogPost, formatBlogPost } from "./markdown-converter.js";
import { generateBlogImages } from "./image-generator.js";
import { cloneRepository, writeBlogPost } from "./blog-writer.js";
import { deployToDev, ensureDevBranch } from "./deployer.js";
import type { BlogPostMeta } from "./types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

// Environment variables
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

program
  .name("blog-poster")
  .description("Post Notion blogs to Bluum website")
  .version("1.0.0");

program
  .command("post")
  .description("Post a Notion page as a blog post to Bluum website")
  .argument("<notion-url>", "Notion page URL or ID")
  .option("-a, --author <name>", "Author name", "Bluum Team")
  .option("-ai, --author-image <path>", "Author image path", "/images/blog/author/default.jpg")
  .option("-d, --draft", "Mark as draft", false)
  .option("--skip-images", "Skip image generation", false)
  .option("--dry-run", "Preview without deploying", false)
  .option("-w, --work-dir <path>", "Working directory", os.tmpdir())
  .action(async (notionUrl, options) => {
    try {
      await postBlog(notionUrl, options);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("preview")
  .description("Preview a Notion page as markdown (no deployment)")
  .argument("<notion-url>", "Notion page URL or ID")
  .action(async (notionUrl) => {
    try {
      await previewBlog(notionUrl);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

/**
 * Main function to post a blog
 */
async function postBlog(notionUrl: string, options: any) {
  // Validate environment
  validateEnvironment(options);

  console.log("\n📝 Blog Poster - Starting...\n");

  // Step 1: Fetch Notion page
  console.log("Step 1: Fetching Notion page...");
  const pageId = extractPageId(notionUrl);
  const notionClient = createNotionClient(NOTION_API_KEY!);
  const notionPage = await fetchNotionPage(notionClient, pageId);
  console.log(`✓ Fetched: "${notionPage.title}"\n`);

  // Step 2: Convert to blog post
  console.log("Step 2: Converting to markdown...");
  const meta: Partial<BlogPostMeta> = {
    author: options.author,
    author_image: options.authorImage,
    draft: options.draft,
  };
  const blogPost = convertToBlogPost(notionPage, meta);
  console.log(`✓ Converted to markdown (slug: ${blogPost.slug})\n`);

  // Step 3: Generate images
  let images = {
    coverImage: "/images/blog/blog-cover.png",
    postImage: "/images/blog/blog-img.png",
  };

  if (!options.skipImages && GEMINI_API_KEY) {
    console.log("Step 3: Generating images with Gemini...");
    const imageDir = path.join(options.workDir, "blog-images");
    await fs.mkdir(imageDir, { recursive: true });
    images = await generateBlogImages(
      GEMINI_API_KEY,
      blogPost.meta.title,
      blogPost.meta.description,
      imageDir
    );
    console.log("✓ Images generated\n");
  } else {
    console.log("Step 3: Skipping image generation\n");
  }

  // Dry run - just preview
  if (options.dryRun) {
    console.log("--- DRY RUN - Preview ---\n");
    console.log(formatBlogPost(blogPost));
    console.log("\n--- End Preview ---");
    return;
  }

  // Step 4: Clone repository and write files
  console.log("Step 4: Cloning bluum-website repository...");
  const repoDir = await cloneRepository(options.workDir, GITHUB_TOKEN);
  await ensureDevBranch(repoDir);
  console.log("✓ Repository ready\n");

  console.log("Step 5: Writing blog post and images...");
  const { postPath } = await writeBlogPost(repoDir, blogPost, images);
  console.log(`✓ Blog post written to: ${postPath}\n`);

  // Step 6: Deploy
  console.log("Step 6: Deploying to dev branch...");
  const commitMessage = `Add blog post: ${blogPost.meta.title}`;
  const result = await deployToDev(repoDir, commitMessage);

  if (result.success) {
    console.log("\n✅ Blog post published successfully!");
    if (result.commitHash) {
      console.log(`   Commit: ${result.commitHash}`);
    }
    console.log(`   Branch: dev`);
    console.log(`   Post: ${blogPost.slug}.md`);
  } else {
    console.error("\n❌ Deployment failed:", result.error);
    process.exit(1);
  }
}

/**
 * Preview a blog without deploying
 */
async function previewBlog(notionUrl: string) {
  if (!NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY environment variable is required");
  }

  const pageId = extractPageId(notionUrl);
  const notionClient = createNotionClient(NOTION_API_KEY);
  const notionPage = await fetchNotionPage(notionClient, pageId);

  const blogPost = convertToBlogPost(notionPage, {});
  console.log(formatBlogPost(blogPost));
}

/**
 * Validate required environment variables
 */
function validateEnvironment(options: any) {
  const missing: string[] = [];

  if (!NOTION_API_KEY) {
    missing.push("NOTION_API_KEY");
  }

  if (!options.dryRun && !GITHUB_TOKEN) {
    missing.push("GITHUB_TOKEN");
  }

  if (!options.skipImages && !GEMINI_API_KEY) {
    console.warn("⚠ GEMINI_API_KEY not set - image generation will be skipped");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Set them with:\n" +
        "  export NOTION_API_KEY=your_key\n" +
        "  export GITHUB_TOKEN=your_token\n" +
        "  export GEMINI_API_KEY=your_key"
    );
  }
}

/**
 * Interactive prompt helper
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
