const { getSupabase, unwrap } = require('../config/supabase');

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
  const rows = unwrap(await getSupabase().from('blog_posts').select('id, slug').like('slug', `${base}%`));
  const taken = new Set(rows.filter((row) => row.id !== ownId).map((row) => row.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

// Public: published articles only.
async function listPublished(req, res, next) {
  try {
    const rows = unwrap(await getSupabase().from('blog_posts').select(LIST_FIELDS)
      .eq('status', 'published').order('published_at', { ascending: false }));
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, posts: rows.map((row) => blogFromRow(row, { includeContent: false })) });
  } catch (error) { next(error); }
}

async function getPublished(req, res, next) {
  try {
    const row = unwrap(await getSupabase().from('blog_posts').select(LIST_FIELDS)
      .eq('slug', line(req.params.slug, 100)).eq('status', 'published').maybeSingle());
    if (!row) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, post: blogFromRow(row) });
  } catch (error) { next(error); }
}

// Admin: all articles, including drafts.
async function listAll(req, res, next) {
  try {
    const rows = unwrap(await getSupabase().from('blog_posts').select(LIST_FIELDS).order('updated_at', { ascending: false }));
    res.json({ success: true, posts: rows.map((row) => blogFromRow(row)) });
  } catch (error) { next(error); }
}

async function createPost(req, res, next) {
  const { post, error } = validate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const now = new Date().toISOString();
    const row = unwrap(await getSupabase().from('blog_posts').insert({
      ...post,
      slug: await uniqueSlug(post.title),
      created_at: now,
      updated_at: now,
      published_at: post.status === 'published' ? now : null
    }).select(LIST_FIELDS).single());
    res.status(201).json({ success: true, post: blogFromRow(row), message: post.status === 'published' ? 'Article published.' : 'Draft saved.' });
  } catch (err) { next(err); }
}

async function updatePost(req, res, next) {
  const { post, error } = validate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const existing = isUuid(req.params.id) && unwrap(await getSupabase().from('blog_posts')
      .select('id, slug, published_at').eq('id', req.params.id).maybeSingle());
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found.' });
    const now = new Date().toISOString();
    // Keep the URL stable once an article has been published, so shared links keep working.
    const slug = existing.published_at ? existing.slug : await uniqueSlug(post.title, existing.id);
    const row = unwrap(await getSupabase().from('blog_posts').update({
      ...post,
      slug,
      updated_at: now,
      published_at: existing.published_at || (post.status === 'published' ? now : null)
    }).eq('id', existing.id).select(LIST_FIELDS).single());
    res.json({ success: true, post: blogFromRow(row), message: post.status === 'published' ? 'Article published.' : 'Draft saved.' });
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    const deleted = isUuid(req.params.id) ? unwrap(await getSupabase().from('blog_posts').delete()
      .eq('id', req.params.id).select('id')) : [];
    if (!deleted.length) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.json({ success: true, message: 'Article deleted.' });
  } catch (error) { next(error); }
}

module.exports = { listPublished, getPublished, listAll, createPost, updatePost, deletePost };
