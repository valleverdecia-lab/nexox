import { useEffect, useRef } from 'react';

export default function Background() {
 const ref = useRef(null);
 useEffect(() => {
  const c = ref.current; if (!c) return;
  const ctx = c.getContext('2d');
  let w=0,h=0,dpr=Math.min(2, window.devicePixelRatio||1), raf, t0=performance.now();
  const particles = Array.from({length: 48}, () => ({
   x: Math.random(), y: Math.random(), r: 0.6+Math.random()*2.2,
   vx: (Math.random()-0.5)*0.00008, vy: -0.00003-Math.random()*0.00008,
   a: 0.15+Math.random()*0.45, hue: Math.random()>0.85 ? 'ember' : 'pearl'
  }));
  const ripples = [];
  const resize = () => { w=innerWidth; h=innerHeight; c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); };
  resize(); window.addEventListener('resize', resize);
  const click = (e) => { ripples.push({x:e.clientX,y:e.clientY,r:0,max:Math.max(w,h)*0.35,a:0.22}); };
  window.addEventListener('pointerdown', click);
  const draw = (now) => {
   const t = (now-t0)/1000;
   ctx.clearRect(0,0,w,h);
   // soft grid glow
   const g = ctx.createRadialGradient(w*0.5,h*0.3,0,w*0.5,h*0.5,Math.max(w,h)*0.7);
   g.addColorStop(0,'rgba(30,30,30,0.18)'); g.addColorStop(1,'rgba(10,10,10,0)');
   ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
   // ripples
   for(let i=ripples.length-1;i>=0;i--){
    const rp=ripples[i]; rp.r += 2.2; rp.a *= 0.985;
    if(rp.a<0.005||rp.r>rp.max){ripples.splice(i,1);continue;}
    ctx.beginPath(); ctx.arc(rp.x,rp.y,rp.r,0,Math.PI*2);
    ctx.strokeStyle=`rgba(245,241,232,${rp.a})`; ctx.lineWidth=1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(rp.x,rp.y,rp.r*0.72,0,Math.PI*2);
    ctx.strokeStyle=`rgba(212,160,23,${rp.a*0.35})`; ctx.lineWidth=1; ctx.stroke();
   }
   // particles
   for(const p of particles){
    p.x += p.vx + Math.sin(t*0.3+p.y*6)*0.00003;
    p.y += p.vy;
    if(p.y < -0.05){p.y=1.05; p.x=Math.random();}
    if(p.x < -0.05) p.x=1.05; if(p.x>1.05) p.x=-0.05;
    const px=p.x*w, py=p.y*h;
    const tw = 0.5 + 0.5*Math.sin(t*1.2 + p.x*10);
    const a = p.a * (0.5+tw*0.5);
    ctx.beginPath(); ctx.arc(px,py,p.r,0,Math.PI*2);
    ctx.fillStyle = p.hue==='ember' ? `rgba(229,184,41,${a})` : `rgba(245,241,232,${a*0.75})`;
    ctx.fill();
    if(p.r>1.8){
     ctx.beginPath(); ctx.arc(px,py,p.r*3.5,0,Math.PI*2);
     ctx.fillStyle = p.hue==='ember' ? `rgba(212,160,23,${a*0.08})` : `rgba(245,241,232,${a*0.05})`;
     ctx.fill();
    }
   }
   // connecting lines (sparse)
   for(let i=0;i<particles.length;i++){
    for(let j=i+1;j<particles.length;j++){
     const a=particles[i], b=particles[j];
     const dx=(a.x-b.x)*w, dy=(a.y-b.y)*h; const d2=dx*dx+dy*dy;
     if(d2<140*140){ const al=(1-Math.sqrt(d2)/140)*0.07; ctx.strokeStyle=`rgba(245,241,232,${al})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x*w,a.y*h); ctx.lineTo(b.x*w,b.y*h); ctx.stroke(); }
    }
   }
   raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);
  return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',resize); window.removeEventListener('pointerdown',click); };
 },[]);
 return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
