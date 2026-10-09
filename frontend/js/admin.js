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

  request('/api/admin/contacts')
    .then((data) => {
      showDashboard();
      renderContacts(data.contacts || []);
    })
    .catch(() => showLogin());
})();
