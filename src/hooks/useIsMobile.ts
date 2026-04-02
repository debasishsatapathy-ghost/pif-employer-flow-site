'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true when viewport width ≤ 1024px.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setDevice(w <= 767 ? 'mobile' : w <= 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return device;
}
