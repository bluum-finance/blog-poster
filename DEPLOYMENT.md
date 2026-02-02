# Blog Poster Deployment Guide

## Quick Start: Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Environment variables ready:
  - `NOTION_API_KEY`
  - `GITHUB_TOKEN`
  - `WEBHOOK_SECRET` (optional)

### Method 1: Deploy via Vercel Dashboard (Easiest)

1. **Push to GitHub:**
   ```bash
   cd /Users/tosinoladokun/Code/blog-pusher/blog-poster
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Project:**
   - **Root Directory**: Leave as `./` (root)
   - **Build Command**: `pnpm build`
   - **Output Directory**: `packages/web/.next`
   - **Install Command**: `pnpm install`

4. **Add Environment Variables:**
   - In project settings → Environment Variables
   - Add:
     ```
     NOTION_API_KEY=your_notion_key
     GITHUB_TOKEN=your_github_token
     WEBHOOK_SECRET=your_webhook_secret (optional)
     ```

5. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - You'll get a URL like: `https://your-app.vercel.app`

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd /Users/tosinoladokun/Code/blog-pusher/blog-poster
   vercel
   ```

4. **Follow prompts:**
   - Link to existing project or create new
   - Confirm settings
   - Add environment variables when prompted

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

---

## Alternative: Deploy to Railway

Railway is another great option with good support for monorepos:

1. **Create Railway account**: https://railway.app

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Login and deploy:**
   ```bash
   cd /Users/tosinoladokun/Code/blog-pusher/blog-poster
   railway login
   railway init
   railway up
   ```

4. **Add environment variables:**
   ```bash
   railway variables set NOTION_API_KEY=your_key
   railway variables set GITHUB_TOKEN=your_token
   ```

---

## Alternative: Deploy to Render

1. **Create Render account**: https://render.com

2. **Create New Web Service**

3. **Configure:**
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `cd packages/web && pnpm start`
   - **Environment**: Node
   - **Root Directory**: `./`

4. **Add environment variables** in Render dashboard

---

## Alternative: Self-Host with Docker

### Create Dockerfile:

```dockerfile
# In: blog-poster/Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/packages/web/.next ./packages/web/.next
COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/web/package.json ./packages/web/

EXPOSE 3001
ENV PORT 3001

CMD ["pnpm", "--filter", "@blog-poster/web", "start"]
```

### Deploy with Docker:

```bash
cd /Users/tosinoladokun/Code/blog-pusher/blog-poster

# Build
docker build -t blog-poster .

# Run locally
docker run -p 3001:3001 \
  -e NOTION_API_KEY=your_key \
  -e GITHUB_TOKEN=your_token \
  blog-poster

# Or push to a registry and deploy to any cloud provider
docker tag blog-poster your-registry/blog-poster
docker push your-registry/blog-poster
```

---

## Environment Variables

Make sure these are set in your deployment platform:

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_API_KEY` | Yes | Notion integration token |
| `GITHUB_TOKEN` | Yes | GitHub personal access token with repo access |
| `WEBHOOK_SECRET` | No | Secret key for webhook authentication |

---

## Post-Deployment

After deployment:

1. **Test the application:**
   - Visit your deployment URL
   - Try posting a test blog from Notion

2. **Set up custom domain** (optional):
   - In your platform's settings
   - Add DNS records pointing to your deployment

3. **Monitor logs:**
   - Check deployment platform's log viewer
   - Watch for any errors during blog posting

4. **GitHub Permissions:**
   - Ensure your GitHub token has write access to `bluum-website` repo
   - Token should have `repo` scope

---

## Troubleshooting

### Build fails with "Cannot find module"
- Ensure `pnpm-workspace.yaml` is included in deployment
- Check that all dependencies are in `package.json`

### "Port already in use" error
- This shouldn't happen in production
- If self-hosting, change port in `packages/web/package.json`

### Git push fails
- Check GitHub token has correct permissions
- Verify token isn't expired
- Ensure `bluum-website` repo exists and is accessible

### Large bundle size warnings
- These are normal for Next.js apps
- Can be optimized later if needed

---

## Recommended: Vercel with GitHub

**Best setup for continuous deployment:**

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Every push to `main` auto-deploys
4. Pull requests get preview deployments
5. Environment variables managed in Vercel dashboard

This gives you automatic deployments with zero configuration!
