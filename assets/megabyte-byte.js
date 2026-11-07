(() => {
  'use strict';
  const scene = document.querySelector('#byteScene');
  if (!scene) return;
  const form = document.querySelector('#byteFinder');
  const start = document.querySelector('#byteStart');
  const chest = document.querySelector('#byteChest');
  const result = document.querySelector('#byteRecommendation');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const touch = matchMedia('(pointer: coarse)');
  const canScrub = () => pointer.matches || touch.matches;
  const sceneHint = scene.querySelector('.byte-scene-hint');
  function updateSceneHint() {
    if (sceneHint) sceneHint.textContent = touch.matches ? 'Swipe to look around. Tap Find Path to start.' : 'Move your mouse. Say hello.';
  }
  updateSceneHint();
  touch.addEventListener('change', updateSceneHint);
  function openFinder() {
    form.hidden = false;
    start.setAttribute('aria-expanded', 'true');
    form.querySelector('input').focus({preventScroll:true});
    form.scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});
  }
  start.addEventListener('click', () => {
    if (form.hidden) openFinder();
    else { form.hidden = true; start.setAttribute('aria-expanded', 'false'); }
  });
  chest.addEventListener('click', openFinder);
  const recommendations = {
    'code-beginner':['python-academy','Start with runnable Python examples and use the browser playground to practice as you learn.'],
    'code-practice':['java-academy','You know the basics of writing code. Try Java to practice programming concepts in another language.'],
    'data-beginner':['database-academy','Build a foundation in SQL and databases before moving into pipelines or cloud warehouses.'],
    'data-practice':['etl-elt-academy','Explore how data moves between systems, with guided pipeline modules and interactive labs.'],
    'cloud-beginner':['aws-academy','Start with AWS cloud foundations and learn how core services fit together.'],
    'cloud-practice':['snowflake-academy','Explore a cloud data warehouse through explained questions about loading, compute, and security.'],
  };
  form.addEventListener('change', () => { result.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const recommendation = recommendations[`${values.get('goal')}-${values.get('experience')}`];
    if (!recommendation) return;
    const project = window.MEGABYTE.projects.find(p => p.id === recommendation[0]);
    result.replaceChildren();
    const title = document.createElement('h3'); title.textContent = project.name;
    const explanation = document.createElement('p'); explanation.textContent = recommendation[1];
    const link = document.createElement('a'); link.href = project.links[0].href; link.textContent = `Explore ${project.name} ↗`;
    result.append(title, explanation, link); result.hidden = false;
  });
  const clip = document.querySelector('#byteHead');
  let visible = false, loaded = false, loading = false, frame = 0;
  let target = .5, shown = .5, moved = 0, blobUrl = '';
  let failed = false;
  async function load() {
    if (loaded || loading || failed) return;
    loading = true;
    try {
      const response = await fetch('assets/byte-companion/head.mp4');
      if (!response.ok) throw new Error('Unavailable');
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      clip.src = blobUrl;
    } catch { clip.src = 'assets/byte-companion/head.mp4'; }
    clip.load();
  }
  clip.addEventListener('loadedmetadata', () => {
    loaded = Number.isFinite(clip.duration) && clip.duration > 0;
    loading = false;
    if (loaded) { clip.currentTime = clip.duration * .5; sync(); }
  });
  clip.addEventListener('seeked', () => { if (!reduced.matches && canScrub()) clip.classList.add('is-ready'); });
  clip.addEventListener('error', () => { failed = true; loading = false; clip.classList.remove('is-ready'); });
  function setTargetFromPointer(event) {
    const bounds = scene.getBoundingClientRect();
    target = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    moved = performance.now();
    if (touch.matches && visible && loaded && !frame) frame = requestAnimationFrame(tick);
  }
  scene.addEventListener('pointerdown', event => { if (event.pointerType === 'touch' || event.pointerType === 'pen') setTargetFromPointer(event); });
  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.buttons > 0) setTargetFromPointer(event);
  });
  function tick(time) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches || !canScrub() || !loaded || failed) return;
    if (pointer.matches && time - moved > 3500) target = .5 + Math.sin(time / 2200) * .22;
    shown += (target - shown) * .14;
    const desired = shown * Math.max(0,clip.duration - .05);
    if (!clip.seeking && Math.abs(clip.currentTime - desired) > .035) clip.currentTime = desired;
    if (pointer.matches || Math.abs(target - shown) > .002) frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!visible || document.hidden || reduced.matches || !canScrub() || navigator.connection?.saveData) {
      cancelAnimationFrame(frame); frame = 0;
      if (reduced.matches || !canScrub()) clip.classList.remove('is-ready');
      return;
    }
    if (!loaded) load();
    else if (pointer.matches && !frame) frame = requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {visible=entries[0].isIntersecting;sync();},{rootMargin:'100px'}).observe(scene);
  else { visible = true; sync(); }
  reduced.addEventListener('change',sync); pointer.addEventListener('change',sync); touch.addEventListener('change',sync); document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',()=>{ cancelAnimationFrame(frame); if(blobUrl)URL.revokeObjectURL(blobUrl); });
})();
