/* Motion fallback: keeps the experience expressive when WebGL/CDNs are unavailable. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = document.querySelectorAll('.showroom-3d, .presentacion, #resenas, #oportunidad, #contacto');
  const reveal = (el) => el.classList.add('is-live');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { reveal(entry.target); io.unobserve(entry.target); } }), {rootMargin:'0px 0px -12% 0px', threshold:.08});
    sections.forEach(el => io.observe(el));
  } else sections.forEach(reveal);
  if (!window.THREE) document.querySelectorAll('[data-showroom-id]').forEach(button => button.addEventListener('click', () => {
    if (typeof window.nexoOpenProduct === 'function') window.nexoOpenProduct(button.dataset.showroomId);
    else document.querySelector('#catalogo')?.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
  }));
})();
