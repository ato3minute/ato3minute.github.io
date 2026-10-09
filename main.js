/* Work page entrances, relative to the top-level index.html. */
const WORLD_LINKS = {
  1: 'world-01/index.html', // 左ききのエレン
  2: 'world-02/index.html', // 終末のワルキューレ
  3: 'world-03/index.html', // ヒカルの碁
  4: 'world-04/index.html', // ザ・ファブル
  5: 'world-05/index.html'  // かぐや様は告らせたい
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curtain = document.querySelector('.transition');
const curtainLabel = curtain.querySelector('span');
const defaultCurtainLabel = curtainLabel.textContent;
const worldCards = Array.from(document.querySelectorAll('.world'));
const chooseForMe = document.querySelector('#choose-for-me');
const choiceStatus = document.querySelector('#choice-status');
let entering = false;
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(item => observer.observe(item));
}
worldCards.forEach(card => {
  const destination = WORLD_LINKS[card.dataset.world];
  card.href = destination;
  card.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (entering) return;
    entering = true;
    card.classList.add('entering');
    curtain.classList.add('active');
    setTimeout(() => {
      window.location.assign(destination);
    }, reduceMotion ? 0 : 650);
  });
});
chooseForMe.hidden = false;
chooseForMe.addEventListener('click', () => {
  if (entering) return;
  entering = true;
  chooseForMe.disabled = true;
  const selectedCard = worldCards[Math.floor(Math.random() * worldCards.length)];
  const destination = selectedCard.getAttribute('href');
  curtainLabel.textContent = '今夜は、この世界へ。';
  choiceStatus.textContent = '今夜は、この世界へ。';
  curtain.classList.add('active');
  setTimeout(() => window.location.assign(destination), 1100);
});
window.addEventListener('pageshow', () => {
  entering = false;
  chooseForMe.disabled = false;
  choiceStatus.textContent = '';
  curtainLabel.textContent = defaultCurtainLabel;
  curtain.classList.remove('active');
  document.querySelectorAll('.entering').forEach(card => card.classList.remove('entering'));
});
