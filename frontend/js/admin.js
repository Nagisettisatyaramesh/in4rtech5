(() => {
  const form = document.getElementById('login-form');
  const loginPanel = document.getElementById('login-panel');
  const loginMessage = document.getElementById('login-message');
  const dashboard = document.getElementById('dashboard');
  const list = document.getElementById('submission-list');
  const detail = document.getElementById('submission-detail');
  const logoutButton = document.getElementById('logout');

  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || 'The request could not be completed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showLogin(message = '') {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    detail.hidden = true;
    editor.hidden = true;
    loginMessage.textContent = message;
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    detail.hidden = true;
  }

  function textCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value || '—';
    row.appendChild(cell);
    return cell;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function showLoading() {
    list.replaceChildren();
    list.setAttribute('aria-busy', 'true');
    const skeleton = document.createElement('div');
    skeleton.className = 'admin-skeleton-list';
    skeleton.setAttribute('aria-hidden', 'true');
    for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
      const row = document.createElement('div');
      row.className = 'admin-skeleton-row';
      for (let cellIndex = 0; cellIndex < 4; cellIndex += 1) {
        const cell = document.createElement('span');
        cell.className = 'admin-skeleton-cell';
        row.appendChild(cell);
      }
      skeleton.appendChild(row);
    }
    list.appendChild(skeleton);
  }

  function renderContacts(contacts) {
    list.replaceChildren();
    list.removeAttribute('aria-busy');
    if (!contacts.length) {
      const empty = document.createElement('div');
      empty.className = 'admin-empty';
      const title = document.createElement('strong');
      title.textContent = 'No enquiries yet';
      const message = document.createElement('p');
      message.textContent = 'New contact form submissions will appear here.';
      empty.append(title, message);
      list.appendChild(empty);
      return;
    }
    const table = document.createElement('table');
    table.className = 'admin-table';
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Name', 'Email', 'Company', 'Received', ''].forEach((label) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      headerRow.appendChild(cell);
    });
    head.appendChild(headerRow);
    table.appendChild(head);
    const body = document.createElement('tbody');
    contacts.forEach((contact) => {
      const row = document.createElement('tr');
      textCell(row, `${contact.first_name || ''} ${contact.last_name || ''}`.trim());
      textCell(row, contact.email);
      textCell(row, contact.company);
      textCell(row, formatDate(contact.created_at));
      const action = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'View';
      button.addEventListener('click', () => showContact(contact));
      action.appendChild(button);
      row.appendChild(action);
      body.appendChild(row);
    });
    table.appendChild(body);
    list.appendChild(table);
  }

  function showContact(contact) {
    detail.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = contact.subject || 'Contact submission';
    detail.appendChild(title);
    const fields = [
      ['Name', `${contact.first_name || ''} ${contact.last_name || ''}`.trim()],
      ['Email', contact.email], ['Phone', contact.phone], ['Company', contact.company],
      ['Service', contact.service], ['Received', formatDate(contact.created_at)], ['Message', contact.message]
    ];
    fields.forEach(([label, value]) => {
      const paragraph = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      paragraph.append(strong, document.createTextNode(value || '—'));
      detail.appendChild(paragraph);
    });
    dashboard.hidden = false;
    detail.hidden = false;
  }

  async function loadContacts() {
    showLoading();
    try {
      const data = await request('/api/admin/contacts');
      renderContacts(data.contacts || []);
    } catch (error) {
      list.removeAttribute('aria-busy');
      if (error.status === 401) showLogin('Your session expired. Please sign in again.');
      else list.textContent = error.message;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    loginMessage.textContent = 'Signing in…';
    const values = new FormData(form);
    try {
      await request('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: values.get('username'), password: values.get('password') })
      });
      form.reset();
      showDashboard();
      await loadContacts();
    } catch (error) {
      loginMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    try {
      await request('/api/admin/logout', { method: 'POST' });
      showLogin('You have signed out.');
      form.reset();
    } catch (error) {
      list.textContent = error.message;
    }
  });

  // Blog posts
  const tabs = { enquiries: document.getElementById('tab-enquiries'), blogs: document.getElementById('tab-blogs') };
  const panels = { enquiries: document.getElementById('enquiries-panel'), blogs: document.getElementById('blogs-panel') };
  const blogList = document.getElementById('blog-admin-list');
  const editor = document.getElementById('blog-editor');
  const blogForm = document.getElementById('blog-form');
  const blogMessage = document.getElementById('blog-message');
  const editorTitle = document.getElementById('blog-editor-title');
  const statusPill = document.getElementById('blog-status-pill');
  const writeTab = document.getElementById('blog-write-tab');
  const previewTab = document.getElementById('blog-preview-tab');
  const contentLabel = document.getElementById('blog-content-label');
  const preview = document.getElementById('blog-preview');
  let editingId = null;
  let blogsLoaded = false;

  function selectTab(name) {
    Object.entries(tabs).forEach(([key, tab]) => {
      const active = key === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[key].hidden = !active;
    });
    detail.hidden = true;
    editor.hidden = true;
    if (name === 'blogs' && !blogsLoaded) loadBlogs();
  }
  tabs.enquiries.addEventListener('click', () => selectTab('enquiries'));
  tabs.blogs.addEventListener('click', () => selectTab('blogs'));

  function renderBlogs(posts) {
    blogList.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement('div');
      empty.className = 'admin-empty';
      const title = document.createElement('strong');
      title.textContent = 'No articles yet';
      const message = document.createElement('p');
      message.textContent = 'Select “New article” to write your first post.';
      empty.append(title, message);
      blogList.appendChild(empty);
      return;
    }
    const table = document.createElement('table');
    table.className = 'admin-table';
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Title', 'Status', 'Last updated', ''].forEach((label) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      headerRow.appendChild(cell);
    });
    head.appendChild(headerRow);
    table.appendChild(head);
    const body = document.createElement('tbody');
    posts.forEach((post) => {
      const row = document.createElement('tr');
      textCell(row, post.title);
      const status = textCell(row, post.status === 'published' ? 'Published' : 'Draft');
      status.className = `blog-status blog-status-${post.status}`;
      textCell(row, formatDate(post.updatedAt));
      const actions = document.createElement('td');
      actions.className = 'blog-row-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => openEditor(post));
      actions.appendChild(edit);
      if (post.status === 'published') {
        const view = document.createElement('a');
        view.href = `blog-post.html?slug=${encodeURIComponent(post.slug)}`;
        view.target = '_blank';
        view.rel = 'noopener';
        view.textContent = 'View ↗';
        actions.appendChild(view);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => deleteBlog(post));
      actions.appendChild(remove);
      row.appendChild(actions);
      body.appendChild(row);
    });
    table.appendChild(body);
    blogList.appendChild(table);
  }

  async function loadBlogs() {
    blogList.textContent = 'Loading articles…';
    try {
      const data = await request('/api/admin/blogs');
      blogsLoaded = true;
      renderBlogs(data.posts || []);
    } catch (error) {
      if (error.status === 401) showLogin('Your session expired. Please sign in again.');
      else blogList.textContent = error.message;
    }
  }

  function showWrite(write) {
    writeTab.setAttribute('aria-pressed', String(write));
    previewTab.setAttribute('aria-pressed', String(!write));
    contentLabel.hidden = !write;
    preview.hidden = write;
    if (!write) {
      const markdown = blogForm.elements.content.value;
      preview.innerHTML = markdown.trim() ? window.In4rtechBlog.renderMarkdown(markdown) : '<p>Nothing to preview yet.</p>';
    }
  }
  writeTab.addEventListener('click', () => showWrite(true));
  previewTab.addEventListener('click', () => showWrite(false));

  function openEditor(post = null) {
    editingId = post ? post.id : null;
    blogForm.reset();
    blogForm.elements.title.value = post ? post.title : '';
    blogForm.elements.summary.value = post ? post.summary : '';
    blogForm.elements.author.value = post ? post.author : 'Rajneesh Kumar';
    blogForm.elements.content.value = post ? post.content : '';
    editorTitle.textContent = post ? 'Edit article' : 'New article';
    statusPill.textContent = post ? (post.status === 'published' ? 'Published' : 'Draft') : '';
    statusPill.hidden = !post;
    blogMessage.textContent = '';
    showWrite(true);
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    blogForm.elements.title.focus({ preventScroll: true });
  }
  document.getElementById('new-post').addEventListener('click', () => openEditor());
  document.getElementById('blog-cancel').addEventListener('click', () => {
    if (blogForm.elements.content.value.trim() && !window.confirm('Close the editor? Unsaved changes will be lost.')) return;
    editor.hidden = true;
  });

  blogForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = event.submitter && event.submitter.value === 'published' ? 'published' : 'draft';
    const values = new FormData(blogForm);
    const payload = {
      title: values.get('title'), summary: values.get('summary'), author: values.get('author'), content: values.get('content'), status
    };
    if (String(payload.title).trim().length < 3) { blogMessage.textContent = 'Add a title of at least 3 characters.'; return; }
    if (String(payload.content).trim().length < 20) { blogMessage.textContent = 'Add article content of at least 20 characters.'; return; }
    const buttons = blogForm.querySelectorAll('button');
    buttons.forEach((button) => { button.disabled = true; });
    blogMessage.textContent = status === 'published' ? 'Publishing…' : 'Saving…';
    try {
      const data = await request(editingId ? `/api/admin/blogs/${encodeURIComponent(editingId)}` : '/api/admin/blogs', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      editingId = data.post.id;
      editorTitle.textContent = 'Edit article';
      statusPill.textContent = data.post.status === 'published' ? 'Published' : 'Draft';
      statusPill.hidden = false;
      blogMessage.textContent = data.message;
      await loadBlogs();
    } catch (error) {
      if (error.status === 401) showLogin('Your session expired. Please sign in again.');
      else blogMessage.textContent = error.message;
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  });

  async function deleteBlog(post) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    try {
      await request(`/api/admin/blogs/${encodeURIComponent(post.id)}`, { method: 'DELETE' });
      if (editingId === post.id) editor.hidden = true;
      await loadBlogs();
    } catch (error) {
      if (error.status === 401) showLogin('Your session expired. Please sign in again.');
      else blogList.textContent = error.message;
    }
  }

  request('/api/admin/contacts')
    .then((data) => {
      showDashboard();
      renderContacts(data.contacts || []);
    })
    .catch(() => showLogin());
})();
