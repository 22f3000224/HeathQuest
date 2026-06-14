import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSanctuaryStore } from '../store/useSanctuaryStore';
import ChronicleParticles from './ChronicleParticles';
import './ChronicleScreen.css';

// ─── Milestone-driven Chapter metadata ────────────────────────────────────────
export const MILESTONE_CHAPTERS = {
  "artifact_unlock": {
    color: '#c8a84b',
    glowColor: 'rgba(200, 168, 75, 0.6)',
    emblem: '✨',
    bookAsset: 'objects/GoldBook.webp'
  },
  "streak_milestone": {
    color: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.6)',
    emblem: '🔥',
    bookAsset: 'objects/GreenBook.webp'
  },
  "sanctuary_growth": {
    color: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.6)',
    emblem: '🏛️',
    bookAsset: 'objects/BlueBook.webp'
  },
  "storybook_milestone": {
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.6)',
    emblem: '📖',
    bookAsset: 'objects/PurpleBook.webp'
  },
  "legendary_achievement": {
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    emblem: '👑',
    bookAsset: 'objects/GoldBook.webp'
  },
  "journey_entry": {
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    emblem: '🌿',
    bookAsset: 'objects/GreenBook.webp'
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChronicleScreen() {
  const navigate = useNavigate();
  const { logs } = useSanctuaryStore();

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [foxState, setFoxState] = useState('idle');
  const [chronicleEntries, setChronicleEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floatingBookId, setFloatingBookId] = useState(null);
  const audioRef = useRef(null);

  const userId = 1; // TODO: Get from auth context

  // Load chronicle entries from API
  useEffect(() => {
    const loadChronicleEntries = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/progression/${userId}/chronicles`);
        if (response.ok) {
          const data = await response.json();
          setChronicleEntries(data.entries || []);
          if (data.entries.length > 0) {
            setSelectedEntry(data.entries[0]);
          }
        } else {
          console.warn("Failed to load chronicle entries");
          setChronicleEntries([]);
        }
      } catch (error) {
        console.error("Error loading chronicle entries:", error);
        setChronicleEntries([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadChronicleEntries();
  }, [userId]);

  // Play ambient sound on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.15;
      audioRef.current.play().catch(() => {});
    }
    return () => audioRef.current?.pause();
  }, []);

  const handleSelectEntry = useCallback(
    (entry) => {
      setSelectedEntry(entry);
      setFloatingBookId(entry.id);
      setFoxState('alert');
      setTimeout(() => setFoxState('idle'), 2000);
    },
    []
  );

  const handleReadEntry = useCallback(() => {
    if (!selectedEntry) return;
    
    setFoxState('excited');
    setTimeout(() => setFoxState('idle'), 1000);
    
    navigate('/storybook', {
      state: { 
        chronicleEntry: selectedEntry
      }
    });
  }, [selectedEntry, navigate]);

  // Get chapter style based on entry type
  const getEntryStyle = (entryType) => {
    return MILESTONE_CHAPTERS[entryType] || MILESTONE_CHAPTERS["journey_entry"];
  };

  // Group entries by type for better organization
  const groupedEntries = chronicleEntries.reduce((groups, entry) => {
    const type = entry.type || "journey_entry";
    if (!groups[type]) groups[type] = [];
    groups[type].push(entry);
    return groups;
  }, {});

  const selectedEntryStyle = selectedEntry ? getEntryStyle(selectedEntry.type) : null;

  return (
    <div className="chronicle-screen">
      {/* ── Background ── */}
      <div
        className="chronicle-bg"
        style={{ backgroundImage: 'url(/assets/ChronicleHallBG.webp)' }}
      />

      {/* ── Mist overlay ── */}
      <div className="chronicle-mist" />

      {/* ── Firefly particles ── */}
      <ChronicleParticles />

      {/* ── Title ── */}
      <motion.h1
        className="chronicle-title"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        Chronicle Hall
      </motion.h1>

      {/* ── Fox Companion ── */}
      <div
        style={{
          position: 'absolute',
          left: -50,
          top: 371,
          width: 467,
          height: 401,
          zIndex: 15
        }}
      >
        <img
          src="/assets/Characters/Fox/fox_back.webp"
          alt="Fox companion"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.7))",
            userSelect: "none"
          }}
          draggable={false}
        />
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          background: 'rgba(4, 8, 18, 0.85)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12,
          padding: '6px 12px',
          whiteSpace: 'nowrap',
          fontSize: '11px',
          color: 'rgba(238,228,210,0.9)',
          fontStyle: 'italic',
          pointerEvents: 'none',
          zIndex: 20
        }}>
          "Your milestones write themselves in golden ink…"
        </div>
      </div>

      {/* ── Chronicle Books (show first 4 entries as books) ── */}
      {!loading && chronicleEntries.slice(0, 4).map((entry, index) => {
        const positions = [
          { x: 257, y: 177 },
          { x: 371, y: 176 },
          { x: 489, y: 177 },
          { x: 605, y: 175 }
        ];
        const pos = positions[index];
        const entryStyle = getEntryStyle(entry.type);
        
        return (
          <div
            key={entry.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: 168,
              height: 161,
              zIndex: 10
            }}
          >
            <motion.img
              src={`/assets/${entryStyle.bookAsset}`}
              alt={entry.title}
              className="book-img"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: selectedEntry?.id === entry.id 
                  ? `drop-shadow(0 0 20px ${entryStyle.glowColor})` 
                  : 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                cursor: 'pointer'
              }}
              onClick={() => handleSelectEntry(entry)}
              animate={
                floatingBookId === entry.id
                  ? {
                      y: [-4, -18, -14],
                      rotate: [-2, 3, -1],
                      scale: [1, 1.12, 1.08],
                    }
                  : selectedEntry?.id === entry.id
                  ? { y: [0, -5, 0], scale: 1.06 }
                  : { y: 0, scale: 1 }
              }
            />
          </div>
        );
      })}

      {/* ── Main layout ── */}
      <div className="chronicle-layout">
        {/* Left: Empty (elements now positioned absolutely) */}
        <div className="chronicle-left">
          {/* Assets now positioned absolutely */}
        </div>

        {/* Right: Entry list + detail */}
        <motion.div
          className="chronicle-sidebar"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {loading ? (
            <div className="chronicle-loading">
              <div>Loading your journey...</div>
            </div>
          ) : chronicleEntries.length === 0 ? (
            <div className="chronicle-empty">
              <p>No chronicle entries yet.</p>
              <p>Begin your journey to unlock milestones!</p>
            </div>
          ) : (
            <ul className="chapter-list">
              {chronicleEntries.map((entry) => {
                const active = selectedEntry?.id === entry.id;
                const entryStyle = getEntryStyle(entry.type);
                return (
                  <li
                    key={entry.id}
                    className={`chapter-item ${active ? 'active' : ''}`}
                    onClick={() => handleSelectEntry(entry)}
                    style={active ? { '--chapter-color': entryStyle.color } : {}}
                  >
                    <span className="chapter-emblem">
                      {entryStyle.emblem}
                    </span>
                    <div className="chapter-meta">
                      <span className="chapter-week">
                        {entry.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Journey'}
                      </span>
                      <span className="chapter-name">{entry.title}</span>
                    </div>
                    {active && (
                      <motion.div
                        className="chapter-active-bar"
                        layoutId="activeBar"
                        style={{ background: entryStyle.color }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Selected entry detail */}
          <AnimatePresence mode="wait">
            {selectedEntry && selectedEntryStyle && (
              <motion.div
                key={selectedEntry.id}
                className="chapter-detail"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <h2
                  className="detail-title"
                  style={{ color: selectedEntryStyle.color }}
                >
                  {selectedEntry.title}
                </h2>
                <p className="detail-subtitle">
                  {selectedEntry.chapter_title || 'Milestone Achievement'}
                </p>

                <div className="chronicle-content">
                  <p style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "0.9rem",
                    color: "#c8bfa8",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    margin: "1rem 0"
                  }}>
                    {selectedEntry.description || selectedEntry.content}
                  </p>
                  
                  {selectedEntry.date && (
                    <div style={{
                      fontSize: "0.75rem",
                      color: "#8a7a5a",
                      letterSpacing: "0.1em",
                      textAlign: "center",
                      marginTop: "0.5rem"
                    }}>
                      {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>

                <motion.button
                  className="read-chapter-btn"
                  style={{
                    '--btn-color': selectedEntryStyle.color,
                    '--btn-glow': selectedEntryStyle.glowColor,
                  }}
                  onClick={handleReadEntry}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  View Details
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Back navigation ── */}
      <motion.button
        className="chronicle-back-btn"
        onClick={() => navigate('/sanctuaryworld')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← Return to Sanctuary
      </motion.button>
    </div>
  );
}