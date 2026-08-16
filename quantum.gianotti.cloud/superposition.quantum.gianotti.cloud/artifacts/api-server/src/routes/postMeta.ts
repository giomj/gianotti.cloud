import { readFile } from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Serves the blog SPA shell for /posts/:slug with server-rendered Open Graph
 * meta tags, so crawlers that don't execute JavaScript (LinkedIn, Slack,
 * Twitter, etc.) see a rich preview card. The proxy routes "/posts" to this
 * service; browsers still boot the normal React app from the returned shell.
 */
const router: IRouter = Router();

const BLOG_DEV_PORT = process.env["QUANTUM_BLOG_PORT"] ?? "18590";
const IS_PROD = process.env["NODE_ENV"] === "production";

// In production the server runs from the repo root; in dev from the package
// dir. Resolve the built shell path from this module's location instead:
// dist/index.mjs -> ../../quantum-blog/dist/public/index.html
const PROD_SHELL_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../quantum-blog/dist/public/index.html",
);

async function loadShell(pathname: string): Promise<string> {
  if (!IS_PROD) {
    // In development fetch the Vite dev server so the shell includes Vite's
    // injected client/preamble scripts and the SPA still boots for humans.
    const response = await fetch(`http://127.0.0.1:${BLOG_DEV_PORT}${pathname}`, {
      headers: { accept: "text/html" },
    });
    if (!response.ok) {
      throw new Error(`Blog dev server responded ${response.status}`);
    }
    return await response.text();
  }
  return await readFile(PROD_SHELL_PATH, "utf-8");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function requestOrigin(req: {
  get(name: string): string | undefined;
  protocol: string;
}): string {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "";
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  return `${proto.split(",")[0]!.trim()}://${host.split(",")[0]!.trim()}`;
}

interface MetaInput {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  publishedAt: string | null;
  tags: string[];
}

function injectMeta(shell: string, meta: MetaInput): string {
  // Drop the static defaults so crawlers don't see duplicate/conflicting tags.
  let html = shell
    .replace(/^\s*<meta (?:name|property)="(?:og:|twitter:)[^"]*"[^>]*>\s*\r?\n/gm, "")
    .replace(/^\s*<meta name="description"[^>]*>\s*\r?\n/gm, "")
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);

  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Quantum Computing Blog" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:type" content="image/png" />`,
    ...(meta.publishedAt
      ? [`<meta property="article:published_time" content="${escapeHtml(meta.publishedAt)}" />`]
      : []),
    ...meta.tags.map(
      (tag) => `<meta property="article:tag" content="${escapeHtml(tag)}" />`,
    ),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />`,
  ].join("\n    ");

  return html.replace("</head>", `    ${tags}\n  </head>`);
}

router.get("/posts/:slug", async (req, res): Promise<void> => {
  const slug = req.params.slug ?? "";
  let shell: string;
  try {
    shell = await loadShell(req.path);
  } catch (err) {
    logger.error({ err }, "Failed to load blog HTML shell for meta injection");
    res.status(502).send("Blog frontend is not available");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slug, slug));

  if (!post || post.status !== "published") {
    // Unknown or unpublished post: serve the untouched shell and let the SPA
    // render its own not-found state.
    res.send(shell);
    return;
  }

  const origin = requestOrigin(req);
  const description =
    post.excerpt || `A post on the Quantum Computing Blog: ${post.title}`;
  res.send(
    injectMeta(shell, {
      title: `${post.title} | Quantum Computing Blog`,
      description,
      url: `${origin}/posts/${post.slug}`,
      imageUrl: `${origin}/api/og/${encodeURIComponent(post.slug)}.png`,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      tags: post.tags,
    }),
  );
});

export default router;
