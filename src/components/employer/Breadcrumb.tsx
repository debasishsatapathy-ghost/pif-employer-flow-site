'use client';

import { Fragment } from 'react';

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-base">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span className="text-white/40 select-none">/</span>
            )}
            {isLast ? (
              <span className="text-white">{seg.label}</span>
            ) : (
              <button
                type="button"
                onClick={seg.onClick}
                className="text-white/40 hover:text-white transition-colors"
              >
                {seg.label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
