/* Nexox showroom — Three.js depth field, real product photography, capped GPU cost. */
(() => {
  const section = document.getElementById('showroom');
  const canvas = document.getElementById('showroom-canvas');
  if (!section || !canvas || !window.THREE) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 700px)').matches;
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:!mobile, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(0, .1, 7.6);
  const root = new THREE.Group();
  root.rotation.set(-.04, -.12, 0);
  scene.add(root);

  const ambient = new THREE.PointLight(0x65dfff, 2.2, 9); ambient.position.set(2.8,2.6,4); scene.add(ambient);
  const violet = new THREE.PointLight(0x5272ff, 2, 9); violet.position.set(-3,-1,2); scene.add(violet);

  const count = mobile ? 150 : 320;
  const positions = new Float32Array(count * 3);
  for(let i=0;i<count;i++){ const r=4.7*Math.sqrt(Math.random()), a=Math.random()*Math.PI*2; positions[i*3]=Math.cos(a)*r; positions[i*3+1]=(Math.random()-.5)*3.8; positions[i*3+2]=(Math.random()-.5)*2.8-1; }
  const fieldGeo = new THREE.BufferGeometry(); fieldGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const field = new THREE.Points(fieldGeo,new THREE.PointsMaterial({color:0x65dfff,size:mobile?.018:.024,transparent:true,opacity:.48,sizeAttenuation:true}));
  root.add(field);

  const loader = new THREE.TextureLoader();
  const products = [
    {src:'fotos/split-eko-1-5-toneladas.webp', x:-1.55, y:.2, z:.3, s:1.55},
    {src:'fotos/combo-inversor-6-kw-bateria-15-kwh-paneles.webp', x:.15, y:-.1, z:.7, s:1.95},
    {src:'fotos/refrigerador-lg-de-11-pies.webp', x:1.85, y:.45, z:.15, s:1.4}
  ];
  const planes=[];
  products.forEach((p,i)=>{
    const tex=loader.load(p.src); tex.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.82});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(p.s,p.s),mat); mesh.position.set(p.x,p.y,p.z); mesh.rotation.z=(i-1)*.08; root.add(mesh); planes.push(mesh);
  });

  let width=1,height=1,visible=false,raf=0,start=performance.now(),mx=0,my=0;
  function resize(){const r=section.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  function frame(now){raf=0;if(!visible)return;const t=(now-start)*.001;if(!reduced){field.rotation.y=t*.018;field.rotation.x=Math.sin(t*.25)*.025;root.rotation.y=-.12+mx*.035;root.rotation.x=-.04+my*.025;planes.forEach((m,i)=>{m.position.y+=Math.sin(t*.7+i)*.0007})}renderer.render(scene,camera);raf=requestAnimationFrame(frame)}
  function wake(){if(!raf)raf=requestAnimationFrame(frame)}
  new ResizeObserver(resize).observe(section); resize();
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)wake()},{rootMargin:'160px'}).observe(section);
  if(!reduced) addEventListener('pointermove',e=>{const r=section.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5;wake()},{passive:true});
  if(window.gsap && window.ScrollTrigger && !reduced){
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(root.rotation,{y:.38,x:.16,ease:'none',scrollTrigger:{trigger:section,start:'top bottom',end:'bottom top',scrub:1}});
    gsap.from('.showroom-copy',{autoAlpha:0,x:-30,duration:.8,immediateRender:false,scrollTrigger:{trigger:section,start:'top 72%',once:true}});
    gsap.from('.showroom-product',{autoAlpha:0,y:50,rotateZ:4,stagger:.12,duration:.85,ease:'power3.out',immediateRender:false,scrollTrigger:{trigger:'.showroom-products',start:'top 78%',once:true}});
  }
  document.querySelectorAll('[data-showroom-id]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.showroomId;
    if(typeof window.nexoOpenProduct==='function') window.nexoOpenProduct(id); else document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'});
  }));
  addEventListener('pagehide',()=>{visible=false;fieldGeo.dispose();field.material.dispose();planes.forEach(m=>{m.geometry.dispose();m.material.map?.dispose();m.material.dispose()});renderer.dispose()},{once:true});
})();
