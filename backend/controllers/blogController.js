const { query } = require('../config/database');

const LIMITS = { title: 160, summary: 400, author: 80, content: 100000 };
const STATUSES = ['draft', 'published'];
const LIST_FIELDS = 'id, slug, title, summary, author, status, content, created_at, updated_at, published_at';

const line = (value, max) => String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const text = (value, max) => String(value || '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));

function slugify(title) {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
  return slug || 'article';
}

function readingMinutes(content) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function blogFromRow(row, { includeContent = true } = {}) {
  const post = {
    id: row.id,
    slug: row.slug,
    title: row.title || '',
    summary: row.summary || '',
    author: row.author || '',
    status: STATUSES.includes(row.status) ? row.status : 'draft',
    readingMinutes: readingMinutes(row.content || ''),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    publishedAt: row.published_at || null
  };
  if (includeContent) post.content = row.content || '';
  return post;
}

function validate(body) {
  const post = {
    title: line(body.title, LIMITS.title),
    summary: line(body.summary, LIMITS.summary),
    author: line(body.author, LIMITS.author),
    content: text(body.content, LIMITS.content),
    status: STATUSES.includes(body.status) ? body.status : 'draft'
  };
  if (post.title.length < 3) return { error: 'Add a title of at least 3 characters.' };
  if (post.content.length < 20) return { error: 'Add article content of at least 20 characters.' };
  return { post };
}

async function uniqueSlug(title, ownId) {
  const base = slugify(title);
  const { rows } = await query("select id, slug from blog_posts where slug like $1 || '%'", [base]);
  const taken = new Set(rows.filter((row) => row.id !== ownId).map((row) => row.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

// Public: published articles only.
async function listPublished(req, res, next) {
  try {
    const { rows } = await query(`select ${LIST_FIELDS} from blog_posts where status = 'published' order by published_at desc`);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, posts: rows.map((row) => blogFromRow(row, { includeContent: false })) });
  } catch (error) { next(error); }
}

async function getPublished(req, res, next) {
  try {
    const { rows: [row] } = await query(`select ${LIST_FIELDS} from blog_posts where slug = $1 and status = 'published'`,
      [line(req.params.slug, 100)]);
    if (!row) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, post: blogFromRow(row) });
  } catch (error) { next(error); }
}

// Admin: all articles, including drafts.
async function listAll(req, res, next) {
  try {
    const { rows } = await query(`select ${LIST_FIELDS} from blog_posts order by updated_at desc`);
    res.json({ success: true, posts: rows.map((row) => blogFromRow(row)) });
  } catch (error) { next(error); }
}

async function createPost(req, res, next) {
  const { post, error } = validate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const now = new Date();
    const { rows: [row] } = await query(
      `insert into blog_posts (title, summary, author, content, status, slug, created_at, updated_at, published_at)
       values ($1, $2, $3, $4, $5, $6, $7, $7, $8) returning ${LIST_FIELDS}`,
      [post.title, post.summary, post.author, post.content, post.status, await uniqueSlug(post.title), now,
        post.status === 'published' ? now : null]
    );
    res.status(201).json({ success: true, post: blogFromRow(row), message: post.status === 'published' ? 'Article published.' : 'Draft saved.' });
  } catch (err) { next(err); }
}

async function updatePost(req, res, next) {
  const { post, error } = validate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const existing = isUuid(req.params.id)
      && (await query('select id, slug, published_at from blog_posts where id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found.' });
    const now = new Date();
    // Keep the URL stable once an article has been published, so shared links keep working.
    const slug = existing.published_at ? existing.slug : await uniqueSlug(post.title, existing.id);
    const { rows: [row] } = await query(
      `update blog_posts set title = $1, summary = $2, author = $3, content = $4, status = $5, slug = $6,
         updated_at = $7, published_at = $8
       where id = $9 returning ${LIST_FIELDS}`,
      [post.title, post.summary, post.author, post.content, post.status, slug, now,
        existing.published_at || (post.status === 'published' ? now : null), existing.id]
    );
    res.json({ success: true, post: blogFromRow(row), message: post.status === 'published' ? 'Article published.' : 'Draft saved.' });
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    const deleted = isUuid(req.params.id)
      ? (await query('delete from blog_posts where id = $1 returning id', [req.params.id])).rows : [];
    if (!deleted.length) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.json({ success: true, message: 'Article deleted.' });
  } catch (error) { next(error); }
}

module.exports = { listPublished, getPublished, listAll, createPost, updatePost, deletePost };
