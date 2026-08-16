import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import {
  CreatePostBody,
  CreatePostResponse,
  UpdatePostBody,
  UpdatePostParams,
  UpdatePostResponse,
  GetPostParams,
  GetPostResponse,
  DeletePostParams,
  GetPostBySlugParams,
  GetPostBySlugResponse,
  ListPostsQueryParams,
  ListPostsResponse,
  GetBlogStatsResponse,
  ListTagsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function readingMinutes(content: string): number {
  return Math.max(1, Math.round(countWords(content) / 200));
}

type DbPost = typeof postsTable.$inferSelect;

function serialize(post: DbPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    folder: post.folder,
    tags: post.tags,
    status: post.status,
    readingMinutes: readingMinutes(post.content),
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

router.get("/posts", async (req, res): Promise<void> => {
  const query = ListPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const status = query.data.status;
  const rows = await db
    .select()
    .from(postsTable)
    .where(status ? eq(postsTable.status, status) : undefined)
    .orderBy(desc(postsTable.updatedAt));
  res.json(ListPostsResponse.parse(rows.map(serialize)));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const slug = data.slug?.trim() || slugify(data.title) || `post-${Date.now()}`;

  const [existing] = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(eq(postsTable.slug, slug));
  if (existing) {
    res.status(409).json({ error: `A post with slug "${slug}" already exists` });
    return;
  }

  const status = data.status ?? "draft";
  const [post] = await db
    .insert(postsTable)
    .values({
      slug,
      title: data.title,
      excerpt: data.excerpt ?? "",
      content: data.content ?? "",
      folder: data.folder ?? "",
      tags: data.tags ?? [],
      status,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning();
  res.status(201).json(CreatePostResponse.parse(serialize(post!)));
});

router.get("/posts/by-slug/:slug", async (req, res): Promise<void> => {
  const params = GetPostBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slug, params.data.slug));
  if (!post || post.status !== "published") {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(GetPostBySlugResponse.parse(serialize(post)));
});

router.get("/posts/:id", async (req, res): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(GetPostResponse.parse(serialize(post)));
});

router.patch("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [current] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (data.slug && data.slug !== current.slug) {
    const [conflict] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.slug, data.slug));
    if (conflict) {
      res
        .status(409)
        .json({ error: `A post with slug "${data.slug}" already exists` });
      return;
    }
  }

  const nextStatus = data.status ?? current.status;
  let publishedAt = current.publishedAt;
  if (nextStatus === "published" && current.status !== "published") {
    publishedAt = new Date();
  } else if (nextStatus === "draft") {
    publishedAt = null;
  }

  const [post] = await db
    .update(postsTable)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.folder !== undefined ? { folder: data.folder } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      status: nextStatus,
      publishedAt,
    })
    .where(eq(postsTable.id, params.data.id))
    .returning();
  res.json(UpdatePostResponse.parse(serialize(post!)));
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .delete(postsTable)
    .where(eq(postsTable.id, params.data.id))
    .returning();
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/stats", async (_req, res): Promise<void> => {
  const rows = await db.select().from(postsTable);
  const published = rows.filter((p) => p.status === "published");
  const drafts = rows.filter((p) => p.status === "draft");
  const tagSet = new Set(published.flatMap((p) => p.tags));
  const totalWords = rows.reduce((acc, p) => acc + countWords(p.content), 0);
  const totalReadingMinutes = rows.reduce(
    (acc, p) => acc + readingMinutes(p.content),
    0,
  );
  const lastPublishedAt = published
    .map((p) => p.publishedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  res.json(
    GetBlogStatsResponse.parse({
      publishedCount: published.length,
      draftCount: drafts.length,
      tagCount: tagSet.size,
      totalWords,
      totalReadingMinutes,
      lastPublishedAt: lastPublishedAt ? lastPublishedAt.toISOString() : null,
    }),
  );
});

router.get("/tags", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ tags: postsTable.tags })
    .from(postsTable)
    .where(eq(postsTable.status, "published"));
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const result = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  res.json(ListTagsResponse.parse(result));
});

export default router;
