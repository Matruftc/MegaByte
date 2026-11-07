(() => {
  'use strict';
  const rail = document.querySelector('#academyPreviewRail');
  if (!rail) return;
  const previous = document.querySelector('#previewPrevious');
  const next = document.querySelector('#previewNext');
  const academies = window.MEGABYTE.projects.filter(p => p.id.endsWith('-academy') && p.status === 'Live');
  academies.forEach((project, index) => {
    const card = document.createElement('a');
    card.className = 'academy-preview';
    card.href = project.links[0].href;
    const image = document.createElement('img');
    image.src = project.preview;
    image.alt = `${project.name} learning interface preview`;
    image.loading = 'lazy';
    image.width = 800; image.height = 500;
    const details = document.createElement('div');
    details.className = 'academy-preview-details';
    const number = document.createElement('span');
    number.className = 'preview-number'; number.textContent = String(index + 1).padStart(2, '0');
    const text = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = project.name;
    const summary = document.createElement('p'); summary.textContent = project.stats.slice(0, 2).map(stat => stat.join(' ')).join(' · ');
    text.append(title, summary);
    const arrow = document.createElement('span'); arrow.className = 'preview-open'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    details.append(number, text, arrow); card.append(image, details); rail.append(card);
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function move(direction) {
    const card = rail.querySelector('.academy-preview');
    if (card) rail.scrollBy({left: direction * (card.getBoundingClientRect().width + 24), behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  function update() {
    previous.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  rail.addEventListener('scroll', update, {passive:true});
  rail.addEventListener('keydown', event => {
    if (event.target !== rail) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  });
  addEventListener('resize', update);
  update();
})();
