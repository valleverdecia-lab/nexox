/* NEXO ZERO motion system — the new composition has its own choreography. */
(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, gs=window.gsap, ST=window.ScrollTrigger;
 const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
 if(!gs||!ST||reduce)return;
 gs.registerPlugin(ST);
 const q=(s)=>gs.utils.toArray(s);
 const intro=gs.timeline({defaults:{ease:'power4.out'}});
 intro.fromTo('.site-head',{y:-30,autoAlpha:0},{y:0,autoAlpha:1,duration:.7})
 .fromTo('.zero-hero-rail',{x:-30,autoAlpha:0},{x:0,autoAlpha:1,duration:.5},'-.25')
 .fromTo('.zero-hero-copy .accent',{x:-25,autoAlpha:0},{x:0,autoAlpha:1,duration:.45},'-.2')
 .fromTo('.zero-hero-copy h1',{y:65,autoAlpha:0},{y:0,autoAlpha:1,duration:1},'-.15')
 .fromTo('.hero-deck',{y:20,autoAlpha:0},{y:0,autoAlpha:1,duration:.55},'-.45')
 .fromTo('.hero-actions',{y:18,autoAlpha:0},{y:0,autoAlpha:1,duration:.5},'-.3')
 .fromTo('.zero-hero-object',{scale:.8,rotate:5,autoAlpha:0},{scale:1,rotate:0,autoAlpha:1,duration:1.2},'-.8');
 gs.to('.zero-hero-object',{yPercent:-10,rotate:-3,ease:'none',scrollTrigger:{trigger:'.zero-hero',start:'top top',end:'bottom top',scrub:1}});
 gs.to('.object-ring.ring-a',{rotate:180,ease:'none',scrollTrigger:{trigger:'.zero-hero',start:'top top',end:'bottom top',scrub:1.2}});
 gs.to('.object-ring.ring-b',{rotate:-120,ease:'none',scrollTrigger:{trigger:'.zero-hero',start:'top top',end:'bottom top',scrub:1.4}});
 gs.fromTo('.manifesto-stamp',{x:-30,autoAlpha:0},{x:0,autoAlpha:1,duration:.6,scrollTrigger:{trigger:'.zero-manifesto',start:'top 78%',once:true}});
 gs.fromTo('.manifesto-copy',{y:55,autoAlpha:0},{y:0,autoAlpha:1,duration:.85,scrollTrigger:{trigger:'.manifesto-copy',start:'top 78%',once:true}});
 gs.fromTo('.manifesto-side',{x:45,autoAlpha:0},{x:0,autoAlpha:1,duration:.7,scrollTrigger:{trigger:'.manifesto-side',start:'top 82%',once:true}});
 gs.fromTo('.numbers-grid>div',{y:40,autoAlpha:0},{y:0,autoAlpha:1,stagger:.12,duration:.7,scrollTrigger:{trigger:'.zero-numbers',start:'top 80%',once:true}});
 gs.fromTo('.numbers-grid strong',{scale:.7,autoAlpha:0},{scale:1,autoAlpha:1,stagger:.1,duration:.8,ease:'back.out(1.5)',scrollTrigger:{trigger:'.numbers-grid',start:'top 75%',once:true}});
 gs.fromTo('.catalog-intro',{y:55,autoAlpha:0},{y:0,autoAlpha:1,duration:.85,scrollTrigger:{trigger:'.zero-catalog',start:'top 76%',once:true}});
 gs.fromTo('.catalog-tools',{y:35,autoAlpha:0},{y:0,autoAlpha:1,duration:.6,scrollTrigger:{trigger:'.catalog-tools',start:'top 85%',once:true}});
 gs.fromTo('.chips',{x:-25,autoAlpha:0},{x:0,autoAlpha:1,duration:.5,scrollTrigger:{trigger:'.chips',start:'top 88%',once:true}});
 ST.batch('#vitrina .pieza',{start:'top 94%',interval:.05,batchMax:8,onEnter:els=>gs.fromTo(els,{y:45,rotateX:7,autoAlpha:0},{y:0,rotateX:0,autoAlpha:1,stagger:.06,duration:.65,ease:'power3.out',overwrite:true})});
 gs.to('.zero-grid',{yPercent:-2,ease:'none',scrollTrigger:{trigger:'.zero-grid',start:'top bottom',end:'bottom top',scrub:1}});
 gs.fromTo('.delivery-aside',{x:-30,autoAlpha:0},{x:0,autoAlpha:1,duration:.6,scrollTrigger:{trigger:'.zero-delivery',start:'top 78%',once:true}});
 gs.fromTo('.delivery-main',{x:45,autoAlpha:0},{x:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.delivery-main',start:'top 76%',once:true}});
 gs.fromTo('.delivery-form',{scale:.95,autoAlpha:0},{scale:1,autoAlpha:1,duration:.8,ease:'back.out(1.2)',scrollTrigger:{trigger:'.delivery-form',start:'top 84%',once:true}});
 gs.fromTo('.process-head',{x:-40,autoAlpha:0},{x:0,autoAlpha:1,duration:.7,scrollTrigger:{trigger:'.zero-process',start:'top 76%',once:true}});
 gs.fromTo('.process-row',{x:60,autoAlpha:0},{x:0,autoAlpha:1,stagger:.16,duration:.7,scrollTrigger:{trigger:'.process-list',start:'top 78%',once:true}});
 gs.fromTo('.zero-lab .showroom-copy',{x:-60,autoAlpha:0},{x:0,autoAlpha:1,duration:1,scrollTrigger:{trigger:'.zero-lab',start:'top 72%',once:true}});
 gs.fromTo('.zero-lab .showroom-products',{x:70,rotateY:-8,autoAlpha:0},{x:0,rotateY:0,autoAlpha:1,duration:1.1,scrollTrigger:{trigger:'.zero-lab',start:'top 68%',once:true}});
 gs.to('.zero-lab .showroom-gridline',{backgroundPosition:'80px 80px',ease:'none',scrollTrigger:{trigger:'.zero-lab',start:'top bottom',end:'bottom top',scrub:1}});
 gs.fromTo('.testimonials-intro',{y:50,autoAlpha:0},{y:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.zero-testimonials',start:'top 75%',once:true}});
 gs.fromTo('.testimonial-carousel',{x:50,autoAlpha:0},{x:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.testimonial-carousel',start:'top 78%',once:true}});
 gs.fromTo('.zero-opportunity .opportunity-copy',{x:-45,autoAlpha:0},{x:0,autoAlpha:1,duration:.75,scrollTrigger:{trigger:'.zero-opportunity',start:'top 75%',once:true}});
 gs.fromTo('.zero-opportunity-cards',{x:55,rotate:2,autoAlpha:0},{x:0,rotate:0,autoAlpha:1,duration:1,scrollTrigger:{trigger:'.zero-opportunity-cards',start:'top 75%',once:true}});
 gs.fromTo('.contact-head',{x:-50,autoAlpha:0},{x:0,autoAlpha:1,duration:.8,scrollTrigger:{trigger:'.zero-contact',start:'top 76%',once:true}});
 gs.fromTo('.contact-details>div',{x:45,autoAlpha:0},{x:0,autoAlpha:1,stagger:.12,duration:.6,scrollTrigger:{trigger:'.contact-details',start:'top 80%',once:true}});
 gs.fromTo('.zero-end>div',{y:35,autoAlpha:0},{y:0,autoAlpha:1,duration:.7,scrollTrigger:{trigger:'.zero-end',start:'top 78%',once:true}});
 gs.fromTo('footer .pie-col',{y:25,autoAlpha:0},{y:0,autoAlpha:1,stagger:.1,duration:.55,scrollTrigger:{trigger:'footer',start:'top 88%',once:true}});
 // Tilt and spotlight belong to the new product surfaces.
 $$('.zero-grid .pieza,.zero-opportunity-cards .swap-card,.zero-lab .showroom-product').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;el.style.setProperty('--sx',x+'px');el.style.setProperty('--sy',y+'px');el.style.transform=`perspective(900px) rotateX(${(y/r.height-.5)*-3}deg) rotateY(${(x/r.width-.5)*4}deg) translateY(-6px)`},{passive:true});el.addEventListener('pointerleave',()=>{el.style.transform=''},{passive:true})});
 addEventListener('pagehide',()=>ST.getAll().forEach(t=>t.kill()),{once:true});
})();
