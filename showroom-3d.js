/* Nexox showroom — real morph-target sculpture: sphere -> cube -> torus -> diamond. */
(() => {
  const section = document.getElementById('showroom');
  const canvas = document.getElementById('showroom-canvas');
  if (!section || !canvas || !window.THREE) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 700px)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:!mobile, powerPreference:'high-performance'});
  } catch (_) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.35));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(0, .1, 7.6);
  const root = new THREE.Group();
  root.rotation.set(-.04, -.12, 0);
  scene.add(root);

  const ambient = new THREE.PointLight(0x65dfff, 2.5, 10);
  ambient.position.set(2.8, 2.6, 4);
  const violet = new THREE.PointLight(0x5272ff, 2.2, 10);
  violet.position.set(-3, -1, 2);
  scene.add(ambient, violet);

  // Low-cost particle field behind the sculpture.
  const count = mobile ? 120 : 260;
  const particles = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 4.7 * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    particles[i * 3] = Math.cos(a) * r;
    particles[i * 3 + 1] = (Math.random() - .5) * 3.8;
    particles[i * 3 + 2] = (Math.random() - .5) * 2.8 - 1;
  }
  const fieldGeo = new THREE.BufferGeometry();
  fieldGeo.setAttribute('position', new THREE.BufferAttribute(particles, 3));
  const field = new THREE.Points(fieldGeo, new THREE.PointsMaterial({color:0x65dfff,size:mobile?.018:.024,transparent:true,opacity:.42,sizeAttenuation:true}));
  root.add(field);

  // All targets use the same UV grid, so every vertex can travel continuously.
  const uSegments = mobile ? 32 : 44;
  const vSegments = mobile ? 20 : 28;
  const vertexCount = (uSegments + 1) * (vSegments + 1);
  const radius = 1.42;
  const positions = new Float32Array(vertexCount * 3);
  const targets = [new Float32Array(vertexCount * 3), new Float32Array(vertexCount * 3), new Float32Array(vertexCount * 3)];
  const index = (u, v) => v * (uSegments + 1) + u;
  const put = (arr, i, x, y, z) => { arr[i * 3] = x * radius; arr[i * 3 + 1] = y * radius; arr[i * 3 + 2] = z * radius; };

  for (let v = 0; v <= vSegments; v++) {
    const phi = (v / vSegments) * Math.PI;
    for (let u = 0; u <= uSegments; u++) {
      const theta = (u / uSegments) * Math.PI * 2;
      const i = index(u, v);
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.cos(phi);
      const sz = Math.sin(phi) * Math.sin(theta);
      put(positions, i, sx, sy, sz);

      // Target 1: true cube projection from the same spherical direction.
      const maxAxis = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz)) || 1;
      put(targets[0], i, sx / maxAxis, sy / maxAxis, sz / maxAxis);

      // Target 2: torus sampled on the same grid.
      const tube = .38;
      const major = .98;
      put(targets[1], i, (major + tube * Math.cos(phi)) * Math.cos(theta), tube * Math.sin(phi), (major + tube * Math.cos(phi)) * Math.sin(theta));

      // Target 3: diamond/octahedron projection.
      const diamondScale = 1 / (Math.abs(sx) + Math.abs(sy) + Math.abs(sz) || 1);
      put(targets[2], i, sx * diamondScale * 1.75, sy * diamondScale * 1.75, sz * diamondScale * 1.75);
    }
  }
  const indices = [];
  for (let v = 0; v < vSegments; v++) {
    for (let u = 0; u < uSegments; u++) {
      const a = index(u, v), b = index(u + 1, v), c = index(u + 1, v + 1), d = index(u, v + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const morphGeo = new THREE.BufferGeometry();
  morphGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  morphGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  morphGeo.setIndex(indices);
  morphGeo.morphAttributes.position = targets.map((arr, i) => { const attr = new THREE.BufferAttribute(arr, 3); attr.name = ['cube', 'torus', 'diamond'][i]; return attr; });
  morphGeo.computeVertexNormals();

  const sculptureMat = new THREE.MeshStandardMaterial({color:0x7ceaff, emissive:0x063c58, emissiveIntensity:.9, metalness:.45, roughness:.24, wireframe:false, morphTargets:true});
  const sculpture = new THREE.Mesh(morphGeo, sculptureMat);
  sculpture.position.set(.55, .05, .4);
  sculpture.scale.setScalar(1.08);
  root.add(sculpture);

  const wireMat = new THREE.MeshBasicMaterial({color:0xc7f7ff, transparent:true, opacity:.16, wireframe:true, morphTargets:true});
  const wire = new THREE.Mesh(morphGeo, wireMat);
  wire.position.copy(sculpture.position);
  wire.scale.copy(sculpture.scale).multiplyScalar(1.012);
  root.add(wire);

  const halo = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.07, 96), new THREE.MeshBasicMaterial({color:0x65dfff,transparent:true,opacity:.18,side:THREE.DoubleSide}));
  halo.position.set(.55, .05, -.5);
  halo.rotation.x = Math.PI / 2.15;
  root.add(halo);

  let width = 1, height = 1, visible = false, raf = 0;
  let targetMorph = 0, currentMorph = 0, mx = 0, my = 0, start = performance.now();
  const progressLabel = document.createElement('p');
  progressLabel.className = 'morph-label mono';
  progressLabel.setAttribute('aria-live', 'polite');
  progressLabel.textContent = 'MORPH / ESFERA';
  section.querySelector('.showroom-stage')?.appendChild(progressLabel);

  const morphNames = ['ESFERA', 'CUBO', 'TORO', 'DIAMANTE'];
  const shapeArrays = [positions.slice(), targets[0], targets[1], targets[2]];
  function setMorph(value) {
    targetMorph = THREE.MathUtils.clamp(value, 0, 3);
    const step = Math.min(2, Math.floor(targetMorph));
    const local = targetMorph - step;
    const from = shapeArrays[step], to = shapeArrays[Math.min(3, step + 1)];
    const attr = morphGeo.attributes.position.array;
    for (let i = 0; i < attr.length; i++) attr[i] = from[i] + (to[i] - from[i]) * local;
    morphGeo.attributes.position.needsUpdate = true;
    morphGeo.computeVertexNormals();
    progressLabel.textContent = `MORPH / ${morphNames[Math.min(3, Math.round(targetMorph))]}`;
  }
  function resize() {
    const r = section.getBoundingClientRect();
    width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const t = (now - start) * .001;
    if (!reduced) {
      currentMorph = THREE.MathUtils.damp(currentMorph, targetMorph, 5, .016);
      setMorph(currentMorph);
      field.rotation.y = t * .018;
      sculpture.rotation.y = t * .18 + mx * .45;
      sculpture.rotation.x = my * .22;
      wire.rotation.copy(sculpture.rotation);
      halo.rotation.z = t * .12;
      root.rotation.y = -.12 + mx * .035;
      root.rotation.x = -.04 + my * .025;
    } else setMorph(targetMorph);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  new ResizeObserver(resize).observe(section);
  resize();
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) wake(); }, {rootMargin:'160px'}).observe(section);
  addEventListener('scroll', () => {
    const r = section.getBoundingClientRect();
    const span = Math.max(1, r.height - innerHeight);
    setMorph(THREE.MathUtils.clamp((-r.top / span) * 3.15, 0, 3));
    wake();
  }, {passive:true});
  if (!reduced) addEventListener('pointermove', e => { const r = section.getBoundingClientRect(); mx = (e.clientX-r.left)/r.width-.5; my = (e.clientY-r.top)/r.height-.5; wake(); }, {passive:true});
  if (window.gsap && window.ScrollTrigger && !reduced) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(root.rotation, {y:.38, x:.16, ease:'none', scrollTrigger:{trigger:section,start:'top bottom',end:'bottom top',scrub:1}});
  }
  document.querySelectorAll('[data-showroom-id]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.showroomId;
    if (typeof window.nexoOpenProduct === 'function') window.nexoOpenProduct(id); else document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'});
  }));
  setMorph(0);
  wake();
  addEventListener('pagehide', () => { visible=false; fieldGeo.dispose(); morphGeo.dispose(); sculptureMat.dispose(); wireMat.dispose(); halo.geometry.dispose(); halo.material.dispose(); field.material.dispose(); renderer.dispose(); }, {once:true});
})();
