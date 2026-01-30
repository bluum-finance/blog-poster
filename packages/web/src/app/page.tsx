"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

interface PostResult {
  success: boolean;
  slug?: string;
  commitHash?: string;
  markdown?: string;
  error?: string;
  logs?: string[];
  coverImageData?: string;
  postImageData?: string;
}

export default function Home() {
  const [notionUrl, setNotionUrl] = useState("");
  const [author, setAuthor] = useState("Bluum Team");
  const [draft, setDraft] = useState(false);
  const [skipImages, setSkipImages] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<PostResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent, dryRun: boolean) => {
    e.preventDefault();
    setStatus("loading");
    setResult(null);
    setLogs([]);

    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notionUrl,
          author,
          draft,
          skipImages,
          dryRun,
        }),
      });

      const data = await response.json();
      setResult(data);
      setLogs(data.logs || []);
      setStatus(data.success ? "success" : "error");
    } catch (error: any) {
      setResult({ success: false, error: error.message });
      setStatus("error");
    }
  };

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.title}>Blog Poster</h1>
        <p style={styles.subtitle}>Post Notion blogs to Bluum website</p>

        <form style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Notion Page URL</label>
            <input
              type="url"
              placeholder="https://notion.so/your-page-id"
              value={notionUrl}
              onChange={(e) => setNotionUrl(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Author</label>
            <input
              type="text"
              placeholder="Author name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
              />
              <span>Mark as draft</span>
            </label>

            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={skipImages}
                onChange={(e) => setSkipImages(e.target.checked)}
              />
              <span>Skip image generation</span>
            </label>
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={status === "loading" || !notionUrl}
              style={{ ...styles.button, ...styles.previewButton }}
            >
              {status === "loading" ? "Processing..." : "Preview"}
            </button>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={status === "loading" || !notionUrl}
              style={{ ...styles.button, ...styles.publishButton }}
            >
              {status === "loading" ? "Publishing..." : "Publish to Dev"}
            </button>
          </div>
        </form>

        {/* Logs */}
        {logs.length > 0 && (
          <div style={styles.logs}>
            <h3 style={styles.logsTitle}>Progress</h3>
            {logs.map((log, i) => (
              <div key={i} style={styles.logLine}>
                {log}
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              ...styles.result,
              ...(result.success ? styles.successResult : styles.errorResult),
            }}
          >
            {result.success ? (
              <>
                <h3>Success!</h3>
                {result.slug && <p>Slug: {result.slug}</p>}
                {result.commitHash && <p>Commit: {result.commitHash}</p>}
                {result.markdown && (
                  <>
                    <button
                      onClick={() => {
                        // Store image data in sessionStorage (too large for URL params)
                        if (result.coverImageData) {
                          sessionStorage.setItem("previewCoverImage", result.coverImageData);
                        }
                        if (result.postImageData) {
                          sessionStorage.setItem("previewPostImage", result.postImageData);
                        }
                        const params = new URLSearchParams({
                          markdown: result.markdown || "",
                        });
                        window.open(`/preview?${params.toString()}`, "_blank");
                      }}
                      style={styles.viewPreviewButton}
                    >
                      View Rendered Preview
                    </button>
                    <details style={styles.preview}>
                      <summary>View Raw Markdown</summary>
                      <pre style={styles.markdown}>{result.markdown}</pre>
                    </details>
                  </>
                )}
              </>
            ) : (
              <>
                <h3>Error</h3>
                <p>{result.error}</p>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  container: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "40px",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    color: "#1a1a2e",
  },
  subtitle: {
    margin: "0 0 32px 0",
    color: "#666",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  input: {
    padding: "12px 16px",
    fontSize: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  checkboxGroup: {
    display: "flex",
    gap: "20px",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#555",
    cursor: "pointer",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    marginTop: "12px",
  },
  button: {
    flex: 1,
    padding: "14px 24px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "transform 0.1s, opacity 0.2s",
  },
  previewButton: {
    background: "#e0e0e0",
    color: "#333",
  },
  publishButton: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
  },
  logs: {
    marginTop: "24px",
    padding: "16px",
    background: "#f5f5f5",
    borderRadius: "8px",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  logsTitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    color: "#333",
  },
  logLine: {
    padding: "4px 0",
    color: "#555",
  },
  result: {
    marginTop: "24px",
    padding: "20px",
    borderRadius: "8px",
  },
  successResult: {
    background: "#e8f5e9",
    border: "1px solid #a5d6a7",
  },
  errorResult: {
    background: "#ffebee",
    border: "1px solid #ef9a9a",
  },
  preview: {
    marginTop: "16px",
  },
  markdown: {
    background: "#1a1a2e",
    color: "#e0e0e0",
    padding: "16px",
    borderRadius: "8px",
    overflow: "auto",
    maxHeight: "300px",
    fontSize: "12px",
  },
  viewPreviewButton: {
    width: "100%",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "12px",
  },
};
