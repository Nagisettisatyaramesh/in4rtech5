(() => {
  // Renders a small, safe subset of Markdown: headings, paragraphs, lists, quotes,
  // code blocks, **bold**, *italic*, `code`, links and images (http/https only).
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (url) => (/^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : null);

  function inline(source) {
    const codes = [];
    let html = escapeHtml(source).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`);
    html = html
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, url) => {
        const href = safeUrl(url.replace(/&amp;/g, '&'));
        return href ? `<img src="${escapeHtml(href)}" alt="${alt}" loading="lazy" decoding="async">` : match;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
        const href = safeUrl(url.replace(/&amp;/g, '&'));
        if (!href) return match;
        const external = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(href)}"${external}>${label}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return html.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i += 1; continue; }
      if (/^```/.test(line)) {
        const code = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i += 1; }
        i += 1;
        out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        continue;
      }
      const heading = /^(#{1,3})\s+(.*)$/.exec(line);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 4);
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        i += 1;
        continue;
      }
      if (/^>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1; }
        out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
        continue;
      }
      const listType = /^\s*[-*]\s+/.test(line) ? 'ul' : /^\s*\d+[.)]\s+/.test(line) ? 'ol' : null;
      if (listType) {
        const marker = listType === 'ul' ? /^\s*[-*]\s+/ : /^\s*\d+[.)]\s+/;
        const items = [];
        while (i < lines.length && marker.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(marker, ''))}</li>`); i += 1; }
        out.push(`<${listType}>${items.join('')}</${listType}>`);
        continue;
      }
      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) { paragraph.push(lines[i].trim()); i += 1; }
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  window.In4rtechBlog = { renderMarkdown, formatDate };

  function setStatus(element, title, message) {
    element.replaceChildren();
    const box = document.createElement('div');
    box.className = 'blog-empty';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    box.append(strong, paragraph);
    element.append(box);
    element.removeAttribute('aria-busy');
  }

  const list = document.getElementById('blog-list');
  if (list) {
    fetch('/api/blogs').then((response) => {
      if (!response.ok) throw new Error('unavailable');
      return response.json();
    }).then(({ posts = [] }) => {
      if (!posts.length) {
        setStatus(list, 'Articles are on the way', 'New articles will appear here soon. Check back later.');
        return;
      }
      list.replaceChildren();
      list.removeAttribute('aria-busy');
      posts.forEach((post) => {
        const card = document.createElement('a');
        card.className = 'blog-card';
        card.href = `blog-post.html?slug=${encodeURIComponent(post.slug)}`;
        const meta = document.createElement('span');
        meta.className = 'blog-meta';
        meta.textContent = [formatDate(post.publishedAt), `${post.readingMinutes} min read`].filter(Boolean).join(' · ');
        const title = document.createElement('h2');
        title.textContent = post.title;
        const summary = document.createElement('p');
        summary.textContent = post.summary;
        const more = document.createElement('b');
        more.innerHTML = 'Read article <span aria-hidden="true">&#8599;</span>';
        card.append(meta, title);
        if (post.summary) card.append(summary);
        card.append(more);
        list.append(card);
      });
    }).catch(() => setStatus(list, 'Articles could not be loaded', 'Please refresh the page or try again shortly.'));
  }

  const article = document.getElementById('blog-article');
  if (article) {
    const slug = new URLSearchParams(window.location.search).get('slug') || '';
    const show = (post) => {
      document.title = `${post.title} | In4rtech Solutions`;
      const description = document.querySelector('meta[name="description"]');
      if (description && post.summary) description.setAttribute('content', post.summary);
      article.querySelector('.blog-article-title').textContent = post.title;
      article.querySelector('.blog-meta').textContent = [post.author, formatDate(post.publishedAt), `${post.readingMinutes} min read`].filter(Boolean).join(' · ');
      const body = article.querySelector('.blog-body');
      body.innerHTML = renderMarkdown(post.content);
      body.removeAttribute('aria-busy');
    };
    const fail = (title, message) => {
      article.querySelector('.blog-article-title').textContent = title;
      article.querySelector('.blog-meta').textContent = '';
      setStatus(article.querySelector('.blog-body'), '', message);
    };
    if (!slug) fail('Article not found', 'Choose an article from the blog page.');
    else {
      fetch(`/api/blogs/${encodeURIComponent(slug)}`).then(async (response) => {
        if (response.status === 404) return fail('Article not found', 'This article may have been moved or unpublished.');
        if (!response.ok) throw new Error('unavailable');
        return show((await response.json()).post);
      }).catch(() => fail('Article could not be loaded', 'Please refresh the page or try again shortly.'));
    }
  }
})();
