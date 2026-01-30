#!/usr/bin/env node

/**
 * Blog Poster MCP Server
 *
 * Exposes tools for posting Notion blogs to Bluum website.
 * Can be used by Claude or any MCP-compatible client.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  postBlog,
  previewBlog,
  convertToBlogPost,
  formatBlogPost,
  generateSlug,
  type NotionPage,
  type NotionBlock,
  type PostBlogOptions,
} from "@blog-poster/core";

// Environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Create MCP server
const server = new Server(
  {
    name: "blog-poster",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "post_blog",
        description:
          "Post a Notion page as a blog post to Bluum website. Converts Notion content to markdown, generates images, and deploys to the dev branch.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Blog post title",
            },
            content: {
              type: "string",
              description: "Blog post content in markdown format (already converted from Notion)",
            },
            description: {
              type: "string",
              description: "Short description/summary of the blog post",
            },
            author: {
              type: "string",
              description: "Author name (default: Bluum Team)",
            },
            author_image: {
              type: "string",
              description: "Path to author image (default: /images/blog/author/default.jpg)",
            },
            draft: {
              type: "boolean",
              description: "Whether to mark as draft (default: false)",
            },
            skip_images: {
              type: "boolean",
              description: "Skip AI image generation (default: false)",
            },
            dry_run: {
              type: "boolean",
              description: "Preview without deploying (default: false)",
            },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "preview_blog",
        description:
          "Preview how a blog post will look without deploying. Returns the formatted markdown with frontmatter.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Blog post title",
            },
            content: {
              type: "string",
              description: "Blog post content in markdown format",
            },
            description: {
              type: "string",
              description: "Short description/summary",
            },
            author: {
              type: "string",
              description: "Author name",
            },
          },
          required: ["title", "content"],
        },
      },
      {
        name: "generate_slug",
        description: "Generate a URL-friendly slug from a blog title",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The blog post title to convert to a slug",
            },
          },
          required: ["title"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "post_blog": {
      const {
        title,
        content,
        description,
        author,
        author_image,
        draft,
        skip_images,
        dry_run,
      } = args as {
        title: string;
        content: string;
        description?: string;
        author?: string;
        author_image?: string;
        draft?: boolean;
        skip_images?: boolean;
        dry_run?: boolean;
      };

      // Create a NotionPage-like structure from the provided content
      const notionPage: NotionPage = {
        id: "mcp-" + Date.now(),
        title,
        blocks: [
          {
            id: "content",
            type: "raw_markdown",
            content: { markdown: content },
          },
        ],
      };

      const logs: string[] = [];
      const result = await postBlog({
        notionPage,
        githubToken: GITHUB_TOKEN,
        geminiApiKey: GEMINI_API_KEY,
        author: author || "Bluum Team",
        authorImage: author_image,
        draft: draft || false,
        skipImages: skip_images || false,
        dryRun: dry_run || false,
        onProgress: (step, msg) => {
          logs.push(`[${step}] ${msg}`);
        },
      });

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: dry_run
                    ? "Preview generated successfully"
                    : "Blog post published successfully",
                  slug: result.slug,
                  commitHash: result.commitHash,
                  logs,
                  markdown: dry_run ? result.markdown : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: result.error,
                  logs,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    case "preview_blog": {
      const { title, content, description, author } = args as {
        title: string;
        content: string;
        description?: string;
        author?: string;
      };

      const notionPage: NotionPage = {
        id: "preview-" + Date.now(),
        title,
        blocks: [
          {
            id: "content",
            type: "raw_markdown",
            content: { markdown: content },
          },
        ],
      };

      // Use a custom converter that handles raw markdown
      const blogPost = convertToBlogPost(notionPage, {
        description,
        author: author || "Bluum Team",
      });

      // Override content with the raw markdown since we're already in markdown format
      const markdown = formatBlogPost({
        ...blogPost,
        content,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                slug: blogPost.slug,
                markdown,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "generate_slug": {
      const { title } = args as { title: string };
      const slug = generateSlug(title);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ slug }, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Blog Poster MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
