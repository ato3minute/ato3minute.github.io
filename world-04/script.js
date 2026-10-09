// Episode 4 reuses the existing playback engine.
const story = episodeFourStory;
const $ = selector => document.querySelector(selector);
const audio = $('#bgm');
const bgmVolume = .30;
function updateBgmVolume() {
  // Resume sound exactly when the return-home image begins (65 seconds).
  audio.muted = !soundOn || (introElapsed === null && position >= 50.5 && position < slides[12].start);
  // Fade from the final blackout through the introduction, following the paused film clock.
  const fadeElapsed = introElapsed === null ? Math.max(0,position - (total - 1)) : introElapsed + 1;
  audio.volume = bgmVolume * Math.max(0,1 - fadeElapsed / introTiming.audioFade);
  if (audio.volume === 0) audio.pause();
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const screeningDuration = story.reduce((sum,cut) => sum + cut[1],0);
const introTiming = { first:2, firstEnd:7, second:8, secondEnd:13, third:Infinity, thirdEnd:Infinity, work:14, cta:17, end:19, audioFade:10 };
let introElapsed = null;
const endingIndex = story.length - 1;
let total = 0;
const slides = story.map(([image,duration,text,description],index) => {
  const start = total;
  total += duration;
  const el = document.createElement('div');
  el.className = 'scene';
  if (!image) el.classList.add('opening');
  el.classList.add(index < 5 || index > 10 ? 'daily' : 'tension');
  if (index === 9) el.classList.add('instant');
  if (index === 6) el.classList.add('observation');
  if (index === endingIndex) el.classList.add('first-move');
  el.setAttribute('aria-hidden','true');
  let img = null;
  if (image) {
    img = document.createElement('img');
    img.src = `assets/images/episode-04/${image}.jpg`;
    el.style.backgroundImage = `url("${img.src}")`;
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
let lastFrame = 0, current = -1;
audio.volume = bgmVolume;
audio.muted = true;
audio.loop = true;
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
$('.progress').setAttribute('aria-valuemax',String(screeningDuration));
function render() {
  const index = slides.findIndex((slide,i) => position < slide.start + slide.duration || i === endingIndex);
  slides.forEach((slide,i) => {
    const elapsed = position - slide.start;
    const fade = reducedMotion.matches ? .08 : i >= 5 && i <= 10 ? .025 : .8;
    const incoming = i === 0 ? 1 : Math.min(1,Math.max(0,elapsed / fade));
    // Previous frame stays under the incoming frame, including the fade to black.
    const visible = introElapsed === null && elapsed >= 0 && (i === endingIndex || position < slide.start + slide.duration + 1.2);
    slide.el.style.opacity = visible ? incoming : 0;
    slide.el.setAttribute('aria-hidden',String(i !== index || introElapsed !== null));
    slide.el.style.zIndex = i;
    if (slide.img) {
      const fraction = Math.min(1,Math.max(0,elapsed / slide.duration));
      // Quiet drift, sharper observation, then a hard cut at the single movement.
      const baseScale = 1;
      const scale = i === 9 ? 1 : baseScale + (i >= 5 && i <= 8 ? .05 : .025) * fraction;
      const zoom = reducedMotion.matches ? baseScale : scale;
      slide.img.style.transform = [4,12].includes(i) ? `scale(${-zoom},${zoom})` : `scale(${zoom})`;
    }
    slide.caption.style.opacity = Math.min(1,Math.max(0,(elapsed - (i === 9 ? 1.2 : .4)) / .8));
    if (i === endingIndex) {
      slide.el.style.opacity = elapsed >= 5 ? Math.max(0,1 - (elapsed - 5)) : (visible ? incoming : 0);
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
  const announcement = t >= introTiming.work ? 'ザ・ファブル。' : t >= introTiming.third && t < introTiming.thirdEnd ? $('#intro-third').textContent : t >= introTiming.second && t < introTiming.secondEnd ? $('#intro-second').textContent : t >= introTiming.first && t < introTiming.firstEnd ? $('#intro-first').textContent : '';
  if ($('#scene-description').textContent !== announcement) $('#scene-description').textContent = announcement;
}
function syncAudio(seek = false) {

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
    if (!soundOn || !playing || audio.volume === 0) audio.pause();
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
  // Start this same soundtrack in the user gesture; native looping preserves MP3 gapless metadata.
  setPlaying(true,true);
  $('#toggle').focus({preventScroll:true});
}
function next() {
  if (introElapsed !== null) return;
  if (current >= endingIndex) { beginIntroduction(); render(); return; }
  position = slides[current + 1].start;
  lastFrame = performance.now();
  syncAudio();
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
  const failed = results.some(result => result.status === 'rejected');
  $('#loading').textContent = failed ? '一部の画像を読み込めませんでした。再読み込みをお試しください。' : '';
  $('#with-sound').disabled = failed;
  $('#without-sound').disabled = failed;
});
