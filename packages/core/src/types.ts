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

// Image generation
export interface GeneratedImages {
  coverImage: string; // Local path or web path
  postImage: string;  // Local path or web path
  coverImageData?: string; // Base64 data URL for preview
  postImageData?: string;  // Base64 data URL for preview
}

// Config
export interface Config {
  githubToken: string;
  geminiApiKey: string;
  bluumRepoUrl: string;
  devBranch: string;
}
