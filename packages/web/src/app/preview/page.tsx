"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Placeholder image for preview (since actual blog images aren't available locally)
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop";
const PLACEHOLDER_CONTENT_IMAGE = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop";

// Check if an image path is a local path that won't work in preview
function getPreviewImageUrl(
  imagePath: string,
  isContentImage = false,
  generatedCoverImage?: string,
  generatedPostImage?: string
): string {
  if (!imagePath) {
    // Use generated images if available, otherwise placeholders
    if (isContentImage && generatedPostImage) return generatedPostImage;
    if (!isContentImage && generatedCoverImage) return generatedCoverImage;
    return isContentImage ? PLACEHOLDER_CONTENT_IMAGE : PLACEHOLDER_IMAGE;
  }

  // Local paths like /images/blog/... won't work in preview - use generated images
  if (imagePath.startsWith("/images/") || imagePath.startsWith("/public/")) {
    if (isContentImage && generatedPostImage) return generatedPostImage;
    if (!isContentImage && generatedCoverImage) return generatedCoverImage;
    return isContentImage ? PLACEHOLDER_CONTENT_IMAGE : PLACEHOLDER_IMAGE;
  }

  // Data URLs (base64) should work
  if (imagePath.startsWith("data:")) {
    return imagePath;
  }

  // External URLs should work
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Default - use generated images if available
  if (isContentImage && generatedPostImage) return generatedPostImage;
  if (!isContentImage && generatedCoverImage) return generatedCoverImage;
  return isContentImage ? PLACEHOLDER_CONTENT_IMAGE : PLACEHOLDER_IMAGE;
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const markdown = searchParams.get("markdown") || "";
  const title = searchParams.get("title") || "Blog Post Preview";
  const author = searchParams.get("author") || "Bluum Team";
  const date = searchParams.get("date") || new Date().toISOString();
  const image = searchParams.get("image") || "/images/blog/blog-img-6.png";

  // Get generated images from sessionStorage
  const [generatedCoverImage, setGeneratedCoverImage] = useState<string | undefined>();
  const [generatedPostImage, setGeneratedPostImage] = useState<string | undefined>();

  useEffect(() => {
    // Read generated images from sessionStorage (set by main page)
    const coverImg = sessionStorage.getItem("previewCoverImage");
    const postImg = sessionStorage.getItem("previewPostImage");
    if (coverImg) setGeneratedCoverImage(coverImg);
    if (postImg) setGeneratedPostImage(postImg);
  }, []);

  // Parse frontmatter from markdown if present
  let content = markdown;
  let meta = { title, author, date, image };

  if (markdown.startsWith("---")) {
    const endIndex = markdown.indexOf("---", 3);
    if (endIndex !== -1) {
      const frontmatter = markdown.slice(3, endIndex);
      content = markdown.slice(endIndex + 3).trim();

      // Parse frontmatter
      frontmatter.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length) {
          const value = valueParts.join(":").trim().replace(/^["']|["']$/g, "");
          if (key.trim() === "title") meta.title = value;
          if (key.trim() === "author") meta.author = value;
          if (key.trim() === "date") meta.date = value;
          if (key.trim() === "image") meta.image = value;
        }
      });
    }
  }

  const formattedDate = new Date(meta.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get preview-safe image URL (use generated images if available)
  const featuredImageUrl = getPreviewImageUrl(meta.image, false, generatedCoverImage, generatedPostImage);

  return (
    <main style={styles.main}>
      <article style={styles.article}>
        {/* Preview Banner */}
        <div style={{
          ...styles.previewBanner,
          background: generatedCoverImage
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}>
          {generatedCoverImage
            ? "Preview Mode - Showing AI-generated images"
            : "Preview Mode - Images shown are placeholders"}
        </div>

        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>{meta.title}</h1>
          <div style={styles.meta}>
            <span style={styles.author}>{meta.author}</span>
            <span style={styles.separator}>•</span>
            <time style={styles.date}>{formattedDate}</time>
          </div>
        </header>

        {/* Featured Image */}
        <div style={styles.featuredImage}>
          <img
            src={featuredImageUrl}
            alt={meta.title}
            style={styles.image}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 style={styles.h1}>{children}</h1>,
              h2: ({ children }) => <h2 style={styles.h2}>{children}</h2>,
              h3: ({ children }) => <h3 style={styles.h3}>{children}</h3>,
              h4: ({ children }) => <h4 style={styles.h4}>{children}</h4>,
              p: ({ children }) => <p style={styles.p}>{children}</p>,
              ul: ({ children }) => <ul style={styles.ul}>{children}</ul>,
              ol: ({ children }) => <ol style={styles.ol}>{children}</ol>,
              li: ({ children }) => <li style={styles.li}>{children}</li>,
              blockquote: ({ children }) => (
                <blockquote style={styles.blockquote}>{children}</blockquote>
              ),
              code: ({ className, children }) => {
                const isInline = !className;
                return isInline ? (
                  <code style={styles.inlineCode}>{children}</code>
                ) : (
                  <pre style={styles.codeBlock}>
                    <code>{children}</code>
                  </pre>
                );
              },
              img: ({ src, alt }) => (
                <figure style={styles.figure}>
                  <img
                    src={getPreviewImageUrl(src || "", true, generatedCoverImage, generatedPostImage)}
                    alt={alt || ""}
                    style={styles.contentImage}
                  />
                  {alt && alt !== "image" && (
                    <figcaption style={styles.figcaption}>{alt}</figcaption>
                  )}
                </figure>
              ),
              a: ({ href, children }) => (
                <a href={href} style={styles.link} target="_blank" rel="noopener">
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong style={styles.strong}>{children}</strong>
              ),
              table: ({ children }) => (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>{children}</table>
                </div>
              ),
              th: ({ children }) => <th style={styles.th}>{children}</th>,
              td: ({ children }) => <td style={styles.td}>{children}</td>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Back button */}
        <div style={styles.backWrapper}>
          <a href="/" style={styles.backButton}>
            ← Back to Editor
          </a>
        </div>
      </article>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div style={styles.loading}>Loading preview...</div>}>
      <PreviewContent />
    </Suspense>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: "100vh",
    background: "#ffffff",
    padding: "40px 20px",
  },
  article: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  previewBanner: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "32px",
  },
  header: {
    marginBottom: "32px",
    textAlign: "center",
  },
  title: {
    fontSize: "42px",
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: "1.2",
    marginBottom: "16px",
  },
  meta: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    color: "#666",
    fontSize: "14px",
  },
  author: {
    fontWeight: "500",
  },
  separator: {
    color: "#ccc",
  },
  date: {
    color: "#888",
  },
  featuredImage: {
    marginBottom: "40px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  content: {
    fontSize: "18px",
    lineHeight: "1.8",
    color: "#333",
  },
  h1: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#1a1a2e",
    marginTop: "48px",
    marginBottom: "24px",
  },
  h2: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#1a1a2e",
    marginTop: "40px",
    marginBottom: "20px",
  },
  h3: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#1a1a2e",
    marginTop: "32px",
    marginBottom: "16px",
  },
  h4: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a1a2e",
    marginTop: "28px",
    marginBottom: "14px",
  },
  p: {
    marginBottom: "24px",
  },
  ul: {
    marginBottom: "24px",
    paddingLeft: "24px",
  },
  ol: {
    marginBottom: "24px",
    paddingLeft: "24px",
  },
  li: {
    marginBottom: "8px",
  },
  blockquote: {
    borderLeft: "4px solid #667eea",
    paddingLeft: "20px",
    marginLeft: "0",
    marginRight: "0",
    marginBottom: "24px",
    fontStyle: "italic",
    color: "#555",
  },
  inlineCode: {
    background: "#f0f0f0",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "0.9em",
  },
  codeBlock: {
    background: "#1a1a2e",
    color: "#e0e0e0",
    padding: "20px",
    borderRadius: "8px",
    overflow: "auto",
    marginBottom: "24px",
    fontFamily: "monospace",
    fontSize: "14px",
  },
  figure: {
    margin: "32px 0",
  },
  contentImage: {
    width: "100%",
    height: "auto",
    borderRadius: "8px",
  },
  figcaption: {
    textAlign: "center",
    color: "#888",
    fontSize: "14px",
    marginTop: "8px",
  },
  link: {
    color: "#667eea",
    textDecoration: "none",
  },
  strong: {
    fontWeight: "600",
    color: "#1a1a2e",
  },
  tableWrapper: {
    overflowX: "auto",
    marginBottom: "24px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    background: "#f5f5f5",
    padding: "12px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontWeight: "600",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #eee",
  },
  backWrapper: {
    marginTop: "60px",
    paddingTop: "40px",
    borderTop: "1px solid #eee",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#667eea",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    fontSize: "18px",
    color: "#666",
  },
};
