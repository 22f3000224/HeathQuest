import React, { useEffect, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

// Thematic lines the fox says — rotated on each state change
const FOX_LINES = {
  idle: [
    "The books breathe with your stories…",
    "Each page holds a memory of your journey.",
    "I've been reading while you were away.",
    "The sanctuary speaks through these words.",
  ],
  alert: [
    "Oh! A new chapter awaits…",
    "I sense something important in these pages.",
    "This week holds great secrets.",
    "Listen — the books are whispering.",
  ],
  excited: [
    "A new chapter! Read it with me!",
    "The story grows more beautiful each week!",
    "Your progress shines from every page!",
    "This is the chapter the forest waited for!",
  ],
};

/**
 * ChronicleFox
 * Renders the fox companion near the bookshelf.
 * foxState: 'idle' | 'alert' | 'excited'
 */
export default function ChronicleFox({ foxState }) {
  const bodyControls = useAnimation();
  const glowControls = useAnimation();
  const [blinkVisible, setBlinkVisible] = useState(false);
  const [speechLine, setSpeechLine] = useState(FOX_LINES.idle[0]);
  const [showSpeech, setShowSpeech] = useState(true);

  // Idle blink every ~4 s
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkVisible(true);
      setTimeout(() => setBlinkVisible(false), 140);
    }, 3800 + Math.random() * 1200);
    return () => clearInterval(interval);
  }, []);

  // Rotate idle speech line every 8 s
  useEffect(() => {
    const interval = setInterval(() => {
      if (foxState === 'idle') {
        const lines = FOX_LINES.idle;
        setSpeechLine(prev => {
          const idx = lines.indexOf(prev);
          return lines[(idx + 1) % lines.length];
        });
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [foxState]);

  // React to foxState changes
  useEffect(() => {
    const lines = FOX_LINES[foxState] || FOX_LINES.idle;
    const newLine = lines[Math.floor(Math.random() * lines.length)];
    setShowSpeech(false);
    setTimeout(() => {
      setSpeechLine(newLine);
      setShowSpeech(true);
    }, 200);

    if (foxState === 'alert') {
      bodyControls.start({
        rotate: [0, -4, 3, -2, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      });
    } else if (foxState === 'excited') {
      bodyControls.start({
        y: [0, -14, 0, -8, 0],
        rotate: [0, 2, -2, 1, 0],
        transition: { duration: 0.8, ease: 'easeOut' },
      });
      glowControls.start({
        opacity: [0, 0.8, 0],
        scale: [0.8, 1.4, 1],
        transition: { duration: 1.2, ease: 'easeOut' },
      });
    } else {
      bodyControls.start({ rotate: 0, y: 0 });
    }
  }, [foxState, bodyControls, glowControls]);

  return (
    <div className="fox-container">
      {/* Excited glow ring */}
      <motion.div className="fox-glow-ring" animate={glowControls} initial={{ opacity: 0 }} />

      {/* Speech bubble */}
      <AnimatePresence>
        {showSpeech && (
          <motion.div
            key={speechLine}
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              background: 'rgba(4, 8, 18, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 14,
              padding: '8px 14px',
              width: 'clamp(160px, 22vw, 240px)',
              textAlign: 'center',
              zIndex: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          >
            {/* Tail */}
            <div style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid rgba(4, 8, 18, 0.85)',
            }} />
            <p style={{
              margin: 0,
              fontSize: 'clamp(10px, 1.2vw, 12px)',
              color: 'rgba(238,228,210,0.9)',
              fontStyle: 'italic',
              fontFamily: "Georgia, 'Palatino Linotype', serif",
              lineHeight: 1.5,
            }}>
              "{speechLine}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fox body */}
      <motion.div
        className="fox-body"
        animate={bodyControls}
        style={{ display: 'inline-block' }}
      >
        <motion.img
          src="/assets/Characters/Fox/fox_back.webp"
          alt="Fox companion"
          className="fox-img"
          animate={
            foxState === 'idle'
              ? { y: [0, -4, 0] }
              : undefined
          }
          transition={
            foxState === 'idle'
              ? { y: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' } }
              : {}
          }
          draggable={false}
        />

        {/* Blink overlay */}
        {blinkVisible && (
          <div className="fox-blink-overlay" />
        )}
      </motion.div>

      {/* Tail-flick: purely CSS animation */}
      <div className="fox-tail-hint" />
    </div>
  );
}
