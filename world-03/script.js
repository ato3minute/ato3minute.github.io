// Episode 3 reuses the existing playback engine.
const story = episodeThreeStory;
const $ = selector => document.querySelector(selector);
const audio = $('#bgm');
const bgmVolume = .30;
function updateBgmVolume() {
  // Fade from the final blackout through the introduction, following the paused film clock.
  const fadeElapsed = introElapsed === null ? Math.max(0,position - (total - 1.2)) : introElapsed + 1.2;
  audio.volume = bgmVolume * Math.max(0,1 - fadeElapsed / introTiming.audioFade);
  if (audio.volume === 0) audio.pause();
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const screeningDuration = story.reduce((sum,cut) => sum + cut[1],0);
const introTiming = { first:2, firstEnd:7, second:8, secondEnd:13, third:14, thirdEnd:18, work:19, cta:22, end:24, audioFade:10 };
let introElapsed = null;
const endingIndex = story.length - 1;
let total = 0;
const slides = story.map(([image,duration,text,description],index) => {
  const start = total;
  total += duration;
  const el = document.createElement('div');
  el.className = 'scene';
  if (!image) el.classList.add('opening');
  if (index === 9 || index === 10) el.classList.add('dialogue');
  if (index === endingIndex) el.classList.add('first-move');
  el.setAttribute('aria-hidden','true');
  let img = null;
  if (image) {
    img = document.createElement('img');
    img.src = image === '02-rival'
      ? 'assets/images/episode-03-wa/14-childhood-frustration.png'
      : `assets/images/episode-03-wa/${image}.${['07-training','14-serious'].includes(image) ? 'png' : 'jpg'}`;
    el.style.backgroundImage = `url("${img.src}")`;
    img.alt = '';
    img.draggable = false;
    el.append(img);
  }
  if (index === 13) {
    const memory = document.createElement('img');
    memory.src = 'assets/images/episode-03-wa/14-childhood-frustration.png';
    memory.className = 'childhood-echo'; memory.alt = '';
    el.append(memory);
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
    const fade = reducedMotion.matches ? .12 : i === endingIndex ? .12 : i === 8 ? 1 : .7;
    const incoming = i === 0 ? 1 : Math.min(1,Math.max(0,elapsed / fade));
    // Previous frame stays under the incoming frame, including the fade to black.
    const visible = introElapsed === null && elapsed >= 0 && (i === endingIndex || position < slide.start + slide.duration + 1.2);
    slide.el.style.opacity = visible ? incoming : 0;
    slide.el.setAttribute('aria-hidden',String(i !== index || introElapsed !== null));
    slide.el.style.zIndex = i;
    if (slide.img) {
      const fraction = Math.min(1,Math.max(0,elapsed / slide.duration));
      // Understanding the champion's move opens the frame.
      const scale = i === 9 ? 1.08 - .08 * fraction : 1 + .035 * fraction;
      slide.img.style.transform = reducedMotion.matches ? 'none' : `scale(${scale})`;
    }
    slide.caption.style.opacity = Math.min(1,Math.max(0,(elapsed - (i === 9 ? 1.2 : .4)) / .8));
    if (i === endingIndex) {
      slide.el.style.opacity = elapsed >= 3.8 ? 0 : (visible ? incoming : 0);
    }
    if (i === 7 && slide.img) {
      const beatIndex = episodeThreeMontageEnds.findIndex(end => elapsed < end);
      const beat = episodeThreeMontage[beatIndex < 0 ? 4 : beatIndex];
      const src = `assets/images/episode-03-wa/${beat}.${beat === '08-practice' ? 'jpg' : 'png'}`;
      if (slide.img.getAttribute('src') !== src) {
        slide.img.src = src;
        slide.el.style.backgroundImage = `url("${src}")`;
      }
    }
    if (i === 13) {
      // Ease into childhood, hold it clearly, then gently return to the adult match.
      const ease = value => {
        const t = Math.max(0,Math.min(1,value));
        return t * t * (3 - 2 * t);
      };
      const memoryOpacity = !visible ? 0 : reducedMotion.matches
        ? (elapsed >= 1.6 && elapsed < 3.2 ? 1 : 0)
        : ease((elapsed - .7) / .9) * (1 - ease((elapsed - 3.2) / 1.2));
      slide.el.querySelector('.childhood-echo').style.opacity = memoryOpacity;
      // Keep the adult frame opaque underneath to avoid a dark dip during the dissolve.
      slide.img.style.opacity = 1;
    }
  });
  if (index !== current) {
    current = index;
    $('#scene-description').textContent = slides[index].description;
  }
  const introducing = introElapsed !== null;
  $('#player').classList.toggle('at-opening',!introducing && index === 0);
  $('#player').classList.toggle('at-final',!introducing && index === endingIndex);
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
  const announcement = t >= introTiming.work ? 'ヒカルの碁。' : t >= introTiming.third && t < introTiming.thirdEnd ? $('#intro-third').textContent : t >= introTiming.second && t < introTiming.secondEnd ? $('#intro-second').textContent : t >= introTiming.first && t < introTiming.firstEnd ? $('#intro-first').textContent : '';
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
  updateBgmVolume();
  if (!soundOn || !playing || audio.volume === 0) { audio.pause(); return; }
  audio.play().then(() => {
    // Prevent a late play promise from undoing a pause or silent start.
    if (attempt === audioAttempt && (!soundOn || !playing || audio.volume === 0)) audio.pause();
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
    updateBgmVolume();
    if (introElapsed !== null) {
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

episodeThreeMontage.forEach(name => { const image = new Image(); image.src = `assets/images/episode-03-wa/${name}.${name === '08-practice' ? 'jpg' : 'png'}`; });
