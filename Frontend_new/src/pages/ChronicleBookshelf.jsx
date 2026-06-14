import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ChronicleBookshelf
 * Renders a decorative bookshelf with glowing magical book assets.
 * Books appear on the middle shelf; locked weeks are dimmed.
 * Selecting a book triggers a floating + sparkle animation.
 */
export default function ChronicleBookshelf({
  chapters,
  unlockedWeeks,
  selectedWeek,
  floatingBookWeek,
  onSelectBook,
}) {
  return (
    <div className="bookshelf-container">
      {/* Shelf rows — only the "display" shelf shows magical books */}
      <div className="shelf-books">
        {chapters.map((ch) => {
          const locked = !unlockedWeeks.includes(ch.week);
          const isSelected = selectedWeek === ch.week;
          const isFloating = floatingBookWeek === ch.week;

          return (
            <div
              key={ch.week}
              className={`book-slot ${locked ? 'book-locked' : ''} ${isSelected ? 'book-selected' : ''}`}
              onClick={() => !locked && onSelectBook(ch.week)}
              title={locked ? 'Not yet unlocked' : ch.title}
            >
              {/* Glow halo behind the book */}
              {isSelected && !locked && (
                <motion.div
                  className="book-glow-halo"
                  style={{ background: ch.glowColor }}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                />
              )}

              {/* Book image */}
              <motion.img
                src={`/assets/${ch.bookAsset}`}
                alt={ch.title}
                className="book-img"
                draggable={false}
                animate={
                  isFloating
                    ? {
                        y: [-4, -18, -14],
                        rotate: [-2, 3, -1],
                        scale: [1, 1.12, 1.08],
                        filter: [
                          'brightness(1)',
                          'brightness(1.6)',
                          'brightness(1.3)',
                        ],
                      }
                    : isSelected
                    ? { y: [0, -5, 0], scale: 1.06 }
                    : { y: 0, scale: 1 }
                }
                transition={
                  isFloating
                    ? { duration: 0.9, ease: 'easeOut' }
                    : isSelected
                    ? { y: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' } }
                    : {}
                }
                style={{
                  filter: locked ? 'brightness(0.3) grayscale(0.8)' : undefined,
                  cursor: locked ? 'not-allowed' : 'pointer',
                }}
              />

              {/* Sparkle burst when floating */}
              <AnimatePresence>
                {isFloating && (
                  <SparklesBurst color={ch.color} />
                )}
              </AnimatePresence>

              {/* Lock icon overlay */}
              {locked && (
                <div className="book-lock-overlay">
                  <span>🔒</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sparkles burst ───────────────────────────────────────────────────────────
function SparklesBurst({ color }) {
  const sparks = Array.from({ length: 10 });
  return (
    <div className="sparkles-burst">
      {sparks.map((_, i) => {
        const angle = (i / sparks.length) * 360;
        const distance = 28 + Math.random() * 18;
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        const size = 4 + Math.random() * 4;

        return (
          <motion.div
            key={i}
            className="spark"
            style={{ background: color, width: size, height: size }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0 }}
            exit={{}}
            transition={{ duration: 0.7 + Math.random() * 0.4, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
