// Thin wrapper over the global tracker loaded from /track.js.
// Safe no-op if the script hasn't loaded (e.g. blocked).
type Props = Record<string, unknown>;

export function track(event: string, props?: Props): void {
  try {
    (window as unknown as { rmTrack?: (e: string, p?: Props) => void }).rmTrack?.(event, props || {});
  } catch {
    /* analytics must never break the app */
  }
}
