import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ApiService } from "../services/api.js";
import { useSanctuaryStore } from "../store/useSanctuaryStore.js";

// Asset paths — swap these for your actual bundled asset imports
const ASSETS = {
  background: new URL(
    "/assets/MuseumBG.webp",
    import.meta.url
  ).href,
  fox: new URL("/assets/screen2/fox.jpg", import.meta.url).href,
};

const ARTIFACTS = [
  {
    id: "leaf_chronicle",
    label: "Leaf Chronicle",
    category: "Knowledge",
    color: "#c8a84b",
    glowColor: "rgba(200,168,75,0.55)",
    story:
      "Every page turned was a seed planted. You completed 7 learning streaks and watched knowledge bloom into wisdom.",
    src: new URL(
      "/assets/Museum/JournalRelic.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 0,
  },
  {
    id: "solar_orb",
    label: "Solar Orb",
    category: "Energy",
    color: "#f5a623",
    glowColor: "rgba(245,166,35,0.6)",
    story:
      "You rose with the sun for 14 mornings straight. This golden orb holds the warmth of every early start.",
    src: new URL(
      "/assets/Museum/Sun.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 0,
  },
  {
    id: "spirit_deer",
    label: "Spirit Deer",
    category: "Wildlife",
    color: "#e8c87a",
    glowColor: "rgba(232,200,122,0.55)",
    story:
      "Still as a deer at dawn — you held 10 consecutive mindfulness sessions without a single skip.",
    src: new URL(
      "/assets/Museum/Deerm.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 0,
  },
  {
    id: "ancient_grove",
    label: "Ancient Grove",
    category: "Growth",
    color: "#6fcf45",
    glowColor: "rgba(111,207,69,0.5)",
    story:
      "Your habits took root and grew skyward. 30 days of consistent wellness practice earned this living monument.",
    src: new URL(
      "/assets/Museum/treem.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 0,
  },
  {
    id: "dream_shard",
    label: "Dream Shard",
    category: "Sleep",
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.6)",
    story:
      "Rest became ritual. You logged 21 nights of 7+ hour sleep, and the crystal absorbed every peaceful dream.",
    src: new URL(
      "/assets/Museum/Purplecrystal.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 1,
  },
  {
    id: "aqua_prism",
    label: "Aqua Prism",
    category: "Hydration",
    color: "#38bdf8",
    glowColor: "rgba(56,189,248,0.65)",
    story:
      "Every sip counted. You hit your daily water goal for 14 days, filling this crystal with pure intention.",
    src: new URL(
      "/assets/Museum/BlueCrystal.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 1,
  },
  {
    id: "harvest_basket",
    label: "Harvest Basket",
    category: "Nutrition",
    color: "#84cc16",
    glowColor: "rgba(132,204,22,0.5)",
    story:
      "Nourishment chosen with care. You logged 5 servings of fruit or vegetables every day for a full week.",
    src: new URL(
      "/assets/Museum/Nutritionm.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 1,
  },
  {
    id: "gold_star",
    label: "Gold Star",
    category: "Achievement",
    color: "#fbbf24",
    glowColor: "rgba(251,191,36,0.6)",
    story:
      "The rarest trophy in the museum. Awarded only once — when every other artifact has been claimed.",
    src: new URL(
      "/assets/Museum/Starm.webp",
      import.meta.url
    ).href,
    unlocked: false, // Will be loaded from API
    shelf: 1,
  },
];

// ─── Sparkle particle ────────────────────────────────────────────────────────
function Sparkles({ color, count = 12 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 1.5,
    duration: Math.random() * 1.2 + 0.8,
  }));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: "50%",
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px 2px ${color}`,
            animation: `sparkleFloat ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

// ─── Artifact Dome ────────────────────────────────────────────────────────────
function ArtifactDome({ artifact, onClick, foxReacting, isEditorMode = false }) {
  const [hovered, setHovered] = useState(false);
  const [justUnlocked] = useState(false);

  const isActive = hovered || justUnlocked || foxReacting;

  const containerStyle = isEditorMode ? {
    // In editor mode, make it fill the container completely
    position: "relative",
    width: "100%",
    height: "100%",
    background: "none",
    border: "none",
    padding: 0,
    cursor: artifact.unlocked ? "pointer" : "default",
    filter: artifact.unlocked
      ? isActive
        ? `drop-shadow(0 0 14px ${artifact.glowColor}) drop-shadow(0 0 30px ${artifact.glowColor})`
        : `drop-shadow(0 0 7px ${artifact.glowColor})`
      : "grayscale(1) brightness(0.35)",
    transform: hovered && artifact.unlocked ? "scale(1.07) translateY(-4px)" : "scale(1)",
    transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1), filter 0.4s ease",
    outline: "none",
  } : {
    // Fixed mode - fill the container completely
    position: "relative",
    width: "100%",
    height: "100%",
    background: "none",
    border: "none",
    padding: 0,
    cursor: artifact.unlocked ? "pointer" : "default",
    filter: artifact.unlocked
      ? isActive
        ? `drop-shadow(0 0 14px ${artifact.glowColor}) drop-shadow(0 0 30px ${artifact.glowColor})`
        : `drop-shadow(0 0 7px ${artifact.glowColor})`
      : "grayscale(1) brightness(0.35)",
    transform: hovered && artifact.unlocked ? "scale(1.07) translateY(-4px)" : "scale(1)",
    transition: "transform 0.35s cubic-bezier(.34,1.56,.64,1), filter 0.4s ease",
    outline: "none",
  };

  return (
    <button
      aria-label={`${artifact.label} — ${artifact.category}`}
      onClick={() => artifact.unlocked && onClick(artifact)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={containerStyle}
    >
      <img
        src={artifact.src}
        alt={artifact.label}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
        }}
        draggable={false}
      />
      {artifact.unlocked && isActive && (
        <Sparkles color={artifact.color} count={10} />
      )}
      {!artifact.unlocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: isEditorMode ? "2em" : "3em", opacity: 0.7 }}>🔒</span>
        </div>
      )}
      {/* Label badge - positioned outside container */}
      <div
        style={{
          position: "absolute",
          bottom: "-30px",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontSize: "1rem",
          fontFamily: "'Cinzel', serif",
          color: artifact.unlocked ? artifact.color : "#555",
          letterSpacing: "0.05em",
          textShadow: artifact.unlocked
            ? `0 0 8px ${artifact.glowColor}`
            : "none",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {artifact.label}
      </div>
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function ArtifactModal({ artifact, aiMemory, loadingMemory, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={artifact.label}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(5,8,20,0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background:
            "radial-gradient(ellipse at 40% 20%, rgba(30,20,55,0.98) 0%, rgba(12,10,28,0.99) 100%)",
          border: `1.5px solid ${artifact.color}55`,
          borderRadius: 24,
          padding: "2rem 2.2rem",
          maxWidth: 380,
          width: "90vw",
          boxShadow: `0 0 60px ${artifact.glowColor}, 0 8px 40px rgba(0,0,0,0.7)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          animation: "modalSlideUp 0.3s cubic-bezier(.34,1.56,.64,1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <img
          src={artifact.src}
          alt={artifact.label}
          style={{
            width: 110,
            height: 140,
            objectFit: "contain",
            filter: `drop-shadow(0 0 18px ${artifact.glowColor})`,
            animation: "domeFloat 3s ease-in-out infinite",
          }}
        />
        <div
          style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: "0.72rem",
            color: artifact.color,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          {artifact.category}
        </div>
        <h2
          style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: "1.25rem",
            color: "#f0e8d0",
            textAlign: "center",
            margin: 0,
            textShadow: `0 0 16px ${artifact.glowColor}`,
          }}
        >
          {artifact.label}
        </h2>

        {/* ── ✦ Sanctuary Memory ✦ header + AI text ── */}
        <div style={{
          width: "100%",
          background: `${artifact.color}11`,
          border: `1px solid ${artifact.color}33`,
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <div style={{
            fontSize: "0.65rem",
            color: artifact.color,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textAlign: "center",
            opacity: 0.75,
          }}>
            ✦ Sanctuary Memory ✦
          </div>

          {loadingMemory ? (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "8px 0" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: artifact.color,
                    opacity: 0.8,
                    animation: `memDot 0.9s ${i * 0.15}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          ) : (
            <p
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "0.88rem",
                color: "#c8bfa8",
                textAlign: "center",
                lineHeight: 1.65,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {aiMemory || artifact.story}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "0.5rem",
            background: `linear-gradient(135deg, ${artifact.color}33, ${artifact.color}18)`,
            border: `1px solid ${artifact.color}66`,
            borderRadius: 50,
            color: artifact.color,
            fontFamily: "'Cinzel', serif",
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            padding: "0.55rem 1.8rem",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          Close
        </button>
        {/* Corner runes */}
        {["╔", "╗", "╚", "╝"].map((r, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              ...[
                { top: 10, left: 14 },
                { top: 10, right: 14 },
                { bottom: 10, left: 14 },
                { bottom: 10, right: 14 },
              ][i],
              color: `${artifact.color}55`,
              fontSize: "0.9rem",
              fontFamily: "monospace",
              pointerEvents: "none",
            }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Firefly ──────────────────────────────────────────────────────────────────
function Fireflies({ count = 18 }) {
  const flies = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 85,
    size: Math.random() * 3 + 2,
    delay: Math.random() * 5,
    dur: Math.random() * 6 + 5,
    driftX: (Math.random() - 0.5) * 120,
    driftY: (Math.random() - 0.5) * 80,
  }));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {flies.map((f) => (
        <div
          key={f.id}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: f.size,
            height: f.size,
            borderRadius: "50%",
            background: "#b8e8a0",
            boxShadow: "0 0 8px 3px rgba(184,232,160,0.7)",
            animation: `fireflyDrift ${f.dur}s ${f.delay}s ease-in-out infinite alternate, fireflyBlink ${f.dur * 0.5}s ${f.delay}s ease-in-out infinite`,
            "--dx": `${f.driftX}px`,
            "--dy": `${f.driftY}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Fox companion ────────────────────────────────────────────────────────────
function FoxCompanion({ reacting, foxSrc }) {
  return (
    <img
      src={foxSrc}
      alt="Fox companion"
      style={{ 
        width: "100%", 
        display: "block", 
        objectFit: "contain",
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))",
        animation: reacting
          ? "foxBounce 0.5s ease"
          : "foxIdle 4s ease-in-out infinite",
        transformOrigin: "bottom center",
        userSelect: "none",
        pointerEvents: "none",
      }}
      draggable={false}
    />
  );
}

// ─── Shelf Row ────────────────────────────────────────────────────────────────
function ShelfRow({ artifacts, onArtifactClick, foxReactingId }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: "clamp(8px, 3vw, 28px)",
        width: "100%",
        paddingBottom: "clamp(18px, 3vh, 32px)",
        paddingTop: "clamp(4px, 1vh, 10px)",
      }}
    >
      {artifacts.map((artifact) => (
        <ArtifactDome
          key={artifact.id}
          artifact={artifact}
          onClick={onArtifactClick}
          foxReacting={foxReactingId === artifact.id}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MuseumOfProgress() {
  const navigate = useNavigate();
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [foxReactingId, setFoxReactingId] = useState(null);
  const [titleVisible, setTitleVisible] = useState(false);
  const [artifactMemory, setArtifactMemory] = useState(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [artifacts, setArtifacts] = useState(ARTIFACTS);
  const [loading, setLoading] = useState(true);

  const { logs, companion } = useSanctuaryStore();
  const userId = 1; // TODO: Get from auth context

  const bgSrc = "/assets/MuseumBG.webp";       // existing asset in public/assets/Museum
  const foxSrc = "/assets/screen2/fox.jpg";    // existing asset in public/assets/screen2

  // Artifact image paths — swap with your actual imports
  const artifactImages = {
    leaf_chronicle: "/assets/Museum/JournalRelic.webp",
    solar_orb: "/assets/Museum/Sun.webp", 
    spirit_deer: "/assets/Museum/Deerm.webp",
    ancient_grove: "/assets/Museum/treem.webp",
    dream_shard: "/assets/Museum/Purplecrystal.webp",
    aqua_prism: "/assets/Museum/BlueCrystal.webp",
    harvest_basket: "/assets/Museum/Nutritionm.webp",
    gold_star: "/assets/Museum/Starm.webp",
  };

  // Load actual artifact data from API
  useEffect(() => {
    const loadArtifacts = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/museum/${userId}`);
        if (response.ok) {
          const museumData = await response.json();
          
          // Update artifacts with real unlock status
          const updatedArtifacts = ARTIFACTS.map(artifact => {
            const serverArtifact = museumData.artifacts.find(a => {
              // Normalize both server and client artifact names for comparison
              const serverName = a.artifact_name.toLowerCase().replace(/\s+/g, '_');
              const clientId = artifact.id.toLowerCase();
              return serverName === clientId || a.artifact_name === artifact.label;
            });
            
            return {
              ...artifact,
              unlocked: serverArtifact ? serverArtifact.unlocked : false,
              src: artifactImages[artifact.id] || artifact.src
            };
          });
          
          setArtifacts(updatedArtifacts);
        } else {
          console.warn("Failed to load museum data, using defaults");
          setArtifacts(ARTIFACTS.map(a => ({...a, src: artifactImages[a.id] || a.src})));
        }
      } catch (error) {
        console.error("Error loading artifacts:", error);
        setArtifacts(ARTIFACTS.map(a => ({...a, src: artifactImages[a.id] || a.src})));
      } finally {
        setLoading(false);
      }
    };
    
    loadArtifacts();
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => setTitleVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleArtifactClick = useCallback(async (artifact) => {
    setSelectedArtifact(artifact);
    setArtifactMemory(null);
    setFoxReactingId(artifact.id);
    setTimeout(() => setFoxReactingId(null), 1200);

    // Fetch AI-generated memory for this artifact
    if (artifact.unlocked) {
      setLoadingMemory(true);
      try {
        const todayLog = logs[0] || null;
        const response = await ApiService.generateArtifact(
          { id: artifact.id, label: artifact.label, category: artifact.category },
          todayLog,
          companion || "fox",
          "Traveler"
        );
        setArtifactMemory(response?.memory || response?.narration || response?.text || null);
      } catch (err) {
        console.warn("Artifact memory fetch failed:", err);
        setArtifactMemory(null);
      } finally {
        setLoadingMemory(false);
      }
    }
  }, [logs, companion]);

  const handleNavigateBack = () => {
    navigate('/sanctuaryworld');
  };

  const shelf0 = artifacts.filter((a) => a.shelf === 0);
  const shelf1 = artifacts.filter((a) => a.shelf === 1);

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cinzel+Decorative:wght@400;700&family=Lora:ital,wght@0,400;1,400&display=swap');

        @keyframes sparkleFloat {
          from { opacity: 0.2; transform: translateY(0) scale(0.8); }
          to   { opacity: 0.9; transform: translateY(-8px) scale(1.2); }
        }
        @keyframes fireflyDrift {
          from { transform: translate(0, 0); }
          to   { transform: translate(var(--dx), var(--dy)); }
        }
        @keyframes fireflyBlink {
          0%, 100% { opacity: 0.9; }
          50%       { opacity: 0.1; }
        }
        @keyframes domeFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes foxIdle {
          0%, 100% { transform: rotate(-1deg) translateY(0); }
          50%      { transform: rotate(1deg) translateY(-4px); }
        }
        @keyframes foxBounce {
          0%   { transform: translateY(0) scale(1); }
          30%  { transform: translateY(-14px) scale(1.08); }
          60%  { transform: translateY(0) scale(0.96); }
          80%  { transform: translateY(-5px) scale(1.03); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes memDot {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50%      { opacity: 1;   transform: translateY(-4px); }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes titleReveal {
          from { opacity: 0; transform: translateY(-16px) scale(0.95); letter-spacing: 0.2em; }
          to   { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.28em; }
        }
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 12px #c8a84b88, 0 0 28px #c8a84b44; }
          50%      { text-shadow: 0 0 22px #c8a84bcc, 0 0 50px #c8a84b88; }
        }
        @keyframes shimmerBar {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .museum-root * { box-sizing: border-box; }
        .museum-root button:focus-visible {
          outline: 2px solid #c8a84b;
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          .museum-root * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div
        className="museum-root"
        style={{
          position: "relative",
          width: "100%",
          height: "100svh",
          overflow: "hidden",
          fontFamily: "'Cinzel', serif",
          background: "#050810",
        }}
      >
        {/* ── Background ── */}
        <img
          src={bgSrc}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            userSelect: "none",
            pointerEvents: "none",
          }}
          draggable={false}
        />

        {/* ── Atmospheric vignette ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% 30%, transparent 30%, rgba(3,5,15,0.55) 80%, rgba(3,5,15,0.85) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* ── Fireflies ── */}
        <Fireflies count={22} />

        {/* ── Header ── */}
        <header
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "clamp(16px, 4vh, 36px)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {/* Decorative top bar */}
          <div
            style={{
              width: "clamp(180px, 40vw, 320px)",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #c8a84b99, #f0d888cc, #c8a84b99, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmerBar 4s linear infinite",
              marginBottom: 12,
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1rem, 3.5vw, 1.6rem)",
              fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
              fontWeight: 700,
              color: "#f0e8d0",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              opacity: titleVisible ? 1 : 0,
              animation: titleVisible
                ? "titleReveal 1s ease forwards, glowPulse 4s 1.2s ease-in-out infinite"
                : "none",
              textShadow: "0 0 18px rgba(200,168,75,0.55)",
            }}
          >
            Museum of Progress
          </h1>
          <div
            style={{
              width: "clamp(120px, 28vw, 200px)",
              height: 1,
              marginTop: 10,
              background:
                "linear-gradient(90deg, transparent, #c8a84b66, #c8a84b66, transparent)",
            }}
          />
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "clamp(0.55rem, 1.5vw, 0.72rem)",
              color: "#8a7a5a",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Treasures of your journey
          </p>
        </header>

        {/* ── Museum Artifacts in Fixed Positions ── */}
        {/* Top Shelf */}
        <div
          style={{
            position: "absolute",
            left: 295,
            top: 150,
            width: 256,
            height: 268,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'leaf_chronicle')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'leaf_chronicle'}
              isEditorMode={false}
            />
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            left: 493,
            top: 150,
            width: 256,
            height: 268,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'solar_orb')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'solar_orb'}
              isEditorMode={false}
            />
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            left: 756,
            top: 150,
            width: 256,
            height: 268,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'spirit_deer')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'spirit_deer'}
              isEditorMode={false}
            />
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            left: 999,
            top: 150,
            width: 256,
            height: 268,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'ancient_grove')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'ancient_grove'}
              isEditorMode={false}
            />
          )}
        </div>
        
        {/* Bottom Shelf */}
        <div
          style={{
            position: "absolute",
            left: 287,
            top: 457,
            width: 256,
            height: 240,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'dream_shard')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'dream_shard'}
              isEditorMode={false}
            />
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            left: 480,
            top: 457,
            width: 256,
            height: 240,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'aqua_prism')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'aqua_prism'}
              isEditorMode={false}
            />
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            left: 756,
            top: 457,
            width: 256,
            height: 240,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'harvest_basket')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'harvest_basket'}
              isEditorMode={false}
            />
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            left: 999,
            top: 457,
            width: 256,
            height: 240,
            zIndex: 15
          }}
        >
          {!loading && (
            <ArtifactDome
              artifact={artifacts.find(a => a.id === 'gold_star')}
              onClick={handleArtifactClick}
              foxReacting={foxReactingId === 'gold_star'}
              isEditorMode={false}
            />
          )}
        </div>

        {/* ── Fox ── */}
        <div
          style={{
            position: "absolute",
            left: 57,
            top: 950,
            width: 100,
            height: 75,
            zIndex: 10
          }}
        >
          <FoxCompanion reacting={!!foxReactingId} foxSrc={foxSrc} />
        </div>

        {/* ── Treasure chest accent (bottom-right, decorative) ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 1793,
            top: 1037,
            width: 67,
            height: 67,
            opacity: 0.55,
            pointerEvents: "none",
            filter: "drop-shadow(0 0 10px rgba(100,180,255,0.4))",
            zIndex: 5
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "4px",
              background: "radial-gradient(circle, rgba(60,130,255,0.5) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* ── Back navigation ── */}
        <button
          aria-label="Return to Sanctuary World"
          onClick={handleNavigateBack}
          style={{
            position: "absolute",
            left: 24,
            top: 27,
            width: 120,
            height: 40,
            zIndex: 30,
            background: "rgba(12,10,28,0.7)",
            border: "1px solid rgba(200,168,75,0.35)",
            borderRadius: 50,
            color: "#c8a84b",
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(0.6rem, 1.6vw, 0.78rem)",
            letterSpacing: "0.1em",
            padding: "0.45rem 1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(4px)",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(30,22,55,0.88)";
            e.currentTarget.style.borderColor = "rgba(200,168,75,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(12,10,28,0.7)";
            e.currentTarget.style.borderColor = "rgba(200,168,75,0.35)";
          }}
        >
          <span style={{ fontSize: "1em" }}>←</span> Sanctuary
        </button>

        {/* ── Progress counter ── */}
        <div
          style={{
            position: "absolute",
            left: 1752,
            top: 27,
            width: 144,
            height: 40,
            zIndex: 30,
            background: "rgba(12,10,28,0.7)",
            border: "1px solid rgba(200,168,75,0.35)",
            borderRadius: 50,
            color: "#c8a84b",
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(0.55rem, 1.4vw, 0.72rem)",
            letterSpacing: "0.1em",
            padding: "0.45rem 1.1rem",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {artifacts.filter((a) => a.unlocked).length} / {artifacts.length} unlocked
        </div>

        {/* ── Modal ── */}
        {selectedArtifact && (
          <ArtifactModal
            artifact={selectedArtifact}
            aiMemory={artifactMemory}
            loadingMemory={loadingMemory}
            onClose={() => { setSelectedArtifact(null); setArtifactMemory(null); }}
          />
        )}
      </div>
    </>
  );
}
