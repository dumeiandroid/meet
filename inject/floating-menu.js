
(function () {
  if (document.getElementById('__floatMenuOverlay')) return;

  // =============================================
  //  KONFIGURASI MENU — tambah/kurang di sini
  // =============================================
  const menuItems = [
    {
      label: 'Psikotest JSON New',
      url: 'https://admin.lidan.co.id/admin/psikotest_json_new',
      icon: '🧠',
    },
    // Tambahkan menu di bawah ini:
    // { label: 'Nama Menu', url: 'https://...', icon: '📋' },
    // { label: 'Dashboard', url: 'https://example.com/dashboard', icon: '📊' },
    // { label: 'Laporan', url: 'https://example.com/laporan', icon: '📁' },
  ];
  // =============================================

  const css = `
    #__floatMenuBtn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483640;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #1a56db;
      border: none;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.28);
      transition: background 0.18s, transform 0.15s;
      outline: none;
    }
    #__floatMenuBtn:hover { background: #1648c2; transform: scale(1.07); }
    #__floatMenuBtn.active { background: #374151; }
    #__floatMenuBtn span {
      display: block;
      width: 22px;
      height: 2.5px;
      background: #fff;
      border-radius: 2px;
      transition: transform 0.25s, opacity 0.2s;
      transform-origin: center;
    }
    #__floatMenuBtn.active span:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
    #__floatMenuBtn.active span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    #__floatMenuBtn.active span:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }

    #__floatDropdown {
      position: fixed;
      bottom: 92px;
      right: 28px;
      z-index: 2147483641;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      min-width: 230px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      border: 1px solid rgba(0,0,0,0.08);
      animation: __menuSlideUp 0.18s ease;
    }
    #__floatDropdown.open { display: flex; }
    @keyframes __menuSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
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

  // Burger button
  const btn = document.createElement('button');
  btn.id = '__floatMenuBtn';
  btn.setAttribute('aria-label', 'Buka menu');
  btn.innerHTML = '<span></span><span></span><span></span>';
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
    <iframe id="__floatIframe" id="__floatIframe" allowfullscreen></iframe>
  `;
  document.body.appendChild(overlay);

  const iframeEl = overlay.querySelector('#__floatIframe');
  const titleEl = overlay.querySelector('#__iframeTitle');
  const closeBtn = overlay.querySelector('#__iframeCloseBtn');

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
    const isOpen = dropdown.classList.contains('open');
    if (isOpen) closeDropdown();
    else openDropdown();
  }

  function openDropdown() {
    dropdown.classList.add('open');
    btn.classList.add('active');
    btn.setAttribute('aria-label', 'Tutup menu');
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    btn.classList.remove('active');
    btn.setAttribute('aria-label', 'Buka menu');
  }

  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(); });
  closeBtn.addEventListener('click', closeOverlay);

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (overlay.classList.contains('open')) closeOverlay();
      else closeDropdown();
    }
  });
})();
