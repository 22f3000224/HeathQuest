import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * ChronicleChapterModal
 * Full-screen parchment-style reading modal.
 * Displays the AI-generated chapter narrative with decorative styling.
 */
export default function ChronicleChapterModal({ chapter, text, foxLine, onClose }) {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const paragraphs = text
    ? text.split('\n').filter((p) => p.trim())
    : [];

  return (
    <motion.div
      ref={overlayRef}
      className="modal-backdrop"
      onClick={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="modal-parchment"
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ '--modal-color': chapter.color, '--modal-glow': chapter.glowColor }}
      >
        {/* Decorative corner runes */}
        <div className="modal-corner modal-corner-tl">✦</div>
        <div className="modal-corner modal-corner-tr">✦</div>
        <div className="modal-corner modal-corner-bl">✦</div>
        <div className="modal-corner modal-corner-br">✦</div>

        {/* Book emblem header */}
        <div className="modal-header">
          <motion.div
            className="modal-emblem"
            animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{ color: chapter.color }}
          >
            {chapter.emblem}
          </motion.div>
          <div className="modal-week-label">Week {chapter.week}</div>
          <h2 className="modal-title" style={{ color: chapter.color }}>
            {chapter.title}
          </h2>
          <div className="modal-divider" style={{ background: chapter.color }} />
        </div>

        {/* Chapter text */}
        <div className="modal-body">
          {paragraphs.length > 0 ? (
            paragraphs.map((para, idx) => (
              <motion.p
                key={idx}
                className="modal-paragraph"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
              >
                {para}
              </motion.p>
            ))
          ) : (
            <p className="modal-paragraph modal-placeholder">
              The pages shimmer… the chronicle is being written.
            </p>
          )}
        </div>

        {/* Fox quote */}
        {foxLine && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${chapter.color}44`,
              borderRadius: 12,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ fontSize: 22, flexShrink: 0 }}
            >
              🦊
            </motion.span>
            <p style={{
              margin: 0,
              fontSize: '0.82rem',
              color: `${chapter.color}dd`,
              fontStyle: 'italic',
              fontFamily: "Georgia, 'Palatino Linotype', serif",
              lineHeight: 1.5,
            }}>
              ✦ "{foxLine}" ✦
            </p>
          </motion.div>
        )}

        {/* Close button */}
        <div className="modal-footer">
          <motion.button
            className="modal-close-btn"
            style={{ '--btn-color': chapter.color, '--btn-glow': chapter.glowColor }}
            onClick={onClose}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Close the Book
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
