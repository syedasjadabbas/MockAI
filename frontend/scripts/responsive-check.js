/*
 * MockAI responsive regression check (no dependencies).
 *
 * Loads every route in off-screen iframes at each viewport width and reports
 * pages that scroll sideways (page overflow) or whose text/controls are cut
 * off by an overflow:hidden container. Wide tables inside their own
 * horizontal-scroll box are allowed.
 *
 * How to run:
 *   1. npm run dev, open http://localhost:5173, sign in as a candidate AND as
 *      an admin in the same browser (both tokens live in localStorage).
 *   2. Set INTERVIEW_ID below to one of your completed interviews.
 *   3. Paste this whole file into the DevTools console. Results print as a
 *      table; "ISSUE" rows name the offending element.
 *
 * Iframes show a classic scrollbar (~7px), so this is slightly stricter than
 * a phone. Sign-in pages are not included (they redirect when signed in).
 */
(async () => {
  const INTERVIEW_ID = 'REPLACE_WITH_A_COMPLETED_INTERVIEW_ID';
  const ROUTES = [
    '/', '/dashboard', '/mentors', '/interview/goal', '/history', '/progress', '/profile',
    `/interview/${INTERVIEW_ID}/complete`, `/interview/${INTERVIEW_ID}/results`, `/interview/${INTERVIEW_ID}/feedback`,
    '/admin/dashboard', '/admin/users', '/admin/interviews', '/admin/questions', '/admin/results', '/admin/logs', '/admin/admins',
  ];
  const SIZES = [
    [320, 568], [360, 640], [375, 667], [390, 844], [430, 932], [568, 320], [600, 960],
    [768, 1024], [844, 390], [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
  ];

  // Runs inside each iframe.
  function check() {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const clipper = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o !== 'visible') {
          const r = p.getBoundingClientRect();
          if (r.right <= vw + 1 && r.left >= -1) return o;
        }
      }
      return null;
    };
    const decorative = (el) => {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') return true;
        const cs = getComputedStyle(p);
        if (cs.pointerEvents === 'none' && (cs.position === 'absolute' || cs.position === 'fixed')) return true;
      }
      return el.tagName === 'CANVAS' || el.tagName === 'IMG';
    };
    const off = [];
    const cut = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.right > vw + 1 || r.left < -1) {
        const c = clipper(el);
        if (!c) off.push(el);
        else if ((c === 'hidden' || c === 'clip') && !decorative(el) && (el.innerText || '').trim()) cut.push(el);
      }
    }
    const outer = (a) => a.filter((e) => !a.some((o) => o !== e && o.contains(e)));
    const inner = (a) => a.filter((e) => !a.some((o) => o !== e && e.contains(o)));
    const desc = (e) => {
      const r = e.getBoundingClientRect();
      const cls = typeof e.className === 'string' ? e.className.split(' ').slice(0, 4).join('.') : '';
      return `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''} R=${Math.round(r.right)} "${(e.innerText || '').slice(0, 24).replace(/\s+/g, ' ')}"`;
    };
    return { overflow: sw - vw, cut: inner(cut).length, detail: [...outer(off), ...inner(cut)].slice(0, 3).map(desc).join(' | ') };
  }

  const rows = [];
  for (const [W, H] of SIZES) {
    const frames = ROUTES.map((route) => {
      const f = document.createElement('iframe');
      f.style.cssText = `position:fixed;left:-12000px;top:0;width:${W}px;height:${H}px;border:0`;
      f.src = route;
      document.body.appendChild(f);
      return [route, f];
    });
    await new Promise((r) => setTimeout(r, 7000));
    for (const [route, f] of frames) {
      try {
        const r = f.contentWindow.eval(`(${check.toString()})()`);
        rows.push({ size: `${W}x${H}`, route, status: r.overflow > 0 || r.cut > 0 ? 'ISSUE' : 'ok', overflow: r.overflow, cutOff: r.cut, detail: r.detail });
      } catch (e) {
        rows.push({ size: `${W}x${H}`, route, status: 'ERROR', detail: e.message });
      }
      f.remove();
    }
    console.log(`checked ${W}x${H}`);
  }
  console.table(rows.filter((r) => r.status !== 'ok'));
  console.log(`${rows.filter((r) => r.status === 'ok').length}/${rows.length} route-size checks passed`);
})();
