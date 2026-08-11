
(function(){
  "use strict";

  /* ---------------- PRESETS ---------------- */
  const PRESETS = {
    bullet: [
      {label:"Bullet", min:1, inc:0},
      {label:"Bullet", min:1, inc:1},
      {label:"Bullet", min:2, inc:1},
    ],
    blitz: [
      {label:"Blitz", min:3, inc:0},
      {label:"Blitz", min:3, inc:2},
      {label:"Blitz", min:5, inc:0},
    ],
    rapid: [
      {label:"Rapid", min:10, inc:0},
      {label:"Rapid", min:15, inc:10},
      {label:"Rapid", min:25, inc:0},
    ],
    classical: [
      {label:"Classical", min:30, inc:0},
      {label:"Classical", min:30, inc:20},
      {label:"Classical", min:60, inc:0},
    ]
  };

  function fmtPresetTime(min, inc){
    return inc>0 ? `${min}+${inc}` : `${min} min`;
  }

  const grids = {
    bullet: document.getElementById('grid-bullet'),
    blitz: document.getElementById('grid-blitz'),
    rapid: document.getElementById('grid-rapid'),
    classical: document.getElementById('grid-classical'),
  };

  let selectedConfig = null; // {wMs, bMs, wInc, bInc, label}
  let selectedBtn = null;

  function buildPresetButtons(){
    Object.keys(PRESETS).forEach(cat=>{
      PRESETS[cat].forEach(p=>{
        const btn = document.createElement('div');
        btn.className = 'preset-btn';
        btn.innerHTML = `<div class="t">${fmtPresetTime(p.min,p.inc)}</div><div class="l">${p.label}</div>`;
        btn.addEventListener('click', ()=>{
          clearSelection();
          btn.classList.add('selected');
          selectedBtn = btn;
          const ms = p.min*60000;
          selectedConfig = {
            wMs: ms, bMs: ms, wInc: p.inc, bInc: p.inc,
            label: `${p.label} · ${fmtPresetTime(p.min,p.inc)}`
          };
          updateStartBtn();
          closeCustom();
        });
        grids[cat].appendChild(btn);
      });
    });
  }

  function clearSelection(){
    document.querySelectorAll('.preset-btn.selected').forEach(b=>b.classList.remove('selected'));
    customToggle.classList.remove('selected');
    selectedBtn = null;
  }

  function updateStartBtn(){
    const startBtn = document.getElementById('startBtn');
    const echo = document.getElementById('selEcho');
    if(selectedConfig){
      startBtn.disabled = false;
      echo.textContent = selectedConfig.label;
    } else {
      startBtn.disabled = true;
      echo.textContent = "Choose a time control above";
    }
  }

  buildPresetButtons();

  /* ---------------- CUSTOM PANEL ---------------- */
  const customToggle = document.getElementById('customToggle');
  const customPanel = document.getElementById('customPanel');
  const mirrorCheck = document.getElementById('mirrorCheck');
  const wMin = document.getElementById('wMin'), wSec = document.getElementById('wSec'), wInc = document.getElementById('wInc');
  const bMin = document.getElementById('bMin'), bSec = document.getElementById('bSec'), bInc = document.getElementById('bInc');
  const bFields = [bMin,bSec,bInc];

  function closeCustom(){
    customToggle.classList.remove('open');
    customPanel.classList.remove('open');
  }

  customToggle.addEventListener('click', ()=>{
    const willOpen = !customPanel.classList.contains('open');
    customToggle.classList.toggle('open', willOpen);
    customPanel.classList.toggle('open', willOpen);
    if(willOpen){
      clearSelection();
      customToggle.classList.add('selected');
      applyCustom();
    }
  });

  function setBlackDisabled(disabled){
    bFields.forEach(f=>{ f.disabled = disabled; f.style.opacity = disabled ? .45 : 1; });
  }

  mirrorCheck.addEventListener('change', ()=>{
    setBlackDisabled(mirrorCheck.checked);
    applyCustom();
  });
  setBlackDisabled(true);

  function clamp(n, lo, hi){ n = isNaN(n)?lo:n; return Math.min(hi, Math.max(lo, n)); }

  function applyCustom(){
    const wM = clamp(parseInt(wMin.value),0,999);
    const wS = clamp(parseInt(wSec.value),0,59);
    const wI = clamp(parseInt(wInc.value),0,999);
    let bM = wM, bS = wS, bI = wI;
    if(!mirrorCheck.checked){
      bM = clamp(parseInt(bMin.value),0,999);
      bS = clamp(parseInt(bSec.value),0,59);
      bI = clamp(parseInt(bInc.value),0,999);
    }
    const wMs = (wM*60 + wS)*1000;
    const bMs = (bM*60 + bS)*1000;
    if(wMs<=0 && bMs<=0){
      selectedConfig = null;
      updateStartBtn();
      return;
    }
    const wLabel = wS>0 ? `${wM}:${String(wS).padStart(2,'0')}` : `${wM}min`;
    const bLabel = bS>0 ? `${bM}:${String(bS).padStart(2,'0')}` : `${bM}min`;
    let label = `Custom · W ${wLabel}+${wI}`;
    if(!mirrorCheck.checked) label += `  ·  B ${bLabel}+${bI}`;
    selectedConfig = { wMs: Math.max(wMs,0), bMs: Math.max(bMs,0), wInc:wI, bInc:bI, label };
    updateStartBtn();
  }

  [wMin,wSec,wInc,bMin,bSec,bInc].forEach(el=>{
    el.addEventListener('input', ()=>{
      if(!customToggle.classList.contains('selected')){
        clearSelection();
        customToggle.classList.add('selected');
      }
      applyCustom();
    });
  });

  /* ---------------- START GAME ---------------- */
  const setupScreen = document.getElementById('setupScreen');
  const clockScreen = document.getElementById('clockScreen');
  document.getElementById('startBtn').addEventListener('click', ()=>{
    if(!selectedConfig) return;
    ensureAudio();
    initClock(selectedConfig);
    setupScreen.style.display = 'none';
    clockScreen.classList.add('active');
  });

  /* ---------------- CLOCK LOGIC ---------------- */
  const halfWhite = document.getElementById('halfWhite');
  const halfBlack = document.getElementById('halfBlack');
  const timeWhiteEl = document.getElementById('timeWhite');
  const timeBlackEl = document.getElementById('timeBlack');
  const incWhiteEl = document.getElementById('incWhite');
  const incBlackEl = document.getElementById('incBlack');
  const flagWhiteEl = document.getElementById('flagWhite');
  const flagBlackEl = document.getElementById('flagBlack');
  const centerLabel = document.getElementById('centerLabel');
  const readyHint = document.getElementById('readyHint');
  const btnPause = document.getElementById('btnPause');
  const pauseIcon = document.getElementById('pauseIcon');
  const playIcon = document.getElementById('playIcon');
  const btnReset = document.getElementById('btnReset');
  const btnMenu = document.getElementById('btnMenu');
  const btnSound = document.getElementById('btnSound');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');

  /* ---------------- SOUND ---------------- */
  let audioCtx = null;
  let muted = false;

  function ensureAudio(){
    if(!audioCtx){
      try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ audioCtx = null; }
    }
    if(audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume(); }
  }

  function playTone(freq, duration, type, volume, delay){
    if(muted || !audioCtx) return;
    delay = delay || 0;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // sharp mechanical click, like pressing a physical clock plunger
  function playClick(){ playTone(680, 0.07, 'square', 0.16); }
  // soft tap for menu/pause/reset UI buttons
  function playUIClick(){ playTone(500, 0.05, 'sine', 0.1); }
  // single warning tick, used each second in the final countdown
  function playTickWarn(){ playTone(1050, 0.05, 'sine', 0.13); }
  // descending three-note alarm when a player's flag falls
  function playFlagAlarm(){
    playTone(880, 0.18, 'sawtooth', 0.2, 0);
    playTone(660, 0.18, 'sawtooth', 0.2, 0.2);
    playTone(440, 0.32, 'sawtooth', 0.2, 0.4);
  }

  btnSound.addEventListener('click', (e)=>{
    e.stopPropagation();
    ensureAudio();
    muted = !muted;
    soundOnIcon.style.display = muted ? 'none' : 'block';
    soundOffIcon.style.display = muted ? 'block' : 'none';
    if(!muted) playUIClick();
  });

  let players; // [{ms, inc, el, incEl, flagEl, half}]
  let active = null;   // 0 = white, 1 = black
  let running = false;
  let started = false;
  let flagged = false;
  let lastTimestamp = null;
  const TICK_MS = 100; // update display 10x/sec, but always measured against real Date.now()

  function initClock(cfg){
    players = [
      { ms: cfg.wMs, inc: cfg.wInc*1000, el: timeWhiteEl, incEl: incWhiteEl, flagEl: flagWhiteEl, half: halfWhite, lastAnnouncedSecond: null },
      { ms: cfg.bMs, inc: cfg.bInc*1000, el: timeBlackEl, incEl: incBlackEl, flagEl: flagBlackEl, half: halfBlack, lastAnnouncedSecond: null }
    ];
    active = null;
    running = false;
    started = false;
    flagged = false;
    lastTimestamp = null;
    // NOTE: the setInterval loop below is started once at page load and kept
    // alive forever — never stop it here, it just no-ops while not running.

    players.forEach((p,i)=>{
      p.half.classList.remove('is-active','is-flagged','is-disabled');
      p.flagEl.style.display = 'none';
      if(p.inc>0){ p.incEl.style.display='inline-block'; p.incEl.textContent = `+${p.inc/1000}s`; }
      else { p.incEl.style.display='none'; }
      renderTime(p);
    });
    centerLabel.textContent = 'READY';
    readyHint.style.display = 'block';
    setPauseIcon(false);
  }

  function renderTime(p){
    const ms = Math.max(0,p.ms);
    const totalSec = ms/1000;
    let str;
    if(totalSec < 20){
      str = totalSec.toFixed(1);
    } else {
      const m = Math.floor(totalSec/60);
      const s = Math.floor(totalSec%60);
      str = `${m}:${String(s).padStart(2,'0')}`;
    }
    p.el.textContent = str;
    p.el.classList.toggle('critical', totalSec < 10);
    p.el.classList.toggle('low', totalSec >= 10 && totalSec < 30);
  }

  function setPauseIcon(isRunning){
    pauseIcon.style.display = isRunning ? 'block' : 'none';
    playIcon.style.display = isRunning ? 'none' : 'block';
  }

  function tick(){
    const now = Date.now();
    if(running && !flagged && active!==null){
      if(lastTimestamp===null) lastTimestamp = now;
      const delta = now - lastTimestamp;
      lastTimestamp = now;
      const p = players[active];
      p.ms -= delta;
      if(p.ms <= 0){
        p.ms = 0;
        renderTime(p);
        onFlag(active);
      } else {
        renderTime(p);
        // tick sound once per second during the final countdown
        const secLeft = Math.ceil(p.ms/1000);
        if(secLeft <= 10 && secLeft >= 1 && secLeft !== p.lastAnnouncedSecond){
          p.lastAnnouncedSecond = secLeft;
          playTickWarn();
        }
      }
    } else {
      lastTimestamp = null;
    }
  }
  // Real wall-clock timer: Date.now() diffs mean 1 displayed second always
  // equals 1 real second, regardless of frame rate or tab throttling.
  setInterval(tick, TICK_MS);

  function onFlag(idx){
    flagged = true;
    running = false;
    setPauseIcon(false);
    playFlagAlarm();
    players[idx].half.classList.add('is-flagged');
    players[idx].flagEl.style.display = 'block';
    players.forEach(p=>p.half.classList.add('is-disabled'));
    centerLabel.textContent = 'GAME OVER';
    readyHint.style.display = 'none';
  }

  function pressHalf(idx){
    if(flagged) return;
    ensureAudio();
    if(!started){
      // First press: the presser just finished their move -> opponent's clock starts.
      started = true;
      running = true;
      active = 1 - idx;
      lastTimestamp = null;
      players[idx].half.classList.remove('is-active');
      players[active].half.classList.add('is-active');
      centerLabel.textContent = 'PLAYING';
      readyHint.style.display = 'none';
      setPauseIcon(true);
      playClick();
      return;
    }
    if(!running) return; // paused, ignore taps
    if(idx !== active) return; // can only end your own turn

    // add increment to the player who just moved, then switch turn
    players[idx].ms += players[idx].inc;
    renderTime(players[idx]);
    players[idx].half.classList.remove('is-active');
    active = 1 - idx;
    players[active].half.classList.add('is-active');
    players[active].lastAnnouncedSecond = null;
    lastTimestamp = null;
    playClick();
  }

  halfWhite.addEventListener('click', ()=>pressHalf(0));
  halfBlack.addEventListener('click', ()=>pressHalf(1));

  btnPause.addEventListener('click', (e)=>{
    e.stopPropagation();
    ensureAudio();
    if(!started || flagged) return;
    running = !running;
    lastTimestamp = null;
    setPauseIcon(running);
    centerLabel.textContent = running ? 'PLAYING' : 'PAUSED';
    playUIClick();
  });

  btnReset.addEventListener('click', (e)=>{
    e.stopPropagation();
    ensureAudio();
    playUIClick();
    if(selectedConfig) initClock(selectedConfig);
  });

  btnMenu.addEventListener('click', (e)=>{
    e.stopPropagation();
    ensureAudio();
    playUIClick();
    running = false;
    clockScreen.classList.remove('active');
    setupScreen.style.display = 'flex';
  });

})();
