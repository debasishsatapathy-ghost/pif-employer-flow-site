'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const glassBtnStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 100,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  outline: 'none',
  flexShrink: 0,
  transition: 'box-shadow 0.2s ease, background 0.2s ease',
};

function ChatAIIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.291 20.824L2 22l1.176-5.291A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10a9.956 9.956 0 0 1-4.709-1.176zm.583-2.138.266.148A7.967 7.967 0 0 0 12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8c0 1.541.399 2.995 1.172 4.145l.148.266-.697 3.139 3.14-.697zM13 11h3l-4 5v-3H9l4-5v3z" />
    </svg>
  );
}

function PersonAIIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z" />
      <path d="M19.5 8.5l.5-1.5 1.5-.5-1.5-.5-.5-1.5-.5 1.5-1.5.5 1.5.5.5 1.5z" fillOpacity="0.9" />
    </svg>
  );
}

const expandEasing = [0.34, 1.56, 0.64, 1] as const;

function handleBtnMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  btn.style.boxShadow =
    '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.18)';
  btn.style.background = 'rgba(255,255,255,0.09)';
}

function handleBtnMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  btn.style.boxShadow =
    '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)';
  btn.style.background = 'rgba(255,255,255,0.05)';
}

interface AvatarFABProps {
  onPersonClick?: () => void;
  hidden?: boolean;
}

export function AvatarFAB({ onPersonClick, hidden }: AvatarFABProps) {
  const [hovered, setHovered] = useState(false);
  if (hidden) return null;

  return (
    <div
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}
      className="flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence mode="sync">
        {hovered ? (
          <motion.div
            key="expanded"
            className="flex flex-col items-center"
            style={{ gap: 8 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Chat AI button — top */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.75 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.75 }}
              transition={{ duration: 0.22, ease: expandEasing, delay: 0.06 }}
              style={glassBtnStyle}
              aria-label="AI Chat"
              onMouseEnter={handleBtnMouseEnter}
              onMouseLeave={handleBtnMouseLeave}
            >
              <ChatAIIcon />
            </motion.button>

            {/* Person Search / Avatar button — bottom */}
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.75 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.75 }}
              transition={{ duration: 0.22, ease: expandEasing, delay: 0 }}
              style={glassBtnStyle}
              aria-label="AI Avatar"
              onClick={onPersonClick}
              onMouseEnter={handleBtnMouseEnter}
              onMouseLeave={handleBtnMouseLeave}
            >
              <PersonAIIcon />
            </motion.button>
          </motion.div>
        ) : (
          /* Default sparkles button */
          <motion.button
            key="default"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={glassBtnStyle}
            aria-label="AI Assistant"
          >
            <Sparkles
              size={24}
              style={{ transform: 'rotate(-90deg)', color: 'white' }}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
