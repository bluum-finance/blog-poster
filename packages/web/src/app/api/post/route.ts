import { NextRequest, NextResponse } from "next/server";
import { postBlog } from "@blog-poster/core";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export async function POST(request: NextRequest) {
  let tempFilePath: string | undefined;
  
  try {
    const formData = await request.formData();
    const notionUrl = formData.get("notionUrl") as string;
    const author = formData.get("author") as string;
    const authorImage = formData.get("authorImage") as string;
    const draft = formData.get("draft") === "true";
    const dryRun = formData.get("dryRun") === "true";
    const imageFile = formData.get("image") as File | null;

    if (!notionUrl) {
      return NextResponse.json(
        { success: false, error: "Notion URL is required" },
        { status: 400 }
      );
    }

    // Get credentials from environment
    const notionApiKey = process.env.NOTION_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

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

    // Handle uploaded image
    let uploadedImagePath: string | undefined;
    if (imageFile) {
      // Save to temporary location
      const tempDir = os.tmpdir();
      const fileExtension = imageFile.name.split(".").pop() || "png";
      tempFilePath = path.join(tempDir, `blog-upload-${Date.now()}.${fileExtension}`);
      
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(tempFilePath, buffer);
      uploadedImagePath = tempFilePath;
    }

    const logs: string[] = [];

    const result = await postBlog({
      notionUrl,
      notionApiKey,
      githubToken,
      author: author || "Bluum Team",
      authorImage: authorImage || "/images/blog/author/default.jpg",
      draft: draft || false,
      uploadedImagePath,
      dryRun: dryRun || false,
      onProgress: (step, msg) => {
        logs.push(`[${step}] ${msg}`);
      },
    });

    // Clean up temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.warn("Could not delete temporary file:", error);
      }
    }

    return NextResponse.json({
      ...result,
      logs,
    });
  } catch (error: any) {
    console.error("API error:", error);
    
    // Clean up temporary file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn("Could not delete temporary file:", cleanupError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
