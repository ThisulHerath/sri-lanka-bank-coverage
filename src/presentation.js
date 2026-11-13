// Presentation changes layout and browser fullscreen state; filtering state stays in app.js.
export function setupMapPresentation({ map, describeSelection, fitSelection }) {
  const button = document.querySelector('#present-map');
  const exitButton = document.querySelector('#exit-presentation');
  const toolbar = document.querySelector('#presentation-toolbar');
  let active = false;
  let previousFocus = null;
  let previousScroll = { x: 0, y: 0 };

  function captureView() {
    const center = map.getCenter();
    return { center: [center.lat, center.lng], zoom: map.getZoom() };
  }
  function resizeMap(view) {
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false, pan: false });
      map.setView(view.center, view.zoom, { animate: false });
    });
  }
  function refresh() {
    const summary = describeSelection();
    document.querySelector('#presentation-selection').textContent = summary.selection;
    document.querySelector('#presentation-counts').textContent = summary.counts;
  }
  async function start() {
    if (active) return;
    const view = captureView();
    previousFocus = document.activeElement;
    previousScroll = { x: window.scrollX, y: window.scrollY };
    active = true;
    refresh();
    document.body.classList.add('map-presentation');
    button.setAttribute('aria-pressed', 'true');
    toolbar.setAttribute('aria-hidden', 'false');
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Embedded previews can deny the native API; the viewport presentation still works.
    }
    if (!active) return;
    resizeMap(view);
    exitButton.focus({ preventScroll: true });
  }
  async function stop({ nativeAlreadyExited = false } = {}) {
    if (!active) return;
    const view = captureView();
    active = false;
    document.body.classList.remove('map-presentation');
    button.setAttribute('aria-pressed', 'false');
    toolbar.setAttribute('aria-hidden', 'true');
    if (!nativeAlreadyExited && document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* Layout has already returned. */ }
    }
    resizeMap(view);
    window.scrollTo({ left: previousScroll.x, top: previousScroll.y, behavior: 'instant' });
    (previousFocus?.isConnected ? previousFocus : button).focus({ preventScroll: true });
  }

  button.addEventListener('click', start);
  exitButton.addEventListener('click', () => stop());
  document.querySelector('#fit-presentation').addEventListener('click', fitSelection);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && active) stop({ nativeAlreadyExited: true });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      stop();
    }
  });
  return { refresh };
}
