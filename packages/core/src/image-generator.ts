import * as fs from "fs/promises";
import * as path from "path";
import type { GeneratedImages } from "./types.js";

// Default image to use when generation fails or is skipped
const DEFAULT_IMAGE = "/images/blog/blog-img-6.png";

/**
 * Generate blog images using Gemini's Imagen model
 * Returns default image path if generation fails
 */
export async function generateBlogImages(
  apiKey: string,
  title: string,
  description: string,
  outputDir: string
): Promise<GeneratedImages> {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate cover image
    console.log("Generating cover image with Gemini Imagen...");
    const coverPrompt = createCoverImagePrompt(title, description);
    const coverImagePath = await generateImageWithREST(
      apiKey,
      coverPrompt,
      path.join(outputDir, "blog-cover.png")
    );

    // Generate post image
    console.log("Generating post image with Gemini Imagen...");
    const postPrompt = createPostImagePrompt(title, description);
    const postImagePath = await generateImageWithREST(
      apiKey,
      postPrompt,
      path.join(outputDir, "blog-img.png")
    );

    return {
      coverImage: coverImagePath,
      postImage: postImagePath,
    };
  } catch (error: any) {
    console.warn(`Image generation failed: ${error.message}. Using default image.`);
    return {
      coverImage: DEFAULT_IMAGE,
      postImage: DEFAULT_IMAGE,
    };
  }
}

/**
 * Generate image using Gemini REST API directly
 * This uses the imagen-3.0-generate-002 model for image generation
 */
async function generateImageWithREST(
  apiKey: string,
  prompt: string,
  outputPath: string
): Promise<string> {
  try {
    // Use Imagen 3 model for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            personGeneration: "DONT_ALLOW",
            safetySetting: "BLOCK_MEDIUM_AND_ABOVE",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Imagen API error:", errorText);

      // Try fallback to Gemini 2.0 Flash with image generation
      return await generateWithGeminiFlash(apiKey, prompt, outputPath);
    }

    const data = await response.json();

    // Extract image from response
    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      const imageData = data.predictions[0].bytesBase64Encoded;
      const buffer = Buffer.from(imageData, "base64");

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, buffer);
      console.log(`Image saved: ${outputPath}`);
      return outputPath;
    }

    throw new Error("No image data in Imagen response");
  } catch (error: any) {
    console.error(`REST API image generation failed: ${error.message}`);
    return DEFAULT_IMAGE;
  }
}

/**
 * Fallback: Generate image using Gemini 2.0 Flash
 */
async function generateWithGeminiFlash(
  apiKey: string,
  prompt: string,
  outputPath: string
): Promise<string> {
  try {
    console.log("Trying Gemini 2.0 Flash for image generation...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Flash API error: ${errorText}`);
    }

    const data = await response.json();

    // Extract image from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, buffer);
        console.log(`Image saved with Gemini Flash: ${outputPath}`);
        return outputPath;
      }
    }

    throw new Error("No image data in Gemini Flash response");
  } catch (error: any) {
    console.error(`Gemini Flash image generation failed: ${error.message}`);
    return DEFAULT_IMAGE;
  }
}

/**
 * Create a prompt for the cover image
 */
function createCoverImagePrompt(title: string, description: string): string {
  return `Create a professional, modern blog cover image for a fintech article.

Title: "${title}"
Description: "${description}"

Style guidelines:
- Clean, minimalist design
- Professional color palette (blues, purples, or teals work well for fintech)
- Abstract geometric shapes or subtle financial imagery
- No text or logos in the image
- 16:9 aspect ratio suitable for a blog header
- Modern, tech-forward aesthetic
- High contrast for readability when text is overlaid`;
}

/**
 * Create a prompt for the post inline image
 */
function createPostImagePrompt(title: string, description: string): string {
  return `Create an illustrative image for a fintech blog post.

Topic: "${title}"
Context: "${description}"

Style guidelines:
- Informative and engaging illustration
- Can include abstract representations of financial concepts
- Professional, modern aesthetic
- Suitable for inline placement in an article
- No text, watermarks, or logos
- Clean composition with good visual balance`;
}
