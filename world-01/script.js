// Third screening: the 15 story scenes are unchanged; the introduction has its own clock.
const story = [
  ['01-absorbed',4,'','小学生。何かに夢中になっている。'],
  ['02-classroom',4,'自分には、何かあると思っていた。','小学校の教室。窓の向こうを見て、将来を楽しみにしている。'],
  ['03-junior',4,'','中学生。放課後、目の前のことに打ち込む。'],
  ['04-friends',4,'','高校生。友人と将来を話しながら帰る。'],
  ['05-graduation',5,'これから、\n何者になるんだろう。','卒業の日。校門の前で立ち止まる。'],
  ['06-commute',4,'','数年後。満員電車で会社へ向かう。'],
  ['07-office',4,'','会社で上司に厳しく注意され、頭を下げる。'],
  ['08-izakaya',4,'','夜の居酒屋。慰めてくれる同期に、少しだけ笑う。'],
  ['09-reflection',6,'','飲み会の帰り。一人、電車の窓に映る自分を見る。'],
  ['10-home',4,'','帰宅。暗い部屋に一人で座る。'],
  ['11-box',4,'','棚の片隅で、昔の物が入った箱を見つける。'],
  ['12-mementos',5,'','箱の中の幼い自分の写真と、小さな思い出の品を見る。'],
  ['13-remember',5,'あの頃は、自分が何者になるのか\n楽しみだった。','写真を見つめる現在の自分。'],
  ['14-match',5,'いつからだろう。','同じ目元、同じ前髪。子どもの頃の自分と今の自分が重なる。'],
  ['15-morning',5,'','翌朝。箱にあった小さな物を鞄に入れ、いつもの会社へ向かう。']
];
const $ = selector => document.querySelector(selector);
const audio = $('#bgm');
const bgmVolume = 0.3;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const screeningDuration = 75; // Keep the existing story player counter.
const introTiming = { first:3.6, firstEnd:9.1, second:10.3, secondEnd:15.8, work:17, question:19, cta:22, end:23.2, audioFade:10 };
let introElapsed = null;
const endingIndex = story.length - 1;
let total = 0;
const slides = story.map(([image,duration,text,description],index) => {
  const start = total;
  total += duration;
  const el = document.createElement('div');
  el.className = 'scene';
  el.setAttribute('aria-hidden','true');
  let img = null;
  if (image) {
    img = document.createElement('img');
    img.src = image === '03-junior' ? 'assets/images/v2/03-junior-brighter.png' : `assets/images/v2/${image}.jpg`;
    img.alt = '';
    img.draggable = false;
    el.append(img);
  }
  const caption = document.createElement('p');
  caption.className = 'caption';
  caption.textContent = text;
  el.append(caption);
  $('#scenes').append(el);
  return {start,duration,description,el,img,caption};
});
let position = 0, playing = false, started = false, soundOn = false;
let lastFrame = 0, current = -1, audioAttempt = 0;
audio.volume = bgmVolume;
audio.muted = true;
audio.loop = true;
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
$('.progress').setAttribute('aria-valuemax',String(screeningDuration));
function render() {
  const index = slides.findIndex((slide,i) => position < slide.start + slide.duration || i === endingIndex);
  slides.forEach((slide,i) => {
    const elapsed = position - slide.start;
    const fade = reducedMotion.matches ? .12 : i === 8 ? 1.1 : .7;
    const incoming = i === 0 ? 1 : Math.min(1,Math.max(0,elapsed / fade));
    // Previous frame stays under the incoming frame, including the fade to black.
    const visible = elapsed >= 0 && (i === endingIndex || position < slide.start + slide.duration + 1.2);
    slide.el.style.opacity = visible ? incoming : 0;
    slide.el.style.zIndex = i;
    if (slide.img) slide.img.style.transform = reducedMotion.matches ? 'none' : `scale(${1 + .035 * Math.min(1,Math.max(0,elapsed / slide.duration))})`;
    slide.caption.style.opacity = Math.min(1,Math.max(0,(elapsed - .4) / .8));
  });
  if (index !== current) {
    current = index;
    $('#scene-description').textContent = slides[index].description;
  }
  const introducing = introElapsed !== null;
  $('#next').disabled = introducing;
  $('#player').classList.toggle('at-introduction',introducing);
  renderIntroduction();
  $('#progress-fill').style.width = `${position / screeningDuration * 100}%`;
  $('.progress').setAttribute('aria-valuenow',String(Math.floor(position)));
  $('#time').textContent = `${formatTime(position)} / ${formatTime(screeningDuration)}`;
  $('#toggle').textContent = introElapsed !== null && introElapsed >= introTiming.end ? 'もう一度' : playing ? '一時停止' : '再生';
}
function beginIntroduction(elapsed = 0) {
  position = total;
  introElapsed = Math.max(0,elapsed);
  $('#introduction').hidden = false;
  $('#scene-description').textContent = '';
}
function renderIntroduction() {
  const layer = $('#introduction');
  layer.hidden = introElapsed === null;
  if (introElapsed === null) {
    layer.style.opacity = 0;
    for (const id of ['intro-first','intro-second','intro-work','intro-question','work-cta']) $('#' + id).hidden = true;
    return;
  }
  const t = introElapsed;
  layer.style.opacity = Math.min(1,t / (reducedMotion.matches ? .12 : .8));
  const show = (id,start,end = Infinity) => {
    const el = $('#' + id);
    const visible = t >= start && t < end;
    el.hidden = !visible;
    const fade = reducedMotion.matches ? .12 : 1.2;
    el.style.opacity = visible ? Math.min(1,(t-start)/fade,(end-t)/fade) : 0;
  };
  show('intro-first',introTiming.first,introTiming.firstEnd);
  show('intro-second',introTiming.second,introTiming.secondEnd);
  show('intro-work',introTiming.work);
  show('intro-question',introTiming.question);
  show('work-cta',introTiming.cta);
  const announcement = t >= introTiming.work ? '左ききのエレン。才能とは何か。何者かになるとは何か。' : t >= introTiming.second && t < introTiming.secondEnd ? $('#intro-second').textContent : t >= introTiming.first && t < introTiming.firstEnd ? $('#intro-first').textContent : '';
  if ($('#scene-description').textContent !== announcement) $('#scene-description').textContent = announcement;
}
function syncAudio(seek = false) {

  const attempt = ++audioAttempt;
  audio.muted = !soundOn;
  if (seek) {
    const duration = audio.duration;
    audio.currentTime = Number.isFinite(duration) && duration > 0 ? position % duration : position;
  }
  if (introElapsed === null) audio.volume = bgmVolume;
  if (!soundOn || !playing || (introElapsed !== null && introElapsed >= introTiming.audioFade)) { audio.pause(); return; }
  audio.play().then(() => {
    // Prevent a late play promise from undoing a pause or silent start.
    if (attempt === audioAttempt && (!soundOn || !playing)) audio.pause();
  }).catch(() => {});
}
function setPlaying(value,seek = false) {
  playing = value;
  lastFrame = performance.now();
  syncAudio(seek);
  render();
}
function restart() { introElapsed = null; position = 0; current = -1; setPlaying(true,true); }
function start(withSound) {
  if (started) return;
  started = true;
  soundOn = withSound;
  $('#welcome').hidden = true;
  $('#player').hidden = false;
  // play() runs inside the user's click to satisfy browser audio policy.
  setPlaying(true,true);
  $('#toggle').focus({preventScroll:true});
}
function next() {
  if (introElapsed !== null) return;
  if (current >= endingIndex) { beginIntroduction(); render(); return; }
  position = slides[current + 1].start;
  lastFrame = performance.now();
  syncAudio(true);
  render();
}
function toggle() { if (introElapsed !== null && introElapsed >= introTiming.end) restart(); else setPlaying(!playing); }
$('#with-sound').addEventListener('click',() => start(true));
$('#without-sound').addEventListener('click',() => start(false));
$('#next').addEventListener('click',next);
$('#toggle').addEventListener('click',toggle);
$('#restart').addEventListener('click',restart);
document.addEventListener('visibilitychange',() => { if (document.hidden && started && playing) setPlaying(false); });
document.addEventListener('keydown',event => {
  if (!started || event.target.closest('button, a') || event.altKey || event.metaKey || event.ctrlKey) return;
  if (event.code === 'Space') { event.preventDefault(); toggle(); }
  if (event.code === 'ArrowRight') { event.preventDefault(); next(); }
});
function tick(now) {
  if (playing) {
    const delta = Math.max(0,(now-lastFrame)/1000);
    if (introElapsed === null) {
      const advanced = position + delta;
      position = Math.min(total,advanced);
      if (advanced >= total) beginIntroduction(advanced - total);
    } else {
      introElapsed = Math.min(introTiming.end,introElapsed + delta);
    }
    if (introElapsed !== null) {
      audio.volume = bgmVolume * Math.max(0,1 - introElapsed / introTiming.audioFade);
      if (introElapsed >= introTiming.audioFade) audio.pause();
      if (introElapsed >= introTiming.end) playing = false;
    }
    render();
  }
  lastFrame = now;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
Promise.allSettled(slides.filter(slide => slide.img).map(slide => slide.img.decode())).then(results => {
  $('#loading').textContent = results.some(result => result.status === 'rejected') ? '一部の画像を読み込めませんでした。再読み込みをお試しください。' : '';
});
