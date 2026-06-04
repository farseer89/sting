import { Injectable, signal } from '@angular/core';

const OPEN_KEY = 'protopipe.home.sidePanelOpen';
const WIDTH_KEY = 'protopipe.home.sidePanelWidthPct';
const WIDTH_DEFAULT = 32;
const WIDTH_MIN = 22;
const WIDTH_MAX = 48;
const RAIL_WIDTH_PX = 32;

@Injectable()
export class ProtopipeHomeSidePanelService {
  readonly open = signal(this.readOpen());
  readonly widthPct = signal(this.readWidth());

  private dragMoveListener: ((e: PointerEvent) => void) | null = null;
  private dragUpListener: ((e: PointerEvent) => void) | null = null;

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      /* localStorage unavailable */
    }
  }

  startResize(event: PointerEvent, host: HTMLElement): void {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);

    const move = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const fromRightPx = rect.right - e.clientX - RAIL_WIDTH_PX;
      const pct = clamp(
        (fromRightPx / Math.max(rect.width - RAIL_WIDTH_PX, 1)) * 100,
        WIDTH_MIN,
        WIDTH_MAX,
      );
      this.widthPct.set(Math.round(pct));
    };

    const up = () => {
      if (this.dragMoveListener) {
        window.removeEventListener('pointermove', this.dragMoveListener);
      }
      if (this.dragUpListener) {
        window.removeEventListener('pointerup', this.dragUpListener);
      }
      this.dragMoveListener = null;
      this.dragUpListener = null;
      try {
        localStorage.setItem(WIDTH_KEY, String(this.widthPct()));
      } catch {
        /* localStorage unavailable */
      }
    };

    this.dragMoveListener = move;
    this.dragUpListener = up;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  detachResizeListeners(): void {
    if (this.dragMoveListener) {
      window.removeEventListener('pointermove', this.dragMoveListener);
    }
    if (this.dragUpListener) {
      window.removeEventListener('pointerup', this.dragUpListener);
    }
    this.dragMoveListener = null;
    this.dragUpListener = null;
  }

  private readOpen(): boolean {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw === null) return true;
      return raw === '1';
    } catch {
      return true;
    }
  }

  private readWidth(): number {
    try {
      const raw = localStorage.getItem(WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) {
        return clamp(parsed, WIDTH_MIN, WIDTH_MAX);
      }
    } catch {
      /* ignore */
    }
    return WIDTH_DEFAULT;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
