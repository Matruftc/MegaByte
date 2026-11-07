(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.wordmark-letter').forEach(letter => {
    let drag = null;
    function release(event) {
      if (!drag || (event && event.pointerId !== drag.id)) return;
      const id = drag.id;
      drag = null;
      letter.classList.remove('is-stretching');
      letter.style.removeProperty('transform');
      if (letter.hasPointerCapture(id)) letter.releasePointerCapture(id);
    }
    letter.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.pointerType === 'touch' || reduced.matches) return;
      event.preventDefault();
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY };
      letter.setPointerCapture(event.pointerId);
      letter.classList.add('is-stretching');
    });
    letter.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const x = Math.max(-180, Math.min(180, event.clientX - drag.x));
      const y = Math.max(-220, Math.min(220, event.clientY - drag.y));
      const sx = 1 + Math.abs(x) / 100;
      const sy = 1 + Math.abs(y) / 100;
      letter.style.transform = `translate(${x * .22}px, ${y * .22}px) scale(${sx}, ${sy})`;
    });
    letter.addEventListener('pointerup', release);
    letter.addEventListener('pointercancel', release);
    letter.addEventListener('lostpointercapture', release);
    window.addEventListener('blur', () => release());
    reduced.addEventListener('change', () => release());
  });
})();
