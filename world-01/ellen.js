// Prototype choices acknowledge a selection without opening a store or checkout.
document.querySelectorAll('[data-reading]').forEach(button => {
  button.addEventListener('click',() => {
    document.querySelectorAll('[data-reading]').forEach(choice => choice.setAttribute('aria-pressed',String(choice === button)));
    document.querySelector('#reading-response').textContent = `${button.dataset.reading}から、この世界の続きを。読み始める入り口は準備中です。`;
  });
  button.setAttribute('aria-pressed','false');
});
