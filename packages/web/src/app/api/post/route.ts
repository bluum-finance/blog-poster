import { NextRequest, NextResponse } from "next/server";
import { postBlog } from "@blog-poster/core";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notionUrl, author, draft, skipImages, dryRun } = body;

    if (!notionUrl) {
      return NextResponse.json(
        { success: false, error: "Notion URL is required" },
        { status: 400 }
      );
    }

    // Get credentials from environment
    const notionApiKey = process.env.NOTION_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!notionApiKey) {
      return NextResponse.json(
        { success: false, error: "NOTION_API_KEY not configured on server" },
        { status: 500 }
      );
    }

    if (!dryRun && !githubToken) {
      return NextResponse.json(
        { success: false, error: "GITHUB_TOKEN not configured on server" },
        { status: 500 }
      );
    }

    const logs: string[] = [];

    const result = await postBlog({
      notionUrl,
      notionApiKey,
      githubToken,
      geminiApiKey,
      author: author || "Bluum Team",
      draft: draft || false,
      skipImages: skipImages || !geminiApiKey,
      dryRun: dryRun || false,
      onProgress: (step, msg) => {
        logs.push(`[${step}] ${msg}`);
      },
    });

    return NextResponse.json({
      ...result,
      logs,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
