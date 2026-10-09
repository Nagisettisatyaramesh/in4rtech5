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
  try { savedTheme = localStorage.getItem('in4tech-theme-v2') || 'light'; } catch (_) { /* Storage may be disabled. */ }
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const bounds = themeButton.getBoundingClientRect();
    document.documentElement.style.setProperty('--theme-wipe-x', `${bounds.left + bounds.width / 2}px`);
    document.documentElement.style.setProperty('--theme-wipe-y', `${bounds.top + bounds.height / 2}px`);
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => applyTheme(theme));
    } else applyTheme(theme);
    try { localStorage.setItem('in4tech-theme-v2', theme); } catch (_) { /* The theme still changes for this visit. */ }
  });

  const heroCarousel = document.getElementById('hero-carousel');
  if (heroCarousel) {
    const slides = [...heroCarousel.querySelectorAll('[data-hero-slide]')];
    const heroSection = heroCarousel.closest('.hero');
    const counter = heroCarousel.querySelector('.hero-slide-count');
    const dots = [...heroCarousel.querySelectorAll('[data-hero-index]')];
    let activeSlide = 0;
    let isAnimating = false;
    let gestureStart = null;
    let autoTimer = 0;
    const progress = heroCarousel.querySelector('.hero-slide-progress i');
    const autoDelay = 9000;
    const slideMotionDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620;
    const showSlide = (requestedIndex) => {
      const nextIndex = (requestedIndex + slides.length) % slides.length;
      if (nextIndex === activeSlide || isAnimating) return;
      isAnimating = true;
      const outgoing = slides[activeSlide];
      const incoming = slides[nextIndex];
      outgoing.classList.remove('is-active');
      outgoing.classList.add('is-leaving');
      incoming.hidden = false;
      incoming.inert = false;
      incoming.setAttribute('aria-hidden', 'false');
      incoming.classList.add('is-active', 'is-entering');
      activeSlide = nextIndex;
      heroSection.classList.toggle('hero--slide-two', activeSlide === 1);
      dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === activeSlide)));
      counter.textContent = `${String(activeSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      resetAutoAdvance();
      window.setTimeout(() => {
        outgoing.hidden = true;
        outgoing.inert = true;
        outgoing.setAttribute('aria-hidden', 'true');
        outgoing.classList.remove('is-leaving');
        incoming.classList.remove('is-entering');
        isAnimating = false;
      }, slideMotionDuration);
    };
    const resetAutoAdvance = () => {
      if (autoTimer) window.clearTimeout(autoTimer);
      if (!progress) return;
      progress.classList.remove('is-running');
      progress.style.transform = 'scaleX(0)';
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden || heroCarousel.matches(':hover') || heroCarousel.contains(document.activeElement)) return;
      requestAnimationFrame(() => { progress.classList.add('is-running'); progress.style.transform = 'scaleX(1)'; });
      autoTimer = window.setTimeout(() => showSlide(activeSlide + 1), autoDelay);
    };
    ['mouseenter', 'focusin'].forEach((name) => heroCarousel.addEventListener(name, () => { if (autoTimer) window.clearTimeout(autoTimer); autoTimer = 0; progress?.classList.remove('is-running'); }));
    ['mouseleave', 'focusout'].forEach((name) => heroCarousel.addEventListener(name, () => window.setTimeout(resetAutoAdvance, 120)));
    document.addEventListener('visibilitychange', resetAutoAdvance);
    heroCarousel.querySelectorAll('[data-hero-step]').forEach((button) => button.addEventListener('click', () => showSlide(activeSlide + Number(button.dataset.heroStep))));
    dots.forEach((dot) => dot.addEventListener('click', () => showSlide(Number(dot.dataset.heroIndex))));
    heroCarousel.addEventListener('keydown', (event) => {
      if (event.target.closest('a,button')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); showSlide(activeSlide + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); showSlide(activeSlide - 1); }
    });
    heroCarousel.addEventListener('pointerdown', (event) => {
      if (event.target.closest('a,button') || (event.pointerType === 'mouse' && event.button !== 0)) return;
      gestureStart = { x: event.clientX, y: event.clientY };
    });
    heroCarousel.addEventListener('pointerup', (event) => {
      if (!gestureStart) return;
      const dx = event.clientX - gestureStart.x;
      const dy = event.clientY - gestureStart.y;
      if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.25) showSlide(activeSlide + (dx < 0 ? 1 : -1));
      gestureStart = null;
    });
    heroCarousel.addEventListener('pointercancel', () => { gestureStart = null; });
    resetAutoAdvance();
  }

  const particleCanvas = document.querySelector('.hero-particles');
  const particleMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (particleCanvas && !particleMotion.matches) {
    const context = particleCanvas.getContext('2d');
    const hero = particleCanvas.closest('.hero');
    if (context && hero) {
      let width = 0;
      let height = 0;
      let pixelRatio = 1;
      let particles = [];
      let pointer = null;
      let animationFrame = 0;
      let previousTime = 0;
      let isVisible = true;
      const createParticles = () => {
        const count = Math.max(18, Math.min(54, Math.round(width / (width < 700 ? 24 : 34))));
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - .5) * .026,
          vy: (Math.random() - .5) * .026,
          radius: .7 + Math.random() * 1.25,
          phase: Math.random() * Math.PI * 2
        }));
      };
      const resizeCanvas = () => {
        const bounds = hero.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        particleCanvas.width = Math.round(width * pixelRatio);
        particleCanvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        createParticles();
      };
      const drawFrame = (now) => {
        animationFrame = 0;
        if (!isVisible || document.hidden) return;
        const elapsed = Math.min(now - (previousTime || now), 32);
        previousTime = now;
        context.clearRect(0, 0, width, height);
        const dark = document.documentElement.dataset.theme === 'dark';
        const tone = dark ? '112,217,194' : '19,142,121';
        const maxDistance = width < 700 ? 105 : 150;
        particles.forEach((particle, index) => {
          if (pointer) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 140 && distance > 0) {
              const force = (1 - distance / 140) * .000045 * elapsed;
              particle.vx += dx / distance * force;
              particle.vy += dy / distance * force;
            }
          }
          particle.vx = Math.max(-.034, Math.min(.034, particle.vx));
          particle.vy = Math.max(-.034, Math.min(.034, particle.vy));
          particle.x += particle.vx * elapsed;
          particle.y += particle.vy * elapsed;
          if (particle.x < -4) particle.x = width + 4;
          if (particle.x > width + 4) particle.x = -4;
          if (particle.y < -4) particle.y = height + 4;
          if (particle.y > height + 4) particle.y = -4;
          particle.phase += elapsed * .0014;
          for (let next = index + 1; next < particles.length; next += 1) {
            const other = particles[next];
            const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
            if (distance >= maxDistance) continue;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = `rgba(${tone},${(1 - distance / maxDistance) * (dark ? .24 : .17)})`;
            context.lineWidth = .7;
            context.stroke();
          }
          const shimmer = .55 + (Math.sin(particle.phase) + 1) * .2;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fillStyle = `rgba(${tone},${shimmer})`;
          context.fill();
        });
        animationFrame = requestAnimationFrame(drawFrame);
      };
      const startParticles = () => {
        if (animationFrame || !isVisible || document.hidden) return;
        previousTime = 0;
        animationFrame = requestAnimationFrame(drawFrame);
      };
      const stopParticles = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      };
      resizeCanvas();
      startParticles();
      window.addEventListener('resize', resizeCanvas, { passive: true });
      hero.addEventListener('pointermove', (event) => {
        const bounds = hero.getBoundingClientRect();
        pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { pointer = null; });
      document.addEventListener('visibilitychange', () => document.hidden ? stopParticles() : startParticles());
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        isVisible ? startParticles() : stopParticles();
      }, { threshold: 0 });
      visibilityObserver.observe(hero);
      particleMotion.addEventListener?.('change', (event) => {
        if (event.matches) stopParticles();
        else startParticles();
      });
    }
  }

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
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); document.querySelector('.search-toggle').click();
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  const assistantToggle = document.getElementById('assistant-toggle');
  const assistantPanel = document.getElementById('assistant-panel');
  const assistantClose = document.getElementById('assistant-close');
  const assistantForm = document.getElementById('assistant-form');
  const assistantInput = document.getElementById('assistant-input');
  const assistantMessages = document.getElementById('assistant-messages');
  const assistantStatus = document.getElementById('assistant-status');
  const assistantHistory = [];
  let assistantBusy = false;

  const setAssistantOpen = (open) => {
    assistantPanel.hidden = !open;
    assistantToggle.setAttribute('aria-expanded', String(open));
    if (open) assistantInput.focus();
    else assistantToggle.focus();
  };
  const addAssistantMessage = (role, content) => {
    const message = document.createElement('p');
    message.className = `assistant-message ${role === 'assistant' ? 'assistant-message-bot' : 'assistant-message-user'}`;
    message.textContent = content;
    assistantMessages.append(message);
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
    return message;
  };
  const sendAssistantMessage = async (value) => {
    const content = value.trim();
    if (!content || assistantBusy) return;
    assistantBusy = true;
    assistantInput.value = '';
    assistantInput.disabled = true;
    assistantForm.querySelector('button[type="submit"]').disabled = true;
    assistantStatus.textContent = 'Thinking…';
    assistantHistory.push({ role: 'user', content });
    addAssistantMessage('user', content);
    const pending = addAssistantMessage('assistant', 'One moment…');
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ messages: assistantHistory.slice(-8) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'The assistant is unavailable right now.');
      pending.textContent = result.answer;
      assistantHistory.push({ role: 'assistant', content: result.answer });
      assistantStatus.textContent = '';
    } catch (error) {
      pending.textContent = error.message || 'The assistant is unavailable right now.';
      assistantHistory.pop();
      assistantStatus.textContent = 'You can also contact our team below.';
    } finally {
      assistantBusy = false;
      assistantInput.disabled = false;
      assistantForm.querySelector('button[type="submit"]').disabled = false;
      assistantMessages.scrollTop = assistantMessages.scrollHeight;
      assistantInput.focus();
    }
  };

  assistantToggle.addEventListener('click', () => setAssistantOpen(assistantPanel.hidden));
  assistantClose.addEventListener('click', () => setAssistantOpen(false));
  assistantForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendAssistantMessage(assistantInput.value);
  });
  assistantInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      assistantForm.requestSubmit();
    }
  });
  document.querySelectorAll('[data-assistant-question]').forEach((button) => {
    button.addEventListener('click', () => sendAssistantMessage(button.dataset.assistantQuestion));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !assistantPanel.hidden) setAssistantOpen(false);
  });

  const backTop = document.getElementById('back-top');
  const scrollProgress = document.createElement('div');
  scrollProgress.className = 'scroll-progress';
  scrollProgress.setAttribute('aria-hidden', 'true');
  document.body.append(scrollProgress);
  let scrollFrame = 0;
  const updateScrollMotion = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.style.transform = `scaleX(${scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0})`;
      backTop.classList.toggle('visible', window.scrollY > 500);
      scrollFrame = 0;
    });
  };
  window.addEventListener('scroll', updateScrollMotion, { passive: true });
  updateScrollMotion();
  backTop.addEventListener('click', () => window.in4techLenis ? window.in4techLenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }));

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  if (finePointer.matches) {
    const trackGlow = (element) => {
      let frame = 0;
      element.addEventListener('pointermove', (event) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const bounds = element.getBoundingClientRect();
          const x = `${((event.clientX - bounds.left) / bounds.width) * 100}%`;
          const y = `${((event.clientY - bounds.top) / bounds.height) * 100}%`;
          element.style.setProperty('--pointer-x', x);
          element.style.setProperty('--pointer-y', y);
          element.style.setProperty('--spot-x', x);
          element.style.setProperty('--spot-y', y);
          frame = 0;
        });
      });
    };
    document.querySelectorAll('.hero, .home-contact-section').forEach(trackGlow);

    document.querySelectorAll('.service-card,.consulting-card,.work-skill,.trust-card,.home-contact-card').forEach((card) => {
      card.classList.add('motion-card');
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - .5) * 5;
        const y = ((event.clientY - bounds.top) / bounds.height - .5) * -5;
        card.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
        card.style.setProperty('--spot-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
        card.style.setProperty('--spot-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });
    });

    document.querySelectorAll('.hero-actions .button-primary,.nav-cta,.home-contact-card').forEach((button) => {
      let frame = 0;
      button.addEventListener('pointermove', (event) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const bounds = button.getBoundingClientRect();
          const x = (event.clientX - bounds.left - bounds.width / 2) * .07;
          const y = (event.clientY - bounds.top - bounds.height / 2) * .07;
          button.style.setProperty('--magnet-x', `${x.toFixed(2)}px`);
          button.style.setProperty('--magnet-y', `${y.toFixed(2)}px`);
          frame = 0;
        });
      });
      button.addEventListener('pointerleave', () => {
        button.style.removeProperty('--magnet-x');
        button.style.removeProperty('--magnet-y');
      });
    });

    const dashboardTilt = document.querySelector('#about .dashboard-tilt');
    if (dashboardTilt) {
      dashboardTilt.addEventListener('pointermove', (event) => {
        const bounds = dashboardTilt.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        dashboardTilt.style.setProperty('--dashboard-tilt-x', `${(-y * 4).toFixed(2)}deg`);
        dashboardTilt.style.setProperty('--dashboard-tilt-y', `${(x * 5).toFixed(2)}deg`);
      });
      dashboardTilt.addEventListener('pointerleave', () => {
        dashboardTilt.style.removeProperty('--dashboard-tilt-x');
        dashboardTilt.style.removeProperty('--dashboard-tilt-y');
      });
    }
  }

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
      const format = (value) => `${element.dataset.countFormat === '2-digit' ? String(value).padStart(2, '0') : value}${suffix}`;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { element.textContent = format(target); observer.unobserve(element); return; }
      const start = performance.now(); const duration = Number(element.dataset.countDuration) || 1300;
      const tick = (now) => { const progress = Math.min((now - start) / duration, 1); element.textContent = format(Math.floor(target * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) requestAnimationFrame(tick); };
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
  document.querySelectorAll('[data-interest]').forEach((link) => link.addEventListener('click', () => {
    try { sessionStorage.setItem('in4tech-project-interest', link.dataset.interest); } catch (_) {}
  }));
  if (form) {
  const status = document.getElementById('form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const subject = form.elements.namedItem('subject');
  try {
    const interest = sessionStorage.getItem('in4tech-project-interest');
    if (interest && subject) subject.value = `Enquiry: ${interest}`;
    sessionStorage.removeItem('in4tech-project-interest');
  } catch (_) {}
  form.addEventListener('submit', async (event) => {
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
  }

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

