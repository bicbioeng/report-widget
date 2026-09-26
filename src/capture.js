/**
 * Screenshots for a report.
 *
 * Two methods, used in this order:
 *   quick   — @zumer/snapdom renders the DOM to an image with no permission
 *             prompt. Instant, and correct for Tailwind v4 colours because the
 *             browser paints the CSS itself. Canvases and iframes come out
 *             blank, which is fine for a first look.
 *   exact   — getDisplayMedia with preferCurrentTab captures the real pixels
 *             (Sentry's approach). One permission picker; desktop only.
 *
 * Both resolve { blob, width, height, method }. The widget hides itself before
 * calling either so it is not in the picture.
 */

const WIDGET_SELECTORS = ['.kids-feedback-root', '.kids-feedback-modal-wrap', '.kids-feedback-pill'];

export function supportsExactCapture() {
  return Boolean(navigator.mediaDevices?.getDisplayMedia) && window.isSecureContext;
}

export async function captureQuick({ scale } = {}) {
  const { snapdom } = await import('@zumer/snapdom');
  const dpr = window.devicePixelRatio || 1;
  const result = await snapdom(document.body, {
    scale: scale || Math.min(dpr, 2),
    exclude: WIDGET_SELECTORS,
    excludeMode: 'hide',
    backgroundColor: '#ffffff',
    embedFonts: true,
    fast: true,
  });
  const blob = await result.toBlob({ type: 'png' });
  const { width, height } = await imageSize(blob);
  return { blob, width, height, method: 'quick' };
}

/** Real pixels of the current tab. Throws NotAllowedError when the user cancels. */
export async function captureExact() {
  if (!supportsExactCapture()) throw new Error('Exact capture is not supported in this browser.');
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
  });
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not read the captured frame.'));
      setTimeout(() => reject(new Error('Timed out waiting for the capture.')), 8000);
    });
    await video.play();
    // Let the picker overlay fade before the frame is taken.
    await nextFrames(3);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return { blob, width: canvas.width, height: canvas.height, method: 'exact' };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

function nextFrames(n) {
  return new Promise((resolve) => {
    const step = (k) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
    step(n);
  });
}

export function imageSize(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export function blobToFile(blob, name, type) {
  return new File([blob], name, { type: type || blob.type || 'application/octet-stream' });
}
