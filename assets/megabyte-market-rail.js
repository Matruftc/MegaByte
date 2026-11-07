(() => {
  "use strict";

  const rail = document.querySelector("#marketRail");
  if (!rail) return;

  const cards = [...rail.querySelectorAll(".market-card")];
  const previous = document.querySelector("#marketRailPrevious");
  const next = document.querySelector("#marketRailNext");
  const position = document.querySelector("#marketRailPosition");
  const total = document.querySelector("#marketRailTotal");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  total.textContent = String(cards.length).padStart(2, "0");

  function currentIndex() {
    const anchor = Math.min(190, innerHeight * .28);
    let current = 0;
    cards.forEach((card, index) => {
      if (card.getBoundingClientRect().top <= anchor) current = index;
    });
    return current;
  }

  function update() {
    const index = currentIndex();
    position.textContent = String(index + 1).padStart(2, "0");
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
  }

  function goTo(index) {
    const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
    if (!target) return;
    const top = target.getBoundingClientRect().top + scrollY - 105;
    scrollTo({ top, behavior: reduced.matches ? "instant" : "smooth" });
  }

  previous.addEventListener("click", () => goTo(currentIndex() - 1));
  next.addEventListener("click", () => goTo(currentIndex() + 1));
  addEventListener("scroll", update, { passive: true });
  rail.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    goTo(currentIndex() + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1));
  });
  addEventListener("resize", update);
  update();
})();
