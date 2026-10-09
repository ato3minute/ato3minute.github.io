// Episode 5 uses one continuous, looping BGM throughout the film.
const story = episodeFiveStory;
const $ = selector => document.querySelector(selector);
const audio = $('#bgm');
const bgmVolume = .30;
function updateBgmVolume() {
  const fade = introElapsed === null ? 0 : Math.max(0, Math.min(1,
    (introElapsed - introTiming.third) / (introTiming.work - introTiming.third)));
  audio.muted = !soundOn;
  audio.volume = soundOn ? bgmVolume * (1 - fade) : 0;
  if (!soundOn || audio.volume === 0) audio.pause();
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const screeningDuration = story.reduce((sum,cut) => sum + cut[1],0);
const introTiming = { first:1, firstEnd:4, second:4.5, secondEnd:7.5, third:8, thirdEnd:11, work:11.8, cta:13.5, end:15, audioFade:10 };
let introElapsed = null;
const endingIndex = story.length - 1;
let total = 0;
const slides = story.map(([image,duration,text,description,beats],index) => {
  const start = total;
  total += duration;
  const el = document.createElement('div');
  el.className = 'scene';
  if (!image) el.classList.add('opening');
  el.classList.add('youth');
  el.classList.add('mindgames');
  if (index === endingIndex) el.classList.add('first-move');
  el.setAttribute('aria-hidden','true');
  let img = null;
  if (image) {
    img = document.createElement('img');
    // Keep their hopeful faces until both absurdly decide it might be a trap.
    img.src = `assets/images/episode-05-v2/${index === 12 ? '12' : image}.jpg`;
    el.style.backgroundImage = `url("${img.src}")`;
    img.alt = '';
    img.draggable = false;
    el.append(img);
  }
  const caption = document.createElement('div');
  caption.className = 'caption';
  caption.textContent = text;
  el.append(caption);
  let reactionImg = null, twistImg = null;
  if (index === 12) {
    twistImg = document.createElement('img');
    twistImg.src = 'assets/images/episode-05-v2/13.jpg';
    twistImg.className = 'twist-frame';
    twistImg.alt = '';
    twistImg.draggable = false;
    twistImg.style.opacity = 0;
    el.append(twistImg);
  }
  if (index === endingIndex) {
    reactionImg = document.createElement('img');
    reactionImg.src = 'assets/images/episode-05-v2/15-reaction.jpg';
    reactionImg.className = 'reaction-frame';
    reactionImg.alt = '';
    reactionImg.draggable = false;
    reactionImg.style.opacity = 0;
    el.append(reactionImg);
  }
  $('#scenes').append(el);
  return {start,duration,description,beats,el,img,reactionImg,twistImg,caption,phase:-1};
});
let position = 0, playing = false, started = false, soundOn = false;
let lastFrame = 0, current = -1;
audio.volume = bgmVolume;
audio.muted = true;
audio.loop = true;
const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
// All dialogue, thoughts, and the final reaction use the film clock.
function renderBeat(slide,index,t) {
  const beats = slide.beats || [];
  let phase = 0;
  beats.forEach((beat,i) => { if (t >= beat.at) phase = i; });
  const beat = beats[phase] || {kind:'quiet',line:''};
  if (slide.phase !== phase) {
    slide.phase = phase;
    slide.caption.replaceChildren();
    slide.caption.dataset.kind = beat.kind;
    slide.el.classList.toggle('trap-active',beat.kind === 'trap');
    if (beat.tag) {
      const tag = document.createElement('span');
      tag.className = 'beat-tag'; tag.textContent = beat.tag;
      slide.caption.append(tag);
    }
    if (beat.line) {
      if (beat.speaker) {
        const name = document.createElement('span');
        name.className = 'speaker-name'; name.textContent = beat.speaker;
        slide.caption.append(name);
      }
      const line = document.createElement('p');
      line.className = 'spoken-line'; line.textContent = beat.line;
      slide.caption.append(line);
    }
    if (beat.boy || beat.girl) {
      const grid = document.createElement('div'); grid.className = 'thought-grid';
      for (const [side,name,value] of [['boy','蒼太の本音',beat.boy],['girl','灯里の本音',beat.girl]]) {
        if (!value) continue;
        const card = document.createElement('div'); card.className = 'thought-box ' + side;
        const label = document.createElement('span'); label.className = 'thought-label'; label.textContent = name;
        const thought = document.createElement('p'); thought.textContent = value;
        card.append(label,thought); grid.append(card);
      }
      slide.caption.append(grid);
    }
  }
  // A small synchronized jolt makes their shared "trap" paranoia the punchline.
  const local = Math.max(0,t - beat.at);
  const jolt = beat.kind === 'trap' && !reducedMotion.matches ? Math.sin(local * 24) * Math.max(0,1 - local / .4) * 4 : 0;
  slide.caption.style.transform = 'translateY(' + jolt + 'px)';
  for (const [frame,switched] of [[slide.reactionImg,!!beat.reaction],[slide.twistImg,beat.kind === 'trap']]) {
    if (!frame) continue;
    slide.img.style.opacity = switched ? 0 : 1;
    frame.style.opacity = switched ? 1 : 0;
    slide.el.style.backgroundImage = 'url("' + (switched ? frame.src : slide.img.src) + '")';
  }
}
$('.progress').setAttribute('aria-valuemax',String(screeningDuration));
function render() {
  const index = slides.findIndex((slide,i) => position < slide.start + slide.duration || i === endingIndex);
  slides.forEach((slide,i) => {
    const elapsed = position - slide.start;
    const fade = reducedMotion.matches ? .08 : [2,4,5,6,7,12,14].includes(i) ? .12 : .65;
    const incoming = i === 0 ? 1 : Math.min(1,Math.max(0,elapsed / fade));
    // Previous frame stays under the incoming frame, including the fade to black.
    const visible = introElapsed === null && elapsed >= 0 && (i === endingIndex || position < slide.start + slide.duration + 1.2);
    slide.el.style.opacity = visible ? incoming : 0;
    slide.el.setAttribute('aria-hidden',String(i !== index || introElapsed !== null));
    slide.el.style.zIndex = i;
    if (slide.img) {
      const fraction = Math.min(1,Math.max(0,elapsed / slide.duration));
      // Gentle drift for friendship; hold the comic reaction and shared paranoia still.
      const baseScale = 1;
      const scale = [7,12,14].includes(i) ? 1 : baseScale + .012 * fraction;
      const zoom = reducedMotion.matches ? baseScale : scale;
      slide.img.style.transform = `scale(${zoom})`;
    }
    slide.caption.style.opacity = Math.min(1,Math.max(0,(elapsed - .12) / .25));
    renderBeat(slide,i,Math.max(0,elapsed));
    if (i === endingIndex) {
      slide.el.style.opacity = elapsed >= slide.duration - 1 ? Math.max(0,slide.duration - elapsed) : (visible ? incoming : 0);
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
  const announcement = t >= introTiming.work ? 'かぐや様は告らせたい。' : t >= introTiming.third && t < introTiming.thirdEnd ? $('#intro-third').textContent : t >= introTiming.second && t < introTiming.secondEnd ? $('#intro-second').textContent : t >= introTiming.first && t < introTiming.firstEnd ? $('#intro-first').textContent : '';
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
  // Playback starts inside the selected entry button's user gesture.
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
Promise.allSettled(Array.from(document.querySelectorAll('#scenes img')).map(img => img.decode())).then(results => {
  const failed = results.some(result => result.status === 'rejected');
  $('#loading').textContent = failed ? '一部の画像を読み込めませんでした。再読み込みをお試しください。' : '';
  $('#with-sound').disabled = failed;
  $('#without-sound').disabled = failed;
});
