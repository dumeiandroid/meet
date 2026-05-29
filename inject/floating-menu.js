(function () {
  if (document.getElementById('__floatMenuBtn')) return;

  // =============================================
  //  KONFIGURASI MENU — tambah/kurang di sini
  // =============================================
  const menuItems = [
    { label: 'Psikotest', url: 'https://admin.lidan.co.id/admin/psikotest_json_new', icon: '🧠' },
    { label: 'MAU', url: 'https://meet.lidan.co.id/file/mau', icon: '🧠' },
    // Tambahkan menu di bawah ini:
    // { label: 'Nama Menu', url: 'https://...', icon: '📋' },
    // { label: 'Dashboard', url: 'https://example.com/dashboard', icon: '📊' },
    // { label: 'Laporan', url: 'https://example.com/laporan', icon: '📁' },
  ];
  // =============================================

  const STORAGE_KEY = '__floatMenuPos';
  const BTN_SIZE = 52;

  const css = `
    #__floatMenuBtn {
      position: fixed;
      z-index: 2147483640;
      width: ${BTN_SIZE}px;
      height: ${BTN_SIZE}px;
      border-radius: 50%;
      background: #1a56db;
      border: none;
      cursor: grab;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.28);
      outline: none;
      touch-action: none;
      user-select: none;
      transition: background 0.18s, box-shadow 0.15s;
    }
    #__floatMenuBtn:hover { background: #1648c2; }
    #__floatMenuBtn.active { background: #374151; }
    #__floatMenuBtn.dragging { cursor: grabbing; box-shadow: 0 8px 28px rgba(0,0,0,0.38); background: #1648c2; }
    #__floatMenuBtn span {
      display: block;
      width: 22px;
      height: 2.5px;
      background: #fff;
      border-radius: 2px;
      transition: transform 0.25s, opacity 0.2s;
      transform-origin: center;
      pointer-events: none;
    }
    #__floatMenuBtn.active span:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
    #__floatMenuBtn.active span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    #__floatMenuBtn.active span:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }

    #__floatDropdown {
      position: fixed;
      z-index: 2147483641;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      min-width: 230px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      border: 1px solid rgba(0,0,0,0.08);
      animation: __menuSlideIn 0.18s ease;
    }
    #__floatDropdown.open { display: flex; }
    @keyframes __menuSlideIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    .__menuItem {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 18px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #111827;
      cursor: pointer;
      border: none;
      background: transparent;
      text-align: left;
      width: 100%;
      transition: background 0.13s;
      white-space: nowrap;
    }
    .__menuItem:hover { background: #f3f4f6; }
    .__menuItem:not(:last-child) { border-bottom: 1px solid #f1f1f1; }
    .__menuIcon { font-size: 18px; flex-shrink: 0; }
    .__menuLabel { font-weight: 500; }

    #__floatMenuOverlay {
      position: fixed;
      inset: 0;
      z-index: 2147483642;
      background: rgba(10,10,20,0.78);
      display: none;
      flex-direction: column;
      backdrop-filter: blur(2px);
    }
    #__floatMenuOverlay.open { display: flex; }
    #__iframeToolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 48px;
      background: #111827;
      flex-shrink: 0;
    }
    #__iframeTitle {
      color: #f9fafb;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: calc(100% - 80px);
    }
    #__iframeCloseBtn {
      background: #374151;
      border: none;
      color: #f9fafb;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    #__iframeCloseBtn:hover { background: #e11d48; }
    #__floatIframe {
      flex: 1;
      width: 100%;
      border: none;
      display: block;
      background: #fff;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // --- Posisi awal (dari localStorage atau default kanan bawah) ---
  function loadPos() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      right: 28,
      bottom: 28,
    };
  }

  function savePos(left, top) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top })); } catch(e) {}
  }

  function applyPos(el, pos) {
    if (pos.left !== undefined) {
      el.style.left = pos.left + 'px';
      el.style.top  = pos.top  + 'px';
      el.style.right  = 'auto';
      el.style.bottom = 'auto';
    } else {
      el.style.right  = pos.right  + 'px';
      el.style.bottom = pos.bottom + 'px';
      el.style.left = 'auto';
      el.style.top  = 'auto';
    }
  }

  // Burger button
  const btn = document.createElement('button');
  btn.id = '__floatMenuBtn';
  btn.setAttribute('aria-label', 'Buka menu');
  btn.innerHTML = '<span></span><span></span><span></span>';
  applyPos(btn, loadPos());
  document.body.appendChild(btn);

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.id = '__floatDropdown';
  menuItems.forEach((item) => {
    const el = document.createElement('button');
    el.className = '__menuItem';
    el.innerHTML = `<span class="__menuIcon">${item.icon || '🔗'}</span><span class="__menuLabel">${item.label}</span>`;
    el.addEventListener('click', () => openIframe(item.url, item.label));
    dropdown.appendChild(el);
  });
  document.body.appendChild(dropdown);

  // Overlay + iframe
  const overlay = document.createElement('div');
  overlay.id = '__floatMenuOverlay';
  overlay.innerHTML = `
    <div id="__iframeToolbar">
      <span id="__iframeTitle">Loading…</span>
      <button id="__iframeCloseBtn" aria-label="Tutup">✕</button>
    </div>
    <iframe id="__floatIframe" allowfullscreen></iframe>
  `;
  document.body.appendChild(overlay);

  const iframeEl  = overlay.querySelector('#__floatIframe');
  const titleEl   = overlay.querySelector('#__iframeTitle');
  const closeBtn  = overlay.querySelector('#__iframeCloseBtn');

  // =============================================
  //  DRAG LOGIC
  // =============================================
  let isDragging = false;
  let dragMoved  = false;
  let startX, startY, startLeft, startTop;

  function getBtnLeft() { return btn.getBoundingClientRect().left; }
  function getBtnTop()  { return btn.getBoundingClientRect().top; }

  function onDragStart(clientX, clientY) {
    isDragging = true;
    dragMoved  = false;
    startX    = clientX;
    startY    = clientY;
    startLeft = getBtnLeft();
    startTop  = getBtnTop();
    btn.classList.add('dragging');
    // Pindah ke left/top supaya drag akurat
    btn.style.left   = startLeft + 'px';
    btn.style.top    = startTop  + 'px';
    btn.style.right  = 'auto';
    btn.style.bottom = 'auto';
  }

  function onDragMove(clientX, clientY) {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
    if (!dragMoved) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let newLeft = startLeft + dx;
    let newTop  = startTop  + dy;

    // Clamp dalam viewport
    newLeft = Math.max(0, Math.min(vw - BTN_SIZE, newLeft));
    newTop  = Math.max(0, Math.min(vh - BTN_SIZE, newTop));

    btn.style.left = newLeft + 'px';
    btn.style.top  = newTop  + 'px';
    repositionDropdown();
  }

  function onDragEnd(clientX, clientY) {
    if (!isDragging) return;
    isDragging = false;
    btn.classList.remove('dragging');

    const left = parseFloat(btn.style.left);
    const top  = parseFloat(btn.style.top);

    // Snap ke tepi terdekat
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const snapMargin = 16;
    let finalLeft = left;
    let finalTop  = top;

    const distLeft   = left;
    const distRight  = vw - left - BTN_SIZE;
    const distTop    = top;
    const distBottom = vh - top  - BTN_SIZE;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft)        finalLeft = snapMargin;
    else if (minDist === distRight)  finalLeft = vw - BTN_SIZE - snapMargin;
    else if (minDist === distTop)    finalTop  = snapMargin;
    else                             finalTop  = vh - BTN_SIZE - snapMargin;

    btn.style.left = finalLeft + 'px';
    btn.style.top  = finalTop  + 'px';
    savePos(finalLeft, finalTop);
    repositionDropdown();
  }

  // Mouse events
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => onDragMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',   (e) => {
    const wasDragged = dragMoved;
    onDragEnd(e.clientX, e.clientY);
    if (!wasDragged) toggleDropdown();
  });

  // Touch events
  btn.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    onDragStart(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    onDragMove(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const wasDragged = dragMoved;
    onDragEnd(t.clientX, t.clientY);
    if (!wasDragged) toggleDropdown();
  });

  // =============================================
  //  POSISI DROPDOWN mengikuti tombol
  // =============================================
  function repositionDropdown() {
    if (!dropdown.classList.contains('open')) return;
    positionDropdown();
  }

  function positionDropdown() {
    const btnRect = btn.getBoundingClientRect();
    const ddW = dropdown.offsetWidth  || 230;
    const ddH = dropdown.offsetHeight || 100;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const gap = 10;

    // Coba tampil di atas tombol
    let top  = btnRect.top - ddH - gap;
    let left = btnRect.left + BTN_SIZE / 2 - ddW / 2;

    // Kalau keluar atas, tampil di bawah
    if (top < 8) top = btnRect.bottom + gap;
    // Clamp horizontal
    left = Math.max(8, Math.min(vw - ddW - 8, left));
    // Clamp vertical
    top  = Math.max(8, Math.min(vh - ddH - 8, top));

    dropdown.style.left   = left + 'px';
    dropdown.style.top    = top  + 'px';
    dropdown.style.right  = 'auto';
    dropdown.style.bottom = 'auto';
  }

  // =============================================
  //  MENU FUNCTIONS
  // =============================================
  function openIframe(url, label) {
    iframeEl.src = url;
    titleEl.textContent = label;
    overlay.classList.add('open');
    closeDropdown();
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    iframeEl.src = 'about:blank';
  }

  function toggleDropdown() {
    dropdown.classList.contains('open') ? closeDropdown() : openDropdown();
  }

  function openDropdown() {
    dropdown.classList.add('open');
    btn.classList.add('active');
    btn.setAttribute('aria-label', 'Tutup menu');
    positionDropdown();
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    btn.classList.remove('active');
    btn.setAttribute('aria-label', 'Buka menu');
  }

  closeBtn.addEventListener('click', closeOverlay);

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (overlay.classList.contains('open')) closeOverlay();
      else closeDropdown();
    }
  });

  window.addEventListener('resize', () => {
    // Clamp posisi supaya tidak keluar layar saat resize
    const left = parseFloat(btn.style.left) || 0;
    const top  = parseFloat(btn.style.top)  || 0;
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const newLeft = Math.max(0, Math.min(vw - BTN_SIZE, left));
    const newTop  = Math.max(0, Math.min(vh - BTN_SIZE, top));
    btn.style.left = newLeft + 'px';
    btn.style.top  = newTop  + 'px';
    savePos(newLeft, newTop);
    repositionDropdown();
  });

})();