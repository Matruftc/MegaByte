(() => {
  'use strict';
  const loader = document.querySelector('#mbLoading');
  if (!loader) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let finished = false;
  loader.hidden = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    loader.classList.add('is-leaving');
    setTimeout(() => loader.remove(), reduced.matches ? 0 : 250);
  }
  // Avoid trapping the page behind a slow font or external resource.
  const deadline = setTimeout(finish, 4000);
  const pageReady = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else addEventListener('load', resolve, {once:true});
  });
  Promise.all([pageReady, document.fonts?.ready || Promise.resolve()]).then(finish);
  loader.querySelector('.mb-loading-skip').addEventListener('click', finish);
  addEventListener('pageshow', event => { if (event.persisted) finish(); });
})();
