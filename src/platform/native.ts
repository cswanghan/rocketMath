import { useEffect, useRef } from 'react';

export interface NativeBridge {
  platform: 'android';
  registerBack(handler: () => boolean, priority: number): () => void;
}
declare global { interface Window { XingyaNative?: NativeBridge } }

export const isAndroidApp = () => typeof window !== 'undefined' && window.XingyaNative?.platform === 'android';

// Explicit priorities avoid React child/parent effect ordering changing Back behavior.
export function useNativeBack(handler: () => boolean, priority = 0) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => window.XingyaNative?.registerBack(() => latest.current(), priority), [priority]);
}
