import React from 'react';

/**
 * Minimal SlideLayout for the starter template.
 * In the Small Lift, SlideLayout renders a full cinematic frame (header, badge, footer).
 * Here, SceneManager handles the outer frame, so SlideLayout is a passthrough
 * that just renders children in a flex container filling the available space.
 */
interface SlideLayoutProps {
  children: React.ReactNode;
  badge?: string;
  footerLeft?: string;
  footerRight?: string;
  onLogoClick?: () => void;
  className?: string;
  background?: string;
  gradient?: string;
  whiteLogo?: boolean;
  whiteFooter?: boolean;
}

export const SlideLayout: React.FC<SlideLayoutProps> = ({ children }) => (
  <div className="flex flex-col h-full w-full min-h-0">{children}</div>
);

export default SlideLayout;
