(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false'); nav.classList.remove('open');
  }));

  const themeButton = document.querySelector('.theme-toggle');
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    themeButton.textContent = theme === 'dark' ? '☼' : '◐';
  };
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem('in4tech-theme') || 'light'; } catch (_) { /* Storage may be disabled. */ }
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem('in4tech-theme', theme); } catch (_) { /* The theme still changes for this visit. */ }
  });

  const searchDialog = document.getElementById('site-search');
  const searchInput = document.getElementById('site-search-input');
  const searchResults = document.getElementById('search-results');
  const searchHint = document.getElementById('search-hint');
  const searchableSections = [...document.querySelectorAll('main section[id]')].map((section) => ({
    id: section.id,
    title: section.querySelector('h1, h2, h3')?.textContent.trim() || section.id,
    content: section.innerText.replace(/\s+/g, ' ').trim()
  }));
  const renderSearch = () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    searchResults.replaceChildren();
    if (!query) { searchHint.textContent = 'Type to find a section.'; return; }
    const matches = searchableSections.filter((section) => `${section.title} ${section.content}`.toLocaleLowerCase().includes(query));
    searchHint.textContent = matches.length ? `${matches.length} section${matches.length === 1 ? '' : 's'} found.` : 'No matching sections. Try another search.';
    matches.forEach((section) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${section.id}`;
      link.textContent = section.title;
      link.addEventListener('click', () => searchDialog.close());
      item.append(link);
      searchResults.append(item);
    });
  };
  document.querySelector('.search-toggle').addEventListener('click', () => {
    if (searchDialog.open) return;
    searchDialog.showModal(); searchInput.value = ''; renderSearch(); searchInput.focus();
  });
  searchInput.addEventListener('input', renderSearch);
  searchDialog.addEventListener('click', (event) => {
    if (event.target === searchDialog) searchDialog.close();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('.search-toggle').hidden) {
      event.preventDefault(); document.querySelector('.search-toggle').click();
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  const backTop = document.getElementById('back-top');
  window.addEventListener('scroll', () => backTop.classList.toggle('visible', window.scrollY > 500), { passive: true });
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('shown'); observer.unobserve(entry.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  const titleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('main section h2').forEach((heading) => {
    heading.classList.add('title-reveal');
    titleObserver.observe(heading);
  });

  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target; const target = Number(element.dataset.count); const suffix = element.dataset.suffix || '';
      const start = performance.now(); const duration = 1300;
      const tick = (now) => { const progress = Math.min((now - start) / duration, 1); element.textContent = `${Math.floor(target * (1 - Math.pow(1 - progress, 3)))}${suffix}`; if (progress < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); observer.unobserve(element);
    });
  }, { threshold: 0.55 });
  document.querySelectorAll('[data-count]').forEach((counter) => counterObserver.observe(counter));

  const filterButtons = document.querySelectorAll('.project-filters button');
  const projects = document.querySelectorAll('.project-card');
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    const filter = button.dataset.filter;
    projects.forEach((project) => project.classList.toggle('is-hidden', filter !== 'all' && project.dataset.category !== filter));
  }));

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submitButton = form?.querySelector('button[type="submit"]');
  document.querySelectorAll('[data-interest]').forEach((link) => link.addEventListener('click', () => {
    const subject = form.elements.namedItem('subject');
    if (subject) subject.value = `Enquiry: ${link.dataset.interest}`;
  }));
  // The contact form is only on the homepage.
  if (form) form.addEventListener('submit', async (event) => {
    event.preventDefault(); status.className = ''; status.textContent = '';
    if (!form.reportValidity()) return;
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your message…';
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'We could not send your message. Please try again.');
      status.className = 'success';
      status.textContent = result.message || 'Thanks for reaching out. Your message has been received.';
      form.reset();
    } catch (error) {
      status.className = 'error';
      status.textContent = error instanceof TypeError || error.message === 'We could not send your message. Please try again.'
        ? 'The contact service is unavailable right now.'
        : error.message;
      const emailLink = document.createElement('a');
      emailLink.href = 'mailto:rajneesh@in4rtech.com';
      emailLink.textContent = 'Email our team';
      status.append(' ', emailLink);
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });

  const sections = document.querySelectorAll('main section[id]');
  const navLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
      navLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-35% 0px -58% 0px' });
  sections.forEach((section) => activeObserver.observe(section));
})();

