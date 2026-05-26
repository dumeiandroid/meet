/**
 * lidan-meet.js
 * Injectable script — sisipkan di <head> halaman soal manapun.
 * Otomatis inject UI lobby, Jitsi meeting, PiP kamera, dan sistem sinyal.
 *
 * Cara pakai:
 *   <script src="lidan-meet.js"></script>
 *
 * Opsional — tentukan room langsung via attribute:
 *   <script src="lidan-meet.js" data-room="ujian-matematika"></script>
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════
     CONFIG — sesuaikan sesuai kebutuhan
  ══════════════════════════════════════════════════ */
  const BASE_API       = 'https://lidan.co.id/api';
  const SIGNAL_POLL_MS = 2500;

  /* ══════════════════════════════════════════════════
     AMBIL KONFIGURASI DARI SCRIPT TAG
     Contoh: <script src="lidan-meet.js" data-room="ujian-ipa"></script>
  ══════════════════════════════════════════════════ */
  const _scriptTag   = document.currentScript;
  const PRESET_ROOM  = _scriptTag ? (_scriptTag.getAttribute('data-room') || '') : '';

  /* ══════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════ */
  let jitsiAPI      = null;
  let selfStream    = null;
  let micEnabled    = false;
  let roomData      = null;
  let myName        = '';
  let timerInterval = null;
  let meetStart     = null;
  let pollInterval  = null;
  let handRaised    = false;
  let queuePos      = null;
  let adminStatus   = 'idle';
  let _uiInjected   = false;

  /* ══════════════════════════════════════════════════
     CSS — inject ke <head>
  ══════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('lidan-meet-styles')) return;
    const style = document.createElement('style');
    style.id = 'lidan-meet-styles';
    style.textContent = `
      :root {
        --lm-bg: #0b0f1a;
        --lm-bg2: #111827;
        --lm-surface: #161d2e;
        --lm-surface2: #1e2a40;
        --lm-border: #243047;
        --lm-accent: #3b82f6;
        --lm-accent-glow: rgba(59,130,246,0.25);
        --lm-accent2: #06b6d4;
        --lm-success: #10b981;
        --lm-danger: #ef4444;
        --lm-warn: #f59e0b;
        --lm-text: #e8edf5;
        --lm-text-muted: #6b7fa3;
        --lm-text-dim: #3d5170;
        --lm-radius: 14px;
        --lm-radius-sm: 8px;
        --lm-font-display: 'Syne', sans-serif;
        --lm-font-body: 'DM Sans', sans-serif;
      }

      /* ── OVERLAY LOBBY ── */
      #lm-lobby-overlay {
        position: fixed; inset: 0;
        z-index: 99999;
        background: var(--lm-bg);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: var(--lm-font-body);
        color: var(--lm-text);
        padding: 20px;
        overflow-y: auto;
      }
      #lm-lobby-overlay::before {
        content: '';
        position: fixed; inset: 0;
        background-image:
          linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
        background-size: 40px 40px;
        pointer-events: none; z-index: 0;
      }
      #lm-lobby-overlay.lm-hidden { display: none; }

      .lm-lobby-wrap {
        position: relative; z-index: 1;
        width: 100%; max-width: 440px;
        animation: lmFadeUp 0.5s ease both;
      }
      @keyframes lmFadeUp {
        from { opacity:0; transform: translateY(20px); }
        to   { opacity:1; transform: translateY(0); }
      }

      .lm-logo {
        display: flex; align-items: center; gap: 10px;
        margin-bottom: 28px; text-decoration: none;
      }
      .lm-logo-icon {
        width: 34px; height: 34px;
        background: linear-gradient(135deg, var(--lm-accent), var(--lm-accent2));
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
      }
      .lm-logo-text {
        font-family: var(--lm-font-display);
        font-size: 20px; font-weight: 800;
        color: var(--lm-text); letter-spacing: -0.5px;
      }
      .lm-logo-text span {
        background: linear-gradient(90deg, var(--lm-accent), var(--lm-accent2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }

      .lm-hero-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(59,130,246,0.12);
        border: 1px solid rgba(59,130,246,0.25);
        border-radius: 100px; padding: 5px 14px;
        font-size: 12px; font-weight: 500;
        color: var(--lm-accent); letter-spacing: 0.5px;
        text-transform: uppercase; margin-bottom: 16px;
      }
      .lm-hero-title {
        font-family: var(--lm-font-display);
        font-size: clamp(28px, 5vw, 44px);
        font-weight: 800; line-height: 1.1;
        letter-spacing: -1.5px; margin-bottom: 8px;
      }
      .lm-hero-title .lm-hl {
        background: linear-gradient(90deg, var(--lm-accent), var(--lm-accent2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .lm-hero-sub {
        color: var(--lm-text-muted); font-size: 14px;
        line-height: 1.7; margin-bottom: 28px;
      }
      .lm-card {
        background: var(--lm-surface);
        border: 1px solid var(--lm-border);
        border-radius: 20px; padding: 32px;
        box-shadow: 0 24px 80px rgba(0,0,0,0.4);
      }
      .lm-hash-notice {
        display: none;
        background: rgba(59,130,246,0.08);
        border: 1px solid rgba(59,130,246,0.2);
        border-radius: 10px; padding: 12px 16px;
        margin-bottom: 18px;
        font-size: 13px; color: var(--lm-accent);
      }
      .lm-hash-notice.lm-show { display: block; }
      .lm-hash-label {
        font-size: 11px; color: var(--lm-text-muted);
        text-transform: uppercase; letter-spacing: 0.8px;
        margin-bottom: 3px;
      }
      .lm-hash-name {
        font-family: var(--lm-font-display);
        font-weight: 700; font-size: 15px;
      }
      .lm-form-group { margin-bottom: 16px; }
      .lm-label {
        display: block; font-size: 12px; font-weight: 500;
        color: var(--lm-text-muted); text-transform: uppercase;
        letter-spacing: 0.8px; margin-bottom: 7px;
      }
      .lm-input {
        width: 100%; padding: 12px 15px;
        background: var(--lm-bg2);
        border: 1px solid var(--lm-border);
        border-radius: var(--lm-radius-sm);
        color: var(--lm-text);
        font-family: var(--lm-font-body); font-size: 15px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .lm-input:focus {
        border-color: var(--lm-accent);
        box-shadow: 0 0 0 3px var(--lm-accent-glow);
      }
      .lm-input::placeholder { color: var(--lm-text-dim); }
      .lm-btn {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 8px; width: 100%; padding: 13px 20px;
        border: none; border-radius: var(--lm-radius-sm);
        font-family: var(--lm-font-body); font-size: 15px;
        font-weight: 500; cursor: pointer;
        transition: all 0.2s; box-sizing: border-box;
      }
      .lm-btn-primary { background: var(--lm-accent); color: #fff; }
      .lm-btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
      .lm-btn-primary:active { transform: translateY(0); }
      .lm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
      .lm-spinner {
        display: none; width: 16px; height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: lmSpin 0.8s linear infinite;
      }
      .lm-spinner.lm-show { display: block; }
      @keyframes lmSpin { to { transform: rotate(360deg); } }
      .lm-alert {
        display: none; margin-top: 14px;
        padding: 12px 16px; border-radius: 10px;
        font-size: 14px;
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.25);
        color: var(--lm-danger);
      }
      .lm-alert.lm-show { display: block; }

      /* ── JITSI CONTAINER (tersembunyi di balik halaman) ── */
      #lm-jitsi-wrap {
        position: fixed; inset: 0;
        z-index: -1;
        opacity: 0;
        pointer-events: none;
        width: 100%; height: 100%;
      }
      #lm-jitsi-container { width: 100%; height: 100%; }

      /* ── PiP WIDGET ── */
      #lm-pip-widget {
        position: fixed;
        bottom: 20px; left: 0;
        z-index: 99990;
        display: none;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        font-family: var(--lm-font-body);
      }
      #lm-pip-widget.lm-visible { display: flex; }

      .lm-pip-panel {
        background: rgba(11,15,26,0.96);
        border: 1px solid var(--lm-border);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex; flex-direction: column; gap: 8px;
        min-width: 185px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        transform-origin: bottom left;
        transform: scale(0.85) translateY(8px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .lm-pip-panel.lm-open {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: all;
      }
      .lm-admin-bar {
        display: flex; align-items: center; gap: 8px;
        font-size: 11px; color: var(--lm-text-muted);
        padding-bottom: 6px;
        border-bottom: 1px solid var(--lm-border);
      }
      .lm-admin-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--lm-text-dim);
        transition: background 0.3s; flex-shrink: 0;
      }
      .lm-admin-dot.available { background: var(--lm-success); box-shadow: 0 0 6px var(--lm-success); }
      .lm-admin-dot.busy      { background: var(--lm-danger); }
      .lm-admin-dot.broadcast { background: var(--lm-warn); box-shadow: 0 0 6px var(--lm-warn); }
      .lm-admin-dot.idle      { background: var(--lm-text-dim); }

      .lm-queue-info {
        display: none;
        font-size: 11px; color: var(--lm-text-muted);
        background: rgba(245,158,11,0.06);
        border: 1px solid rgba(245,158,11,0.15);
        border-radius: 6px; padding: 5px 10px;
      }
      .lm-queue-info.lm-show { display: block; }

      .lm-strip-btns { display: flex; flex-direction: column; gap: 6px; }
      .lm-ctrl-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 12px; border-radius: 8px;
        font-family: var(--lm-font-body); font-size: 12px; font-weight: 500;
        cursor: pointer; border: 1px solid;
        transition: all 0.2s; width: 100%;
        box-sizing: border-box; text-align: left;
      }
      .lm-ctrl-raise {
        background: rgba(245,158,11,0.12);
        border-color: rgba(245,158,11,0.3);
        color: var(--lm-warn);
      }
      .lm-ctrl-raise:hover { background: rgba(245,158,11,0.2); border-color: var(--lm-warn); }
      .lm-ctrl-raise.lm-in-queue {
        background: rgba(245,158,11,0.2); border-color: var(--lm-warn);
        animation: lmRaiseGlow 2s infinite;
      }
      .lm-ctrl-raise.lm-cancel {
        background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: var(--lm-danger);
      }
      @keyframes lmRaiseGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        50%      { box-shadow: 0 0 0 4px rgba(245,158,11,0.2); }
      }
      .lm-ctrl-hangup {
        background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: var(--lm-danger);
      }
      .lm-ctrl-hangup:hover { background: var(--lm-danger); color: #fff; border-color: var(--lm-danger); }
      .lm-ctrl-mic { background: var(--lm-surface); border-color: var(--lm-border); color: var(--lm-text-muted); }
      .lm-ctrl-mic.lm-active {
        background: rgba(16,185,129,0.1); border-color: var(--lm-success); color: var(--lm-success);
      }

      .lm-self-video-box {
        position: relative;
        width: 140px; height: 100px;
        background: var(--lm-surface);
        border: 2px solid var(--lm-border);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        transition: border-color 0.2s, box-shadow 0.2s;
        flex-shrink: 0;
      }
      .lm-self-video-box:hover {
        border-color: var(--lm-accent);
        box-shadow: 0 4px 20px rgba(59,130,246,0.3);
      }
      .lm-self-video-box.lm-active-pip {
        border-color: var(--lm-accent);
        box-shadow: 0 0 0 3px var(--lm-accent-glow);
      }
      #lm-self-video {
        width: 100%; height: 100%;
        object-fit: cover;
        transform: scaleX(-1);
      }
      .lm-cam-label {
        position: absolute; bottom: 5px; left: 7px;
        font-size: 9px; font-weight: 500;
        background: rgba(0,0,0,0.65);
        color: var(--lm-text); padding: 2px 6px;
        border-radius: 4px; letter-spacing: 0.3px;
        pointer-events: none;
      }
      .lm-pip-hint {
        position: absolute; top: 5px; right: 7px;
        font-size: 10px; opacity: 0.6;
        pointer-events: none;
      }
      .lm-cam-off {
        display: none;
        position: absolute; inset: 0;
        background: var(--lm-surface2);
        align-items: center; justify-content: center;
        flex-direction: column; gap: 4px;
      }
      .lm-cam-off.lm-show { display: flex; }
      .lm-cam-off-icon { font-size: 22px; opacity: 0.5; }

      /* ── TOASTS & BANNERS ── */
      #lm-toast-container {
        position: fixed; top: 70px; right: 20px;
        z-index: 99999; display: flex; flex-direction: column; gap: 8px;
        font-family: var(--lm-font-body);
      }
      .lm-toast {
        background: var(--lm-surface2);
        border: 1px solid var(--lm-border);
        border-radius: 10px; padding: 12px 16px;
        font-size: 14px; max-width: 280px;
        animation: lmToastIn 0.3s ease both;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        color: var(--lm-text);
      }
      .lm-toast.success { border-left: 3px solid var(--lm-success); }
      .lm-toast.warn    { border-left: 3px solid var(--lm-warn); }
      .lm-toast.info    { border-left: 3px solid var(--lm-accent); }
      @keyframes lmToastIn {
        from { opacity:0; transform: translateX(20px); }
        to   { opacity:1; transform: translateX(0); }
      }

      #lm-broadcast-banner {
        display: none;
        position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
        z-index: 99995;
        background: rgba(245,158,11,0.15);
        border: 1px solid rgba(245,158,11,0.4);
        border-radius: 10px; padding: 10px 20px;
        font-size: 13px; color: var(--lm-warn);
        text-align: center;
        font-family: var(--lm-font-body);
        animation: lmFadeUp 0.3s ease;
        white-space: nowrap;
      }
      #lm-broadcast-banner.lm-show { display: block; }

      #lm-private-banner {
        display: none;
        position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
        z-index: 99995;
        background: rgba(59,130,246,0.12);
        border: 1px solid rgba(59,130,246,0.3);
        border-radius: 10px; padding: 10px 20px;
        font-size: 13px; color: var(--lm-accent);
        text-align: center;
        font-family: var(--lm-font-body);
        white-space: nowrap;
      }
      #lm-private-banner.lm-show { display: block; }

      /* ── LOADING SCREEN ── */
      #lm-loading-screen {
        display: none;
        position: fixed; inset: 0;
        z-index: 99998;
        background: var(--lm-bg);
        flex-direction: column;
        align-items: center; justify-content: center;
        gap: 16px;
        font-family: var(--lm-font-body);
        color: var(--lm-text-muted);
        font-size: 14px;
      }
      #lm-loading-screen.lm-show { display: flex; }
      #lm-loading-screen.lm-hidden { display: none; }
      .lm-loading-ring {
        width: 36px; height: 36px;
        border: 3px solid var(--lm-border);
        border-top-color: var(--lm-accent);
        border-radius: 50%;
        animation: lmSpin 0.8s linear infinite;
      }

      /* ── TIMER BADGE ── */
      #lm-timer-badge {
        display: none;
        position: fixed; top: 14px; left: 14px;
        z-index: 99991;
        background: rgba(11,15,26,0.9);
        border: 1px solid var(--lm-border);
        border-radius: 8px; padding: 5px 12px;
        font-family: var(--lm-font-display);
        font-size: 13px; letter-spacing: 1px;
        color: var(--lm-text-muted);
        backdrop-filter: blur(8px);
      }
      #lm-timer-badge.lm-show { display: block; }
    `;
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════
     FONT LOADER
  ══════════════════════════════════════════════════ */
  function injectFonts() {
    if (document.getElementById('lidan-meet-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'lidan-meet-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap';
    document.head.appendChild(link);
  }

  /* ══════════════════════════════════════════════════
     HTML — inject ke <body>
  ══════════════════════════════════════════════════ */
  function injectHTML() {
    if (_uiInjected) return;
    _uiInjected = true;

    const hashRoom = decodeURIComponent(window.location.hash.replace('#', '').trim());
    const presetRoom = PRESET_ROOM || hashRoom;

    // ── LOBBY OVERLAY ──
    const lobby = document.createElement('div');
    lobby.id = 'lm-lobby-overlay';
    lobby.innerHTML = `
      <div class="lm-lobby-wrap">
        <div class="lm-logo">
          <div class="lm-logo-icon">🎓</div>
          <div class="lm-logo-text">Lidan<span>Meet</span></div>
        </div>
        <div class="lm-hero-badge">📋 Peserta Ujian</div>
        <h1 class="lm-hero-title">Masuk ke<br/><span class="lm-hl">Ruang Ujian</span></h1>
        <p class="lm-hero-sub">Masukkan nama dan kode room ujian untuk bergabung. Kamera Anda akan aktif selama ujian berlangsung.</p>

        <div class="lm-card">
          <div class="lm-hash-notice ${presetRoom ? 'lm-show' : ''}" id="lm-hash-notice">
            <div class="lm-hash-label">Room ujian telah ditentukan</div>
            <div class="lm-hash-name" id="lm-hash-room-display">${presetRoom || '—'}</div>
          </div>

          <div class="lm-form-group" id="lm-room-input-group" style="${presetRoom ? 'display:none' : ''}">
            <label class="lm-label" for="lm-inp-room">Kode / Link Room</label>
            <input class="lm-input" type="text" id="lm-inp-room" placeholder="misal: ujian-matematika" value="${presetRoom}" />
          </div>
          <input type="hidden" id="lm-inp-room-hidden" value="${presetRoom}" />

          <div class="lm-form-group">
            <label class="lm-label" for="lm-inp-name">Nama Lengkap</label>
            <input class="lm-input" type="text" id="lm-inp-name" placeholder="Nama Anda akan terlihat pengawas" />
          </div>

          <div class="lm-form-group">
            <label class="lm-label" for="lm-inp-email">Email (opsional)</label>
            <input class="lm-input" type="email" id="lm-inp-email" placeholder="email@contoh.com" />
          </div>

          <button class="lm-btn lm-btn-primary" id="lm-btn-join">
            <span class="lm-spinner" id="lm-spinner"></span>
            <span id="lm-btn-join-text">Masuk Ruang Ujian</span>
          </button>

          <div class="lm-alert" id="lm-alert"></div>
        </div>
      </div>
    `;
    document.body.appendChild(lobby);

    // ── JITSI WRAP (tersembunyi) ──
    const jitsiWrap = document.createElement('div');
    jitsiWrap.id = 'lm-jitsi-wrap';
    jitsiWrap.innerHTML = `<div id="lm-jitsi-container"></div>`;
    document.body.appendChild(jitsiWrap);

    // ── LOADING SCREEN ──
    const loading = document.createElement('div');
    loading.id = 'lm-loading-screen';
    loading.innerHTML = `
      <div class="lm-loading-ring"></div>
      <div>Menghubungkan ke ruang ujian…</div>
    `;
    document.body.appendChild(loading);

    // ── PiP WIDGET ──
    const pip = document.createElement('div');
    pip.id = 'lm-pip-widget';
    pip.innerHTML = `
      <div class="lm-pip-panel" id="lm-pip-panel">
        <div class="lm-admin-bar">
          <div class="lm-admin-dot" id="lm-admin-dot"></div>
          <span id="lm-admin-text">Menghubungkan ke pengawas…</span>
        </div>
        <div class="lm-queue-info" id="lm-queue-info"></div>
        <div class="lm-strip-btns">
          <button class="lm-ctrl-btn lm-ctrl-raise" id="lm-btn-raise">🖐️ Tanya Pengawas</button>
          <button class="lm-ctrl-btn lm-ctrl-mic" id="lm-btn-mic">🔇 Mic Mati</button>
          <button class="lm-ctrl-btn lm-ctrl-hangup" id="lm-btn-leave">📴 Keluar</button>
        </div>
      </div>
      <div class="lm-self-video-box" id="lm-pip-box">
        <video id="lm-self-video" autoplay playsinline muted></video>
        <div class="lm-cam-off" id="lm-cam-off">
          <div class="lm-cam-off-icon">📷</div>
          <div style="font-size:10px;color:var(--lm-text-muted)">Kamera mati</div>
        </div>
        <div class="lm-cam-label">Kamera Anda</div>
        <div class="lm-pip-hint">⚙️</div>
      </div>
    `;
    document.body.appendChild(pip);

    // ── TIMER ──
    const timer = document.createElement('div');
    timer.id = 'lm-timer-badge';
    timer.textContent = '00:00';
    document.body.appendChild(timer);

    // ── NOTIFIKASI ──
    const toasts = document.createElement('div');
    toasts.id = 'lm-toast-container';
    document.body.appendChild(toasts);

    const bcastBanner = document.createElement('div');
    bcastBanner.id = 'lm-broadcast-banner';
    bcastBanner.textContent = '📢 Pengawas sedang berbicara kepada semua peserta';
    document.body.appendChild(bcastBanner);

    const privateBanner = document.createElement('div');
    privateBanner.id = 'lm-private-banner';
    privateBanner.textContent = '📞 Pengawas sedang menghubungi Anda secara privat';
    document.body.appendChild(privateBanner);

    // ── EVENT LISTENERS ──
    document.getElementById('lm-btn-join').addEventListener('click', handleJoin);
    document.getElementById('lm-btn-raise').addEventListener('click', handleRaiseHand);
    document.getElementById('lm-btn-mic').addEventListener('click', toggleMic);
    document.getElementById('lm-btn-leave').addEventListener('click', handleLeave);
    document.getElementById('lm-pip-box').addEventListener('click', togglePipPanel);

    // Cegah tutup tab saat ujian
    window.addEventListener('beforeunload', function (e) {
      if (roomData) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ══════════════════════════════════════════════════
     SESSION PERSIST
  ══════════════════════════════════════════════════ */
  function saveSession() {
    if (!roomData || !myName) return;
    sessionStorage.setItem('lidan_session', JSON.stringify({
      roomData, myName,
      myEmail: (document.getElementById('lm-inp-email') || {}).value || ''
    }));
  }
  function clearSession() {
    sessionStorage.removeItem('lidan_session');
  }
  function restoreSession() {
    const saved = sessionStorage.getItem('lidan_session');
    if (!saved) return false;
    try {
      const sess = JSON.parse(saved);
      if (sess.roomData && sess.myName) {
        roomData = sess.roomData;
        myName   = sess.myName;
        return true;
      }
    } catch (e) { sessionStorage.removeItem('lidan_session'); }
    return false;
  }

  /* ══════════════════════════════════════════════════
     JOIN
  ══════════════════════════════════════════════════ */
  async function handleJoin() {
    const roomInput = (
      document.getElementById('lm-inp-room-hidden').value ||
      document.getElementById('lm-inp-room').value
    ).trim();
    const displayName = document.getElementById('lm-inp-name').value.trim();
    const email       = document.getElementById('lm-inp-email').value.trim();

    if (!roomInput)   return showAlert('Kode room wajib diisi.');
    if (!displayName) return showAlert('Nama lengkap wajib diisi.');

    setLoading(true);
    hideAlert();

    try {
      const res = await fetch(`${BASE_API}/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: roomInput, displayName, userEmail: email }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (!data.success || !data.token) {
        setLoading(false);
        return showAlert(data.error || 'Gagal mendapatkan token.');
      }
      roomData = data;
      myName   = displayName;
    } catch (e) {
      setLoading(false);
      return showAlert('Tidak dapat terhubung ke server.');
    }

    await startSelfCamera();
    startMeet();
    setLoading(false);
  }

  /* ══════════════════════════════════════════════════
     SELF CAMERA
  ══════════════════════════════════════════════════ */
  async function startSelfCamera() {
    try {
      selfStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const vid = document.getElementById('lm-self-video');
      vid.srcObject = selfStream;
      document.getElementById('lm-cam-off').classList.remove('lm-show');
      selfStream.getAudioTracks().forEach(t => t.enabled = false);
    } catch (e) {
      document.getElementById('lm-cam-off').classList.add('lm-show');
    }
  }

  /* ══════════════════════════════════════════════════
     START MEET
  ══════════════════════════════════════════════════ */
  function startMeet() {
    // Sembunyikan lobby
    document.getElementById('lm-lobby-overlay').classList.add('lm-hidden');
    // Tampilkan loading
    document.getElementById('lm-loading-screen').classList.add('lm-show');
    // Tampilkan pip widget
    document.getElementById('lm-pip-widget').classList.add('lm-visible');
    // Timer
    document.getElementById('lm-timer-badge').classList.add('lm-show');
    meetStart     = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    // Simpan session
    saveSession();
    // Hash URL
    window.location.hash = encodeURIComponent(roomData.room);
    // Embed Jitsi
    embedJitsi();
    // Mulai polling sinyal
    startSignalPoll();
  }

  /* ══════════════════════════════════════════════════
     JITSI EMBED
  ══════════════════════════════════════════════════ */
  function embedJitsi() {
    const container = document.getElementById('lm-jitsi-container');

    const tryEmbed = () => {
      if (typeof JitsiMeetExternalAPI === 'undefined') {
        setTimeout(tryEmbed, 400); return;
      }

      const cleanToken = (roomData.token || '').replace(/^"|"$/g, '').trim();

      const options = {
        roomName: roomData.room,
        width: '100%', height: '100%',
        parentNode: container,
        jwt: cleanToken,
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: true,
          enableWelcomePage: false,
          defaultRemoteDisplayName: 'Peserta',
          disableModeratorIndicator: true,
          toolbarButtons: [],
          filmstrip: { enabled: false },
          disableTileView: true,
          hideConferenceSubject: true,
          subject: ' ',
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_ALWAYS_VISIBLE: false,
          DEFAULT_BACKGROUND: '#0b0f1a',
          APP_NAME: 'Lidan Meet',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Peserta',
          FILM_STRIP_MAX_HEIGHT: 0,
        },
      };

      if (jitsiAPI) { try { jitsiAPI.dispose(); } catch {} }
      container.querySelectorAll('iframe').forEach(el => el.remove());

      jitsiAPI = new JitsiMeetExternalAPI(roomData.domain, options);

      jitsiAPI.addEventListener('videoConferenceJoined', () => {
        // Sembunyikan loading
        document.getElementById('lm-loading-screen').classList.add('lm-hidden');
        // Jitsi tetap jalan di background (audio WebRTC)
        jitsiAPI.executeCommand('toggleAudio');
        showToast('✅ Terhubung ke ruang ujian.', 'success');
      });

      // Fallback hide loading
      setTimeout(() => {
        document.getElementById('lm-loading-screen').classList.add('lm-hidden');
      }, 7000);
    };

    // Load Jitsi script jika belum ada
    if (typeof JitsiMeetExternalAPI === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://8x8.vc/vpaas-magic-cookie-6a0d4b63e58e420781a516524f2d3fd3/external_api.js';
      s.onload = tryEmbed;
      document.head.appendChild(s);
    } else {
      tryEmbed();
    }
  }

  /* ══════════════════════════════════════════════════
     LEAVE
  ══════════════════════════════════════════════════ */
  function handleLeave() {
    if (!confirm('Yakin ingin keluar dari ruang ujian?')) return;

    if (handRaised) signalSend('cancel-hand', { name: myName });
    if (jitsiAPI)   { try { jitsiAPI.dispose(); } catch {} jitsiAPI = null; }
    if (selfStream) { selfStream.getTracks().forEach(t => t.stop()); selfStream = null; }

    clearInterval(timerInterval);
    clearInterval(pollInterval);
    timerInterval = pollInterval = null;

    document.getElementById('lm-pip-widget').classList.remove('lm-visible');
    document.getElementById('lm-pip-panel').classList.remove('lm-open');
    document.getElementById('lm-timer-badge').classList.remove('lm-show');
    document.getElementById('lm-loading-screen').classList.remove('lm-show', 'lm-hidden');
    document.getElementById('lm-broadcast-banner').classList.remove('lm-show');
    document.getElementById('lm-private-banner').classList.remove('lm-show');
    document.getElementById('lm-lobby-overlay').classList.remove('lm-hidden');

    window.location.hash = '';
    clearSession();
    roomData = null; myName = ''; handRaised = false; micEnabled = false;
  }

  /* ══════════════════════════════════════════════════
     PiP PANEL TOGGLE
  ══════════════════════════════════════════════════ */
  function togglePipPanel() {
    const panel  = document.getElementById('lm-pip-panel');
    const box    = document.getElementById('lm-pip-box');
    const isOpen = panel.classList.contains('lm-open');
    panel.classList.toggle('lm-open', !isOpen);
    box.classList.toggle('lm-active-pip', !isOpen);
  }

  /* ══════════════════════════════════════════════════
     MIC TOGGLE
  ══════════════════════════════════════════════════ */
  function toggleMic() {
    if (!jitsiAPI) return;
    micEnabled = !micEnabled;
    jitsiAPI.executeCommand('toggleAudio');

    if (selfStream) {
      selfStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
    }

    const btn = document.getElementById('lm-btn-mic');
    if (micEnabled) {
      btn.textContent = '🎙️ Mic Hidup';
      btn.classList.add('lm-active');
    } else {
      btn.textContent = '🔇 Mic Mati';
      btn.classList.remove('lm-active');
    }
  }

  /* ══════════════════════════════════════════════════
     RAISE HAND
  ══════════════════════════════════════════════════ */
  async function handleRaiseHand() {
    if (!roomData) return;
    const btn = document.getElementById('lm-btn-raise');

    if (handRaised) {
      handRaised = false;
      btn.classList.remove('lm-in-queue', 'lm-cancel');
      btn.textContent = '🖐️ Tanya Pengawas';
      document.getElementById('lm-queue-info').classList.remove('lm-show');
      await signalSend('cancel-hand', { name: myName });
      showToast('Pertanyaan dibatalkan.', 'info');
      return;
    }

    if (adminStatus === 'idle') {
      showToast('Pengawas sedang tidak aktif. Coba lagi nanti.', 'warn');
      return;
    }

    handRaised = true;
    btn.classList.add('lm-in-queue');
    btn.textContent = '⏳ Menunggu… (tap untuk batal)';

    const res = await signalSend('raise-hand', { name: myName });
    if (res && res.queuePos !== undefined) {
      if (res.queuePos === 0 && adminStatus === 'available') {
        showToast('Pengawas siap! Mic Anda akan dibuka.', 'success');
        btn.textContent = '🗣️ Sedang Bicara…';
        btn.classList.remove('lm-in-queue');
      } else {
        queuePos = res.queuePos;
        updateQueueDisplay(queuePos);
        btn.classList.add('lm-cancel');
        btn.textContent = `⏳ Antrian #${queuePos + 1} — tap untuk batal`;
      }
    }
  }

  function updateQueueDisplay(pos) {
    const el   = document.getElementById('lm-queue-info');
    const wait = (pos + 1) * 2;
    el.textContent = `Posisi antrian: #${pos + 1} — estimasi tunggu ±${wait} menit`;
    el.classList.add('lm-show');
  }

  /* ══════════════════════════════════════════════════
     SIGNAL — send & poll
  ══════════════════════════════════════════════════ */
  async function signalSend(type, payload = {}) {
    try {
      const res = await fetch(`${BASE_API}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, room: roomData?.room, sender: myName, ...payload }),
      });
      return await res.json();
    } catch { return null; }
  }

  function startSignalPoll() {
    pollInterval = setInterval(pollSignal, SIGNAL_POLL_MS);
    pollSignal();
  }

  async function pollSignal() {
    if (!roomData) return;
    try {
      const res  = await fetch(`${BASE_API}/signal?room=${encodeURIComponent(roomData.room)}&participant=${encodeURIComponent(myName)}`);
      const data = await res.json();
      if (!data.success) return;
      processSignal(data);
    } catch {}
  }

  function processSignal(data) {
    if (data.adminStatus !== undefined) {
      const prev  = adminStatus;
      adminStatus = data.adminStatus;
      updateAdminStatusUI(adminStatus, prev);
    }

    if (data.myQueue !== undefined) {
      queuePos = data.myQueue;
      if (handRaised && queuePos !== null) {
        updateQueueDisplay(queuePos);
        document.getElementById('lm-btn-raise').textContent = `⏳ Antrian #${queuePos + 1} — tap untuk batal`;
      }
    }

    if (data.answerPrivate && data.answerPrivate === myName) {
      showPrivateCallBanner();
      if (!micEnabled) toggleMic();
    }

    if (data.broadcast) {
      document.getElementById('lm-broadcast-banner').classList.add('lm-show');
    } else {
      document.getElementById('lm-broadcast-banner').classList.remove('lm-show');
    }

    if (data.queueDone && handRaised) {
      handRaised = false;
      queuePos   = null;
      const btn  = document.getElementById('lm-btn-raise');
      btn.classList.remove('lm-in-queue', 'lm-cancel');
      btn.textContent = '🖐️ Tanya Pengawas';
      document.getElementById('lm-queue-info').classList.remove('lm-show');
      if (micEnabled) toggleMic();
      showToast('Sesi tanya jawab selesai. Mic Anda dinonaktifkan.', 'info');
    }
  }

  function updateAdminStatusUI(status, prev) {
    const dot  = document.getElementById('lm-admin-dot');
    const text = document.getElementById('lm-admin-text');
    dot.className = 'lm-admin-dot';

    const map = {
      available: { cls: 'available', label: '🟢 Pengawas tersedia' },
      busy:      { cls: 'busy',      label: '🔴 Pengawas sedang bicara privat' },
      broadcast: { cls: 'broadcast', label: '📢 Pengawas sedang bicara ke semua' },
      idle:      { cls: 'idle',      label: '⏸️ Pengawas tidak aktif' },
    };
    const s = map[status] || map.idle;
    dot.classList.add(s.cls);
    text.textContent = s.label;

    if (status === 'broadcast' && prev !== 'broadcast') {
      showToast('📢 Pengawas sedang bicara kepada semua peserta.', 'warn');
    }
  }

  function showPrivateCallBanner() {
    const el = document.getElementById('lm-private-banner');
    el.classList.add('lm-show');
    showToast('📞 Pengawas menghubungi Anda. Mic dibuka otomatis.', 'success');
    setTimeout(() => el.classList.remove('lm-show'), 6000);
  }

  /* ══════════════════════════════════════════════════
     TIMER
  ══════════════════════════════════════════════════ */
  function updateTimer() {
    const e = Math.floor((Date.now() - meetStart) / 1000);
    const m = String(Math.floor(e / 60)).padStart(2, '0');
    const s = String(e % 60).padStart(2, '0');
    document.getElementById('lm-timer-badge').textContent = `${m}:${s}`;
  }

  /* ══════════════════════════════════════════════════
     UI HELPERS
  ══════════════════════════════════════════════════ */
  function setLoading(on) {
    const btn  = document.getElementById('lm-btn-join');
    const sp   = document.getElementById('lm-spinner');
    const text = document.getElementById('lm-btn-join-text');
    btn.disabled = on;
    sp.classList.toggle('lm-show', on);
    text.textContent = on ? 'Menghubungkan…' : 'Masuk Ruang Ujian';
  }

  function showAlert(msg) {
    const el = document.getElementById('lm-alert');
    el.textContent = msg;
    el.classList.add('lm-show');
  }
  function hideAlert() {
    document.getElementById('lm-alert').classList.remove('lm-show');
  }

  function showToast(msg, type = 'info') {
    const c = document.getElementById('lm-toast-container');
    const t = document.createElement('div');
    t.className  = `lm-toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity    = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 300);
    }, 4000);
  }

  /* ══════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════ */
  function boot() {
    injectFonts();
    injectStyles();
    injectHTML();

    // Restore session jika ada (misal setelah refresh)
    if (restoreSession()) {
      startSelfCamera().then(() => startMeet());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();