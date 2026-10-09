(() => {
  if (!window.Lenis) return;

  const lenis = new window.Lenis({
    autoRaf: true,
    anchors: true,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    lerp: .065,
    respectReducedMotion: true,
    stopInertiaOnNavigate: true
  });

  window.in4techLenis = lenis;
})();
