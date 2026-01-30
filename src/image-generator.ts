import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import * as path from "path";
import type { GeneratedImages } from "./types.js";

/**
 * Generate blog images using Gemini's Imagen model (Nano Banana)
 */
export async function generateBlogImages(
  apiKey: string,
  title: string,
  description: string,
  outputDir: string
): Promise<GeneratedImages> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Use Gemini's image generation model
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  // Generate cover image prompt based on blog content
  const coverPrompt = createCoverImagePrompt(title, description);
  const postPrompt = createPostImagePrompt(title, description);

  console.log("Generating cover image...");
  const coverImagePath = await generateAndSaveImage(
    model,
    coverPrompt,
    path.join(outputDir, "blog-cover.png")
  );

  console.log("Generating post image...");
  const postImagePath = await generateAndSaveImage(
    model,
    postPrompt,
    path.join(outputDir, "blog-img.png")
  );

  return {
    coverImage: coverImagePath,
    postImage: postImagePath,
  };
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

/**
 * Generate an image and save it to disk
 */
async function generateAndSaveImage(
  model: any,
  prompt: string,
  outputPath: string
): Promise<string> {
  try {
    // Generate image using Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["image", "text"],
      },
    });

    const response = result.response;

    // Extract image data from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");

        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Write image file
        await fs.writeFile(outputPath, buffer);
        console.log(`Image saved: ${outputPath}`);
        return outputPath;
      }
    }

    throw new Error("No image data in response");
  } catch (error: any) {
    console.error(`Image generation failed: ${error.message}`);
    // Return a placeholder path - user can add image manually
    return outputPath;
  }
}

/**
 * Alternative: Use Imagen 3 directly if available
 */
export async function generateWithImagen(
  apiKey: string,
  prompt: string,
  outputPath: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Imagen 3 model for higher quality images
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Process and save image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, buffer);
        return outputPath;
      }
    }

    throw new Error("No image generated");
  } catch (error: any) {
    console.error(`Imagen generation failed: ${error.message}`);
    throw error;
  }
}
