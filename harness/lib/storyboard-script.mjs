// The in-page script of the storyboard: pan, zoom, fit, lightbox and sticky notes. Plain JS as one string; it uses no template literals.
export const storyboardScript = String.raw`
(function () {
  var vp = document.getElementById('viewport');
  var world = document.getElementById('world');
  var pct = document.getElementById('pct');
  var film = world.getAttribute('data-film');
  var view = { x: 0, y: 0, k: 1 };
  var MIN = 0.08, MAX = 4;

  function apply() {
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    vp.style.backgroundSize = 32 * view.k + 'px ' + 32 * view.k + 'px';
    vp.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
    pct.textContent = Math.round(view.k * 100) + '%';
  }
  function zoomAt(cx, cy, factor) {
    var k = Math.min(MAX, Math.max(MIN, view.k * factor));
    var f = k / view.k;
    view.x = cx - (cx - view.x) * f;
    view.y = cy - (cy - view.y) * f;
    view.k = k;
    apply();
  }
  function fit() {
    var w = world.offsetWidth, h = world.offsetHeight;
    var k = Math.min(innerWidth / w, (innerHeight - 70) / h, 1.5);
    view.k = k;
    view.x = (innerWidth - w * k) / 2;
    view.y = Math.max(16, (innerHeight - 70 - h * k) / 2);
    apply();
  }
  function actual() {
    view.k = 1; view.x = (innerWidth - world.offsetWidth) / 2; view.y = 0;
    if (view.x < 0) view.x = 0;
    apply();
  }
  function center() { return [innerWidth / 2, innerHeight / 2]; }

  var hint = document.querySelector('.hint');
  function quiet() { if (hint) { hint.remove(); hint = null; } }
  vp.addEventListener('wheel', function (e) {
    e.preventDefault(); quiet();
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
  }, { passive: false });

  var pointers = {}, drag = null, moved = 0, pinch = null;
  vp.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.sticky')) return;
    quiet();
    pointers[e.pointerId] = [e.clientX, e.clientY];
    vp.setPointerCapture(e.pointerId);
    moved = 0;
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      drag = null;
    } else { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; }
  });
  vp.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = [e.clientX, e.clientY];
    var ids = Object.keys(pointers);
    if (ids.length === 2 && pinch) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d);
      pinch.d = d; moved = 99;
    } else if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (moved > 4) vp.classList.add('panning');
      view.x = drag.vx + dx; view.y = drag.vy + dy; apply();
    }
  });
  function release(e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) pinch = null;
    if (!Object.keys(pointers).length) { drag = null; vp.classList.remove('panning'); }
  }
  vp.addEventListener('pointerup', release);
  vp.addEventListener('pointercancel', release);

  var box = document.getElementById('lightbox');
  var boxImg = box.querySelector('img');
  vp.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-full]');
    if (!a) return;
    e.preventDefault();
    if (moved > 4) return;
    boxImg.src = a.getAttribute('href');
    box.classList.add('on');
  });
  box.addEventListener('click', function () { box.classList.remove('on'); });

  var notes = [];
  var KEY = 'vawe-storyboard:' + film;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {} }
  function load() { try { notes = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { notes = []; } }
  function draw(n) {
    var el = document.createElement('div');
    el.className = 'sticky';
    el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    el.innerHTML = '<div class="grip"><button title="delete">&times;</button></div><div class="text" contenteditable="true" spellcheck="false"></div>';
    var text = el.querySelector('.text');
    text.textContent = n.text;
    text.addEventListener('input', function () { n.text = text.textContent; save(); });
    text.addEventListener('keydown', function (e) { e.stopPropagation(); });
    el.querySelector('button').addEventListener('click', function () {
      notes = notes.filter(function (m) { return m !== n; });
      el.remove(); save();
    });
    var grip = el.querySelector('.grip'), d = null;
    grip.addEventListener('pointerdown', function (e) {
      d = { x: e.clientX, y: e.clientY, nx: n.x, ny: n.y };
      grip.setPointerCapture(e.pointerId); e.stopPropagation();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!d) return;
      n.x = d.nx + (e.clientX - d.x) / view.k; n.y = d.ny + (e.clientY - d.y) / view.k;
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    });
    grip.addEventListener('pointerup', function () { if (d) save(); d = null; });
    document.getElementById('notes').appendChild(el);
    return el;
  }
  function addNote(cx, cy) {
    var n = { x: Math.round((cx - view.x) / view.k), y: Math.round((cy - view.y) / view.k), text: '' };
    notes.push(n);
    var el = draw(n);
    el.querySelector('.text').focus();
    save();
  }
  load();
  notes.forEach(draw);
  vp.addEventListener('dblclick', function (e) {
    if (e.target.closest('a, .sticky, .body, .strip, .pill')) return;
    addNote(e.clientX, e.clientY);
  });

  function step(f) { var c = center(); zoomAt(c[0], c[1], f); }
  document.getElementById('in').onclick = function () { step(1.25); };
  document.getElementById('out').onclick = function () { step(0.8); };
  document.getElementById('fit').onclick = fit;
  document.getElementById('one').onclick = actual;
  document.getElementById('add').onclick = function () { var c = center(); addNote(c[0] - 105, c[1] - 60); };
  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') box.classList.remove('on');
    else if (e.key === '+' || e.key === '=') step(1.25);
    else if (e.key === '-' || e.key === '_') step(0.8);
    else if (e.key === '0') actual();
    else if (e.key === 'f' || e.key === 'F') fit();
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); var c = center(); addNote(c[0] - 105, c[1] - 60); }
  });
  addEventListener('resize', function () { apply(); });

  fit();
  window.__board = { view: view, apply: apply };
})();
`;
