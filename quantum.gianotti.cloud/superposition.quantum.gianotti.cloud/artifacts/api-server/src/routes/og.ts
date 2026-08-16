import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import { renderDefaultOgImage, renderOgImage } from "../lib/ogImage";

const router: IRouter = Router();

const CACHE_HEADER = "public, max-age=3600, stale-while-revalidate=86400";

// In-memory cache keyed by slug + updatedAt so edits invalidate automatically.
const imageCache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 200;

// Express 5 (path-to-regexp v8) no longer supports partial params like
// ":slug.png", so match the whole filename and strip the extension.
router.get("/og/:file", async (req, res): Promise<void> => {
  const file = req.params.file;
  if (!file || typeof file !== "string" || !file.endsWith(".png")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const slug = file.slice(0, -".png".length);
  if (slug === "default") {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", CACHE_HEADER);
    res.send(renderDefaultOgImage());
    return;
  }
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slug, slug));
  if (!post || post.status !== "published") {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const cacheKey = `${post.slug}:${post.updatedAt.getTime()}`;
  let png = imageCache.get(cacheKey);
  if (!png) {
    png = renderOgImage({
      title: post.title,
      excerpt: post.excerpt || undefined,
      tags: post.tags,
    });
    if (imageCache.size >= MAX_CACHE_ENTRIES) {
      imageCache.clear();
    }
    imageCache.set(cacheKey, png);
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.send(png);
});

export default router;
