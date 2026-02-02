# Blog Poster

A streamlined web application to publish Notion pages as blog posts to the Bluum website.

## Features

- 📝 Paste Notion URL → Publish to GitHub
- 👤 Author selection with auto-mapped profile images
- 🖼️ Optional cover image upload
- 📊 Auto-generated SEO-friendly descriptions
- ✅ Preview before publishing
- 🚀 One-click deployment to dev branch

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev:web

# Visit http://localhost:3001
```

### Environment Variables

Create `.env.local` in `packages/web/`:

```bash
NOTION_API_KEY=your_notion_integration_token
GITHUB_TOKEN=your_github_personal_access_token
WEBHOOK_SECRET=optional_webhook_secret
```

## Usage

1. Open the web app
2. Select author from dropdown
3. Paste Notion page URL
4. (Optional) Upload cover image
5. Click "Preview" to see the output
6. Click "Publish to Dev" to deploy

## Architecture

- **Core Library** (`packages/core/`): Shared logic for Notion → Markdown conversion
- **Web UI** (`packages/web/`): Next.js application with form interface

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy to Vercel:**

```bash
vercel
```

## Authors

- Morayo Adeniyi
- Tosin Oladokun
- Ope Sonusi

## License

Private - Bluum Internal Tool
