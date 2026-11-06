/* Nexox motion direction: attention -> discovery -> confidence -> action. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = window.gsap && window.ScrollTrigger;
  if (!hasGsap || reduced) return;
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();
  mm.add('(min-width: 821px)', () => {
    const intro = gsap.timeline({defaults:{ease:'power3.out'}});
    intro.from('.hero .lbl',{autoAlpha:0,y:18,duration:.55})
      .from('.hero-h .h-linea > span',{y:'115%',duration:.9,stagger:.12},'-=.15')
      .from('.hero-sub',{autoAlpha:0,y:16,duration:.65},'-=.45')
      .from('.hero-ctas',{autoAlpha:0,y:14,duration:.55},'-=.4')
      .from('.hero-check',{autoAlpha:0,y:12,duration:.5},'-=.35')
      .from('.hero-esfera',{autoAlpha:0,scale:.88,duration:1.1},'-=.8');

    gsap.utils.toArray('.pad .lbl, .pad h2, .pad .sec-nota, .filtros, .envio-caja, .testimonial-carousel').forEach((el) => {
      gsap.from(el,{autoAlpha:0,y:28,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 86%',once:true}});
    });
    gsap.utils.toArray('#vitrina .pieza').forEach((el,i) => {
      gsap.from(el,{autoAlpha:0,y:22,duration:.55,delay:(i%6)*.035,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
    });
    gsap.to('.hero-arte',{yPercent:-5,scale:1.04,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
  });
  mm.add('(max-width: 820px)', () => {
    gsap.utils.toArray('.pad h2, .filtros, .envio-caja').forEach((el) => {
      gsap.from(el,{autoAlpha:0,y:18,duration:.55,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
    });
  });
  window.addEventListener('pagehide',()=>mm.revert(),{once:true});
})();
