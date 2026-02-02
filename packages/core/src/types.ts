// Blog post metadata matching Bluum's Astro frontmatter
export interface BlogPostMeta {
  title: string;
  meta_title: string;
  description: string;
  date: string; // ISO 8601 format
  cover_image: string;
  image: string;
  author: string;
  author_image: string;
  draft: boolean;
}

export interface BlogPost {
  meta: BlogPostMeta;
  content: string; // Markdown content
  slug: string; // URL-friendly filename
}

// Notion block types we care about
export interface NotionPage {
  id: string;
  title: string;
  blocks: NotionBlock[];
}

export interface NotionBlock {
  id: string;
  type: string;
  content: any;
  children?: NotionBlock[];
}
