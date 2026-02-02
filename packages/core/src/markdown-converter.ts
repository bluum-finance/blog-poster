import type { NotionBlock, NotionPage, BlogPost, BlogPostMeta } from "./types.js";

/**
 * Convert a Notion page to a Blog Post with Astro-compatible markdown
 */
export function convertToBlogPost(
  page: NotionPage,
  meta: Partial<BlogPostMeta>
): BlogPost {
  const content = blocksToMarkdown(page.blocks);
  const slug = generateSlug(page.title);

  const now = new Date().toISOString();

  const fullMeta: BlogPostMeta = {
    title: meta.title || page.title,
    meta_title: meta.meta_title || "",
    description: meta.description || generateSmartDescription(page.blocks, page.title),
    date: meta.date || now,
    cover_image: meta.cover_image || "/images/blog/blog-img-6.png",
    image: meta.image || "/images/blog/blog-img-6.png",
    author: meta.author || "Bluum Team",
    author_image: meta.author_image || "/images/blog/author/default.jpg",
    draft: meta.draft ?? false,
  };

  return {
    meta: fullMeta,
    content,
    slug,
  };
}

/**
 * Generate URL-friendly slug from title (limited to maxWords)
 */
export function generateSlug(title: string, maxWords: number = 3): string {
  // Clean the title first
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .trim();

  // Split into words, take first N, rejoin
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const limitedWords = words.slice(0, maxWords);

  return limitedWords
    .join("-")
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, ""); // Trim dashes
}

/**
 * Extract description from first paragraph
 */
function extractDescription(blocks: NotionBlock[]): string {
  for (const block of blocks) {
    if (block.type === "paragraph" && block.content?.rich_text?.length > 0) {
      const text = richTextToPlain(block.content.rich_text);
      if (text.length > 10) {
        return text.slice(0, 200) + (text.length > 200 ? "..." : "");
      }
    }
  }
  return "";
}

/**
 * Generate a smart description by summarizing the article content
 */
function generateSmartDescription(blocks: NotionBlock[], title: string): string {
  // Extract all paragraph text
  const paragraphs: string[] = [];
  
  const extractParagraphs = (blockList: NotionBlock[]) => {
    for (const block of blockList) {
      if (block.type === "paragraph" && block.content?.rich_text?.length > 0) {
        const text = richTextToPlain(block.content.rich_text).trim();
        if (text.length > 20) { // Only include substantial paragraphs
          paragraphs.push(text);
        }
      }
      
      // Recursively check children
      if (block.children && block.children.length > 0) {
        extractParagraphs(block.children);
      }
    }
  };
  
  extractParagraphs(blocks);
  
  // If we have paragraphs, create a summary
  if (paragraphs.length > 0) {
    // Take the first 2-3 sentences from the first substantial paragraph
    const firstParagraph = paragraphs[0];
    const sentences = firstParagraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length > 0) {
      // Take up to 2 sentences, but limit to ~160 characters for SEO
      let description = sentences[0].trim();
      
      if (description.length < 120 && sentences.length > 1) {
        description += ". " + sentences[1].trim();
      }
      
      // Trim to reasonable length
      if (description.length > 160) {
        description = description.slice(0, 157) + "...";
      } else {
        description += ".";
      }
      
      return description;
    }
  }
  
  // Fallback: create generic description from title
  return `Learn more about ${title.toLowerCase()} and how it impacts your financial journey.`;
}

/**
 * Convert Notion blocks to Markdown
 */
function blocksToMarkdown(blocks: NotionBlock[], indent = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const block of blocks) {
    const md = blockToMarkdown(block, prefix);
    if (md) {
      lines.push(md);
    }

    // Handle children (for nested lists, toggles, etc.)
    if (block.children && block.children.length > 0) {
      lines.push(blocksToMarkdown(block.children, indent + 1));
    }
  }

  return lines.join("\n\n");
}

/**
 * Convert a single Notion block to Markdown
 */
