import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const FIREFLY_COUNT = 28;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

/**
 * ChronicleParticles
 * Pure CSS + Framer Motion firefly / sparkle particles.
 * No Three.js / canvas required — keeps bundle lean.
 */
export default function ChronicleParticles() {
  const flies = useMemo(
    () =>
      Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
        id: i,
        x: randomBetween(2, 98), // % of viewport
        y: randomBetween(5, 90),
        size: randomBetween(3, 7),
        duration: randomBetween(4, 10),
        delay: randomBetween(0, 8),
        dx: randomBetween(-60, 60), // drift px
        dy: randomBetween(-40, 40),
        color: pickColor(i),
      })),
    []
  );

  return (
    <div className="particles-layer" aria-hidden="true">
      {flies.map((f) => (
        <motion.div
          key={f.id}
          className="firefly"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.size,
            height: f.size,
            background: f.color,
            boxShadow: `0 0 ${f.size * 2}px ${f.color}`,
          }}
          animate={{
            x: [0, f.dx, 0, -f.dx / 2, 0],
            y: [0, f.dy, f.dy / 2, -f.dy / 3, 0],
            opacity: [0, 0.9, 0.5, 0.8, 0],
            scale: [0.7, 1, 0.8, 1.1, 0.7],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function pickColor(i) {
  const palette = [
    '#86efac', // green
    '#7dd3fc', // blue
    '#d8b4fe', // purple
    '#fde68a', // gold
    '#fbcfe8', // pink
    '#a5f3fc', // cyan
  ];
  return palette[i % palette.length];
}
