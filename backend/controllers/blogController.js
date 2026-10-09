const { getRealtimeDatabase } = require('../config/realtimeDatabase');

const LIMITS = { title: 160, summary: 400, author: 80, content: 100000 };
const STATUSES = ['draft', 'published'];

const line = (value, max) => String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const text = (value, max) => String(value || '').replace(/\r\n?/g, '\n').trim().slice(0, max);

function slugify(title) {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
  return slug || 'article';
}

function readingMinutes(content) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function blogFromValue(id, value, { includeContent = true } = {}) {
  const post = {
    id,
    slug: value.slug || id,
    title: value.title || '',
    summary: value.summary || '',
    author: value.author || '',
    status: STATUSES.includes(value.status) ? value.status : 'draft',
    readingMinutes: readingMinutes(value.content || ''),
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
    publishedAt: value.publishedAt || null
  };
  if (includeContent) post.content = value.content || '';
  return post;
}

async function loadPosts() {
  const snapshot = await getRealtimeDatabase().ref('blogs').once('value');
  const posts = [];
  snapshot.forEach((child) => { posts.push({ id: child.key, value: child.val() || {} }); });
  return posts;
}

const newestFirst = (a, b) => String(b.publishedAt || b.updatedAt || '').localeCompare(String(a.publishedAt || a.updatedAt || ''));

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

function uniqueSlug(title, posts, ownId) {
  const base = slugify(title);
  const taken = new Set(posts.filter((p) => p.id !== ownId).map((p) => p.value.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

// Public: published articles only.
async function listPublished(req, res, next) {
  try {
    const posts = (await loadPosts())
      .filter((p) => p.value.status === 'published')
      .map((p) => blogFromValue(p.id, p.value, { includeContent: false }))
      .sort(newestFirst);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, posts });
  } catch (error) { next(error); }
}

async function getPublished(req, res, next) {
  try {
    const slug = line(req.params.slug, 100);
    const match = (await loadPosts()).find((p) => p.value.slug === slug && p.value.status === 'published');
    if (!match) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, post: blogFromValue(match.id, match.value) });
  } catch (error) { next(error); }
}

// Admin: all articles, including drafts.
async function listAll(req, res, next) {
  try {
    const posts = (await loadPosts()).map((p) => blogFromValue(p.id, p.value)).sort(newestFirst);
    res.json({ success: true, posts });
  } catch (error) { next(error); }
}

async function createPost(req, res, next) {
  const { post, error } = validate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const now = new Date().toISOString();
    const record = {
      ...post,
      slug: uniqueSlug(post.title, await loadPosts()),
      createdAt: now,
      updatedAt: now,
      publishedAt: post.status === 'published' ? now : null
    };
    const created = getRealtimeDatabase().ref('blogs').push();
    await created.set(record);
    res.status(201).json({ success: true, post: blogFromValue(created.key, record), message: post.status === 'published' ? 'Article published.' : 'Draft saved.' });
  } catch (err) { next(err); }
}

async function updatePost(req, res, next) {
  const { post, error } = validate(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const posts = await loadPosts();
    const existing = posts.find((p) => p.id === req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found.' });
    const now = new Date().toISOString();
    // Keep the URL stable once an article has been published, so shared links keep working.
    const slug = existing.value.publishedAt ? existing.value.slug : uniqueSlug(post.title, posts, existing.id);
    const record = {
      ...existing.value,
      ...post,
      slug,
      updatedAt: now,
      publishedAt: post.status === 'published' ? (existing.value.publishedAt || now) : (existing.value.publishedAt || null)
    };
    await getRealtimeDatabase().ref(`blogs/${existing.id}`).set(record);
    res.json({ success: true, post: blogFromValue(existing.id, record), message: post.status === 'published' ? 'Article published.' : 'Draft saved.' });
  } catch (err) { next(err); }
}

async function deletePost(req, res, next) {
  try {
    const ref = getRealtimeDatabase().ref(`blogs/${req.params.id}`);
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) return res.status(404).json({ success: false, message: 'Article not found.' });
    await ref.remove();
    res.json({ success: true, message: 'Article deleted.' });
  } catch (error) { next(error); }
}

module.exports = { listPublished, getPublished, listAll, createPost, updatePost, deletePost };
