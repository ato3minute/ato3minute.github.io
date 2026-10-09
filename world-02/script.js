// Episode 2: 75-second original film. The introduction has its own clock.
const story = [
  [null,6,'人類は今日、初めて\n『最強』の意味を知る。','暗闇。人類は今日、初めて「最強」の意味を知る。'],
  ['02-arena',5,'','月光の下、満員の巨大な円形闘技場。'],
  ['03-human-gate',5,'','人間側の巨大な門が開き、老剣士が現れる。'],
  ['04-human-walk',5,'人類最強。','腰に使い込まれた剣一本。老剣士が静かに歩く。'],
  ['05-human-face',5,'その男は、強すぎた。','皺の深い老剣士の顔に、恐怖はない。'],
  ['06-divine-gate',5,'','反対側の門が開く。観客が息をのむ。'],
  ['07-divine-arrival',5,'','神に近い存在が現れる。素手と静かな金色のオーラ。'],
  ['08-divine-audience',5,'そして彼もまた、待っていた。','観客の向こう、神に近い存在が闘技場に立つ。'],
  ['09-divine-face',5,'自分に届く者を。','神の瞳に、初めてわずかな興味が浮かぶ。'],
  ['10-approach',6,'','老剣士と神が中央へ歩み寄る。広大な闘技場に二人の静けさ。'],
  ['11-faceoff',5,'最強と、最強。','同じ二人が正面から向かい合う。'],
  ['12-human-grip',6,'随分、待たせたな。','老剣士が剣の柄に触れ、ほんの少し笑う。「随分、待たせたな。」'],
  ['13-divine-fist',5,'ようやく、見つけた。','神もわずかに笑い、拳を握る。金色のオーラが強まる。'],
  ['14-charge',5,'','老剣士が剣を抜き踏み込む。神も拳を構え、一気に踏み込む。'],
  ['15-impact',2,'','剣とオーラをまとった拳が激突する瞬間。光、衝撃波、そして暗転。勝敗は描かれない。']
];
const $ = selector => document.querySelector(selector);
const audio = $('#bgm');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const screeningDuration = 75;
const introTiming = { first:4, firstEnd:8.8, second:9.8, secondEnd:15.6, third:17, thirdEnd:22.8, work:25, cta:28, end:30, audioFade:10 };
let introElapsed = null;
const endingIndex = story.length - 1;
let total = 0;
const slides = story.map(([image,duration,text,description],index) => {
  const start = total;
  total += duration;
  const el = document.createElement('div');
  el.className = 'scene';
  if (!image) el.classList.add('opening');
  if (index === 11) el.classList.add('dialogue');
  if (index === endingIndex) el.classList.add('collision');
  el.setAttribute('aria-hidden','true');
  let img = null;
  if (image) {
    img = document.createElement('img');
    img.src = `assets/images/episode-02/${image}.jpg`;
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
audio.volume = 0.3;
audio.muted = true;
audio.loop = true;
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
$('.progress').setAttribute('aria-valuemax',String(screeningDuration));
function render() {
  const index = slides.findIndex((slide,i) => position < slide.start + slide.duration || i === endingIndex);
  slides.forEach((slide,i) => {
    const elapsed = position - slide.start;
    const fade = reducedMotion.matches ? .12 : i === endingIndex ? .12 : i === 8 ? 1 : .7;
    const incoming = i === 0 ? 1 : Math.min(1,Math.max(0,elapsed / fade));
    // Previous frame stays under the incoming frame, including the fade to black.
    const visible = introElapsed === null && elapsed >= 0 && (i === endingIndex || position < slide.start + slide.duration + 1.2);
    slide.el.style.opacity = visible ? incoming : 0;
    slide.el.setAttribute('aria-hidden',String(i !== index || introElapsed !== null));
    slide.el.style.zIndex = i;
    if (slide.img) slide.img.style.transform = reducedMotion.matches ? 'none' : `scale(${1 + .035 * Math.min(1,Math.max(0,elapsed / slide.duration))})`;
    slide.caption.style.opacity = Math.min(1,Math.max(0,(elapsed - .4) / .8));
  });
  if (index !== current) {
    current = index;
    $('#scene-description').textContent = slides[index].description;
  }
  const introducing = introElapsed !== null;
  $('#player').classList.toggle('at-opening',!introducing && index === 0);
  $('#player').classList.toggle('at-collision',!introducing && index === endingIndex);
  const impactElapsed = position - slides[endingIndex].start;
  // One restrained burst at contact; then a hard cut to pure black at 75s.
  $('#impact').style.opacity = !introducing && index === endingIndex && !reducedMotion.matches ? Math.max(0,1 - Math.abs(impactElapsed - 1.82) / .18) * .7 : 0;
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
  introElapsed = Math.min(introTiming.end,Math.max(0,elapsed));
  $('#introduction').hidden = false;
  $('#scene-description').textContent = '';
}
function renderIntroduction() {
  const layer = $('#introduction');
  layer.hidden = introElapsed === null;
  if (introElapsed === null) {
    layer.style.opacity = 0;
    for (const id of ['intro-first','intro-second','intro-third','intro-work','work-cta']) $('#' + id).hidden = true;
    return;
  }
  const t = introElapsed;
  layer.style.opacity = 1;
  const show = (id,start,end = Infinity) => {
    const el = $('#' + id);
    const visible = t >= start && t < end;
    el.hidden = !visible;
    const fade = reducedMotion.matches ? .12 : 1.2;
    el.style.opacity = visible ? Math.min(1,(t-start)/fade,(end-t)/fade) : 0;
  };
  show('intro-first',introTiming.first,introTiming.firstEnd);
  show('intro-second',introTiming.second,introTiming.secondEnd);
  show('intro-third',introTiming.third,introTiming.thirdEnd);
  show('intro-work',introTiming.work);
  show('work-cta',introTiming.cta);
  const announcement = t >= introTiming.work ? '終末のワルキューレ。' : t >= introTiming.third && t < introTiming.thirdEnd ? $('#intro-third').textContent : t >= introTiming.second && t < introTiming.secondEnd ? $('#intro-second').textContent : t >= introTiming.first && t < introTiming.firstEnd ? $('#intro-first').textContent : '';
  if ($('#scene-description').textContent !== announcement) $('#scene-description').textContent = announcement;
}
function syncAudio(seek = false) {

  const attempt = ++audioAttempt;
  audio.muted = !soundOn;
  // An unset source can still be screened silently.
  if (!audio.getAttribute('src')) { audio.pause(); return; }
  if (seek) {
    const duration = audio.duration;
    audio.currentTime = Number.isFinite(duration) && duration > 0 ? position % duration : position;
  }
  if (introElapsed === null) audio.volume = 0.3;
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
  // Start the soundtrack inside the user's click for browser audio policy.
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
      audio.volume = 0.3 * Math.max(0,1 - introElapsed / introTiming.audioFade);
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