function blockToMarkdown(block: NotionBlock, prefix = ""): string {
  switch (block.type) {
    case "paragraph":
      return prefix + richTextToMarkdown(block.content?.rich_text || []);

    case "heading_1":
      return prefix + "# " + richTextToMarkdown(block.content?.rich_text || []);

    case "heading_2":
      return prefix + "## " + richTextToMarkdown(block.content?.rich_text || []);

    case "heading_3":
      return prefix + "### " + richTextToMarkdown(block.content?.rich_text || []);

    case "bulleted_list_item":
      return prefix + "- " + richTextToMarkdown(block.content?.rich_text || []);

    case "numbered_list_item":
      return prefix + "1. " + richTextToMarkdown(block.content?.rich_text || []);

    case "to_do":
      const checked = block.content?.checked ? "x" : " ";
      return prefix + `- [${checked}] ` + richTextToMarkdown(block.content?.rich_text || []);

    case "toggle":
      return prefix + "**" + richTextToMarkdown(block.content?.rich_text || []) + "**";

    case "quote":
      return prefix + "> " + richTextToMarkdown(block.content?.rich_text || []);

    case "callout":
      const emoji = block.content?.icon?.emoji || "💡";
      return prefix + `> ${emoji} ` + richTextToMarkdown(block.content?.rich_text || []);

    case "code":
      const lang = block.content?.language || "";
      const code = richTextToPlain(block.content?.rich_text || []);
      return prefix + "```" + lang + "\n" + code + "\n" + prefix + "```";

    case "divider":
      return prefix + "---";

    case "image":
      const imageUrl = block.content?.file?.url || block.content?.external?.url || "";
      const caption = block.content?.caption?.length > 0
        ? richTextToPlain(block.content.caption)
        : "image";
      return prefix + `![${caption}](${imageUrl})`;

    case "video":
      const videoUrl = block.content?.file?.url || block.content?.external?.url || "";
      return prefix + `[Video](${videoUrl})`;

    case "embed":
      return prefix + `[Embed](${block.content?.url || ""})`;

    case "bookmark":
      return prefix + `[Bookmark](${block.content?.url || ""})`;

    case "table":
      return convertTable(block);

    case "column_list":
    case "column":
      // Columns are handled through children
      return "";

    case "raw_markdown":
      // Raw markdown content (from MCP or direct input)
      return prefix + (block.content?.markdown || "");

    default:
      // Skip unknown block types
      return "";
  }
}

/**
 * Convert Notion rich text array to Markdown
 */
function richTextToMarkdown(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return "";

  return richText
    .map((text) => {
      let content = text.plain_text || "";

      // Apply annotations
      if (text.annotations) {
        if (text.annotations.code) {
          content = "`" + content + "`";
        }
        if (text.annotations.bold) {
          content = "**" + content + "**";
        }
        if (text.annotations.italic) {
          content = "*" + content + "*";
        }
        if (text.annotations.strikethrough) {
          content = "~~" + content + "~~";
        }
        if (text.annotations.underline) {
          content = "<u>" + content + "</u>";
        }
      }

      // Handle links
      if (text.href) {
        content = `[${content}](${text.href})`;
      }

      return content;
    })
    .join("");
}

/**
 * Convert Notion rich text to plain text
 */
function richTextToPlain(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return "";
  return richText.map((text) => text.plain_text || "").join("");
}

/**
 * Convert Notion table to Markdown
 */
function convertTable(block: NotionBlock): string {
  if (!block.children || block.children.length === 0) return "";

  const rows = block.children.map((row) => {
    if (row.type !== "table_row" || !row.content?.cells) return [];
    return row.content.cells.map((cell: any[]) => richTextToMarkdown(cell));
  });

  if (rows.length === 0) return "";

  // Build markdown table
  const lines: string[] = [];

  // Header row
  lines.push("| " + rows[0].join(" | ") + " |");

  // Separator
  lines.push("| " + rows[0].map(() => "---").join(" | ") + " |");

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines.push("| " + rows[i].join(" | ") + " |");
  }

  return lines.join("\n");
}

/**
 * Format blog post as Astro-compatible markdown with frontmatter
 */
export function formatBlogPost(post: BlogPost): string {
  const frontmatter = [
    "---",
    `title: "${post.meta.title.replace(/"/g, '\\"')}"`,
    `meta_title: "${post.meta.meta_title.replace(/"/g, '\\"')}"`,
    `description: "${post.meta.description.replace(/"/g, '\\"')}"`,
    `date: ${post.meta.date}`,
    `cover_image: "${post.meta.cover_image}"`,
    `image: "${post.meta.image}"`,
    `author: "${post.meta.author}"`,
    `author_image: "${post.meta.author_image}"`,
    `draft: ${post.meta.draft}`,
    "---",
  ].join("\n");

  return frontmatter + "\n\n" + post.content;
}
