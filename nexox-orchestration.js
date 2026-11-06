/* Nexox Reframe — 20+ purposeful motions: reveal, scrub, tilt, parallax, counters and section choreography. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gs = window.gsap;
  const ST = window.ScrollTrigger;
  const qs = (s, c=document) => c.querySelector(s);
  const qsa = (s, c=document) => [...c.querySelectorAll(s)];

  qsa('.bento-tile,.pieza,.showroom-product,.swap-card,.dato,.como-paso,.stat').forEach(el => el.classList.add('rf-spotlight','rf-reveal'));
  qsa('.bento-tile,.pieza,.showroom-product,.swap-card').forEach(el => el.dataset.tilt = '');

  // Pointer tilt: one shared listener, no per-card animation loop.
  if (!reduced) {
    qsa('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => { const r=el.getBoundingClientRect(); el.style.setProperty('--spot-x',`${e.clientX-r.left}px`); el.style.setProperty('--spot-y',`${e.clientY-r.top}px`); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5; el.style.transform=`perspective(900px) rotateX(${y*-3}deg) rotateY(${x*4}deg) translateY(-6px)`; }, {passive:true});
      el.addEventListener('pointerleave', () => { el.style.transform=''; }, {passive:true});
    });
  }
  if (!gs || !ST || reduced) return;
  gs.registerPlugin(ST);
  const mm = gs.matchMedia();

  // 01–07: opening sequence.
  const intro = gs.timeline({defaults:{ease:'power4.out'}});
  intro.fromTo('header',{y:-40,autoAlpha:0},{y:0,autoAlpha:1,duration:.8})
    .fromTo('.hero .lbl',{x:-30,autoAlpha:0},{x:0,autoAlpha:1,duration:.55},'-=.35')
    .fromTo('.hero-h .h-linea > span',{y:'115%'},{y:0,duration:1.05,stagger:.13},'-=.2')
    .fromTo('.hero-sub',{y:24,autoAlpha:0},{y:0,autoAlpha:1,duration:.65},'-=.5')
    .fromTo('.hero-ctas',{y:20,autoAlpha:0},{y:0,autoAlpha:1,duration:.55},'-=.38')
    .fromTo('.hero-check',{y:16,autoAlpha:0},{y:0,autoAlpha:1,duration:.5},'-=.34')
    .fromTo('.hero-esfera',{scale:.78,rotation:-5,autoAlpha:0},{scale:1,rotation:0,autoAlpha:1,duration:1.15},'-=.85');

  // 08: hero art and 09: product ribbon parallax.
  gs.to('.hero-arte',{yPercent:-12,scale:1.12,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  gs.to('.hero-vitrina-track',{xPercent:-9,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1.4}});

  // 10–12: stats entrance + count emphasis.
  gs.fromTo('.stats-grid',{y:35,autoAlpha:0},{y:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.stats',start:'top 78%',once:true}});
  gs.fromTo('.stat-n',{scale:.78,color:'#ff6845'},{scale:1,color:'#c9ed70',stagger:.12,duration:.8,ease:'back.out(1.5)',scrollTrigger:{trigger:'.stats',start:'top 70%',once:true}});
  gs.fromTo('.stats .sec-nota',{x:-20,autoAlpha:0},{x:0,autoAlpha:1,duration:.6,scrollTrigger:{trigger:'.stats',start:'top 55%',once:true}});

  // 13–16: presentation editorial reveal.
  gs.fromTo('#presentacion .lbl',{x:-24,autoAlpha:0},{x:0,autoAlpha:1,duration:.6,scrollTrigger:{trigger:'#presentacion',start:'top 76%',once:true}});
  gs.fromTo('#presentacion h2',{y:55,autoAlpha:0},{y:0,autoAlpha:1,duration:.9,scrollTrigger:{trigger:'#presentacion',start:'top 73%',once:true}});
  gs.fromTo('.bento-tile',{y:65,rotate:1.5,autoAlpha:0},{y:0,rotate:0,autoAlpha:1,stagger:.12,duration:.8,ease:'power3.out',scrollTrigger:{trigger:'.bento',start:'top 78%',once:true}});
  gs.to('.bento-d img',{scale:1.16,ease:'none',scrollTrigger:{trigger:'.bento-d',start:'top bottom',end:'bottom top',scrub:1}});

  // 17–20: catalog opening and filters.
  gs.fromTo('.duo-panel',{rotationY:(i)=>i?-68:68,autoAlpha:0},{rotationY:0,autoAlpha:1,stagger:.1,duration:1.1,ease:'power4.inOut',scrollTrigger:{trigger:'.duo-wrap',start:'top 82%',once:true}});
  gs.fromTo('.catalogo h2',{y:45,autoAlpha:0},{y:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'#catalogo',start:'top 70%',once:true}});
  gs.fromTo('.catalogo .sec-nota',{x:25,autoAlpha:0},{x:0,autoAlpha:1,duration:.65,scrollTrigger:{trigger:'#catalogo',start:'top 62%',once:true}});
  gs.fromTo('.filtros',{y:25,autoAlpha:0},{y:0,autoAlpha:1,duration:.65,scrollTrigger:{trigger:'.filtros',start:'top 88%',once:true}});

  // 21–23: product grid choreography and hover depth.
  ST.batch('#vitrina .pieza',{start:'top 92%',interval:.06,batchMax:8,onEnter:els=>gs.fromTo(els,{y:38,autoAlpha:0,rotateX:5},{y:0,autoAlpha:1,rotateX:0,stagger:.06,duration:.65,ease:'power3.out',overwrite:true})});
  gs.to('#vitrina',{yPercent:-2,ease:'none',scrollTrigger:{trigger:'#vitrina',start:'top bottom',end:'bottom top',scrub:1}});
  gs.fromTo('#sugerencias',{y:40,autoAlpha:0},{y:0,autoAlpha:1,duration:.7,scrollTrigger:{trigger:'#sugerencias',start:'top 85%',once:true}});

  // 24–27: delivery route and result state.
  gs.fromTo('.envio-cab',{y:45,autoAlpha:0},{y:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'#envio',start:'top 75%',once:true}});
  gs.fromTo('.envio-caja',{scale:.94,autoAlpha:0},{scale:1,autoAlpha:1,duration:.8,ease:'back.out(1.3)',scrollTrigger:{trigger:'.envio-caja',start:'top 82%',once:true}});
  gs.fromTo('.envio-camion',{x:-150},{x:150,duration:1.8,ease:'power2.inOut',scrollTrigger:{trigger:'.envio-ruta',start:'top 85%',once:true}});
  gs.to('.envio-caja',{boxShadow:'18px 18px 0 rgba(11,13,15,.22)',scrollTrigger:{trigger:'.envio-caja',start:'top 70%',end:'bottom 40%',scrub:1}});

  // 28–31: steps as a guided sequence.
  gs.fromTo('#como h2',{x:-45,autoAlpha:0},{x:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'#como',start:'top 74%',once:true}});
  gs.fromTo('.como-paso',{x:70,autoAlpha:0},{x:0,autoAlpha:1,stagger:.18,duration:.75,scrollTrigger:{trigger:'.como-pasos',start:'top 78%',once:true}});
  gs.to('.como-barra i',{width:'100%',ease:'none',scrollTrigger:{trigger:'.como-track',start:'top 65%',end:'bottom 60%',scrub:1}});
  gs.fromTo('.como-num',{scale:.6,autoAlpha:0},{scale:1,autoAlpha:1,duration:.8,ease:'back.out(1.8)',scrollTrigger:{trigger:'.como-fijo',start:'top 80%',once:true}});

  // 32–35: showroom / 3D scene choreography.
  gs.fromTo('.showroom-copy',{x:-55,autoAlpha:0},{x:0,autoAlpha:1,duration:1,scrollTrigger:{trigger:'#showroom',start:'top 70%',once:true}});
  gs.fromTo('.showroom-products',{x:70,rotateY:-7,autoAlpha:0},{x:0,rotateY:0,autoAlpha:1,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'#showroom',start:'top 65%',once:true}});
  gs.to('.showroom-gridline',{backgroundPosition:'72px 72px',ease:'none',scrollTrigger:{trigger:'#showroom',start:'top bottom',end:'bottom top',scrub:1}});
  gs.fromTo('.morph-label',{y:18,autoAlpha:0},{y:0,autoAlpha:1,duration:.5,scrollTrigger:{trigger:'#showroom',start:'top 72%',once:true}});

  // 36–39: social proof and opportunity cards.
  gs.fromTo('#resenas h2',{y:50,autoAlpha:0},{y:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'#resenas',start:'top 76%',once:true}});
  gs.fromTo('.carrusel',{scale:.96,autoAlpha:0},{scale:1,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.carrusel',start:'top 78%',once:true}});
  gs.fromTo('.swap',{rotateX:8,y:60,autoAlpha:0},{rotateX:0,y:0,autoAlpha:1,duration:1,ease:'power3.out',scrollTrigger:{trigger:'#oportunidad',start:'top 70%',once:true}});
  gs.to('.swap-card',{yPercent:-3,ease:'none',scrollTrigger:{trigger:'.swap',start:'top bottom',end:'bottom top',scrub:1}});

  // 40–44: contact, data, closure and footer.
  gs.fromTo('.contacto-cta h2',{x:-55,autoAlpha:0},{x:0,autoAlpha:1,duration:.85,scrollTrigger:{trigger:'#contacto',start:'top 74%',once:true}});
  gs.fromTo('.contacto-ctas',{y:28,autoAlpha:0},{y:0,autoAlpha:1,duration:.6,scrollTrigger:{trigger:'.contacto-ctas',start:'top 84%',once:true}});
  gs.fromTo('.dato',{x:45,autoAlpha:0},{x:0,autoAlpha:1,stagger:.14,duration:.6,scrollTrigger:{trigger:'.contacto-datos',start:'top 80%',once:true}});
  gs.fromTo('.cierre-txt',{y:50,autoAlpha:0},{y:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.cierre',start:'top 74%',once:true}});
  gs.fromTo('footer .pie-col',{y:25,autoAlpha:0},{y:0,autoAlpha:1,stagger:.1,duration:.55,scrollTrigger:{trigger:'footer',start:'top 88%',once:true}});

  // Keep dynamically rendered catalogue cards included after filters / load-more.
  const refresh = new MutationObserver(() => { if (ST) ST.refresh(); });
  const vitrina = qs('#vitrina');
  if (vitrina) refresh.observe(vitrina,{childList:true});
  addEventListener('pagehide',()=>{refresh.disconnect();mm.revert()},{once:true});
})();
