import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog Poster - Notion to Bluum",
  description: "Post Notion blogs to Bluum website",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
