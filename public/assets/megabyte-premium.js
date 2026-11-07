(() => {
  'use strict';
  const toggle = document.querySelector('#landingMenuButton');
  const nav = document.querySelector('#landingNavigation');
  const mobile = matchMedia('(max-width: 900px)');
  function close(focus = false) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('menu-visible');
    toggle.innerHTML = 'Menu <span aria-hidden="true">☰</span>';
    if (focus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('menu-visible', open);
    toggle.innerHTML = open ? 'Close <span aria-hidden="true">×</span>' : 'Menu <span aria-hidden="true">☰</span>';
  });
  nav.addEventListener('click', event => { if (event.target.closest('a,button')) close(); });
  document.addEventListener('click', event => { if (!event.target.closest('#nav')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true); });
  mobile.addEventListener('change', () => close());
  const feedback = document.querySelector('#sampleFeedback');
  const result = document.querySelector('#sampleResult');
  document.querySelectorAll('[data-sql-answer]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-sql-answer]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      const correct = button.dataset.sqlAnswer === 'WHERE';
      feedback.dataset.correct = String(correct);
      feedback.textContent = correct
        ? 'Correct. WHERE filters individual rows before grouping. Only orders with total > 100 appear in the result.'
        : button.dataset.sqlAnswer === 'HAVING'
          ? 'Try again. HAVING filters groups, usually after GROUP BY. This question asks you to filter individual order rows.'
          : 'Try again. ORDER BY changes the order of results; it does not remove rows. Look for the clause that filters rows.';
      document.querySelector('.sample-blank').textContent = correct ? 'WHERE' : '______';
      result.hidden = !correct;
    });
  });
})();
