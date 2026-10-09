(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Approach line and cloud route animation run once when their section is visible.
  const onceObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      if (entry.target.matches('.tech-board') && !reduceMotion) {
        entry.target.querySelectorAll('.cloud-flow-dot animateMotion').forEach((motion) => {
          try { motion.beginElement(); } catch (_) { /* Static connectors remain visible if SVG motion is unavailable. */ }
        });
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.trust-grid,.tech-board').forEach((element) => onceObserver.observe(element));

  // Client quote placeholder carousel: controls advance a single full-width panel.
  const quoteTrack = document.querySelector('.testimonial-placeholder-grid');
  if (quoteTrack) {
    quoteTrack.parentElement.querySelectorAll('[data-testimonial-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = quoteTrack.querySelector('.testimonial-card');
        if (!card) return;
        const distance = card.getBoundingClientRect().width + parseFloat(getComputedStyle(quoteTrack).gap || 0);
        quoteTrack.scrollBy({ left: Math.sign(Number(button.dataset.testimonialStep)) * distance, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }

  // A low-opacity cursor glow is restricted to fine pointers; no continuous animation loop.
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let frame = 0;
    document.addEventListener('pointermove', (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--cursor-glow-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--cursor-glow-y', `${event.clientY}px`);
        frame = 0;
      });
    }, { passive: true });
  }
})();
