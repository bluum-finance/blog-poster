import { NextRequest, NextResponse } from "next/server";
import { postBlog, extractPageId } from "@blog-poster/core";

/**
 * Notion Webhook Endpoint
 *
 * This endpoint can be triggered by:
 * 1. Notion automations (when a page property changes)
 * 2. Zapier/Make.com integrations
 * 3. Custom scripts
 *
 * Expected payload:
 * {
 *   "page_url": "https://notion.so/...",
 *   "author": "Author Name",
 *   "publish": true,
 *   "secret": "webhook-secret-key"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page_url, page_id, author, publish, draft, secret } = body;

    // Validate webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && secret !== webhookSecret) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    // Get page identifier
    const pageId = page_id || (page_url ? extractPageId(page_url) : null);
    if (!pageId) {
      return NextResponse.json(
        { success: false, error: "page_url or page_id is required" },
        { status: 400 }
      );
    }

    // Skip if not marked for publishing
    if (publish === false) {
      return NextResponse.json({
        success: true,
        message: "Skipped - not marked for publishing",
      });
    }

    // Get credentials
    const notionApiKey = process.env.NOTION_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!notionApiKey) {
      return NextResponse.json(
        { success: false, error: "NOTION_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    const logs: string[] = [];

    const result = await postBlog({
      notionUrl: page_url || `https://notion.so/${pageId}`,
      notionApiKey,
      githubToken,
      author: author || "Bluum Team",
      draft: draft || false,
      dryRun: false,
      onProgress: (step, msg) => {
        logs.push(`[${step}] ${msg}`);
      },
    });

    // Log for monitoring
    console.log(`Webhook processed: ${pageId}`, {
      success: result.success,
      slug: result.slug,
      error: result.error,
    });

    return NextResponse.json({
      ...result,
      logs,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: "blog-poster",
    status: "ok",
    endpoints: {
      post: "POST /api/post - Post a blog with UI options",
      webhook: "POST /api/webhook - Webhook for automations",
    },
  });
}
