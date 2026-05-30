/** Logical iOS frame size (content coordinates stay 390×810). */
export const FRAME_W = 390;
export const FRAME_H = 810;
/** Content below iOS status bar + dynamic island. */
export const CONTENT_TOP = 54;
/** SAM bottom tab bar height. */
export const CONTENT_BOTTOM_NAV = 82;

/**
 * Uniform scale to fit viewport — no stretch. Phones use full bleed (pad 0).
 */
export function computeFrameScale() {
  const vv = window.visualViewport;
  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;
  const mobile = w <= 520;
  const padX = mobile ? 0 : 20;
  const padY = mobile ? 0 : 20;
  const sx = (w - padX * 2) / FRAME_W;
  const sy = (h - padY * 2) / FRAME_H;
  const s = Math.min(sx, sy);
  if (mobile) return s;
  return Math.min(s, 1.12);
}
