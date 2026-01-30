import { Client } from "@notionhq/client";
import type { NotionPage, NotionBlock } from "./types.js";

/**
 * Extract page ID from Notion URL
 * Handles formats like:
 * - https://www.notion.so/Page-Title-abc123def456
 * - https://www.notion.so/workspace/abc123def456
 * - abc123def456 (raw ID)
 */
export function extractPageId(notionUrl: string): string {
  // If it's already a clean ID (32 hex chars, possibly with dashes)
  const cleanId = notionUrl.replace(/-/g, "");
  if (/^[a-f0-9]{32}$/i.test(cleanId)) {
    return notionUrl;
  }

  // Extract from URL
  const match = notionUrl.match(/([a-f0-9]{32})|([a-f0-9-]{36})$/i);
  if (match) {
    return match[0];
  }

  // Try to get ID from the end of URL after last dash
  const parts = notionUrl.split("-");
  const lastPart = parts[parts.length - 1].replace(/[?#].*$/, "");
  if (/^[a-f0-9]{32}$/i.test(lastPart)) {
    return lastPart;
  }

  throw new Error(`Could not extract page ID from: ${notionUrl}`);
}

/**
 * Fetch a Notion page and all its blocks
 */
export async function fetchNotionPage(
  client: Client,
  pageId: string
): Promise<NotionPage> {
  // Get page metadata
  const page = await client.pages.retrieve({ page_id: pageId });

  // Extract title from page properties
  let title = "Untitled";
  if ("properties" in page) {
    const titleProp = page.properties.title || page.properties.Name;
    if (titleProp && "title" in titleProp && titleProp.title.length > 0) {
      title = titleProp.title.map((t: any) => t.plain_text).join("");
    }
  }

  // Get all blocks
  const blocks = await fetchAllBlocks(client, pageId);

  return {
    id: pageId,
    title,
    blocks,
  };
}

/**
 * Recursively fetch all blocks including children
 */
async function fetchAllBlocks(
  client: Client,
  blockId: string
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ("type" in block) {
        const notionBlock: NotionBlock = {
          id: block.id,
          type: block.type,
          content: (block as any)[block.type],
        };

        // Fetch children if the block has them
        if ("has_children" in block && block.has_children) {
          notionBlock.children = await fetchAllBlocks(client, block.id);
        }

        blocks.push(notionBlock);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/**
 * Create a Notion client
 */
export function createNotionClient(apiKey: string): Client {
  return new Client({ auth: apiKey });
}
