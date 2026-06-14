import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { useSanctuaryStore } from "../store/useSanctuaryStore";
import defaultLayout from "../layouts/dailylog.json";

// ── Asset paths (place all webps from the zip in /public/assets/DailyLog/) ──
const ASSETS = {
  background: "/assets/DailyLog/DailyLogBG.webp",
  fountain:   "/assets/DailyLog/Water_Fountain.webp",
  fox:        "/assets/DailyLog/fox.webp",
  sleep:      "/assets/DailyLog/Sleep_Crystal.webp",   // purple crystal
  nutrition:  "/assets/DailyLog/Nutrition_Basket.webp",  // fruit basket
  exercise:   "/assets/DailyLog/Energy_Crystal.webp",   // green crystal
  mood:       "/assets/DailyLog/Mood_Lantern.webp",   // golden lantern
};

// ── Health aspect configuration ──
const ASPECTS = [
  {
    key: "sleep",
    label: "Sleep",
    icon: "🌙",
    asset: ASSETS.sleep,
    color: "#b06aff",
    glowColor: "rgba(176,106,255,0.7)",
    position: { left: "18%", top: "40%" },
    question: "How many hours did you sleep?",
    options: ["< 5 hrs", "5–6 hrs", "7–8 hrs", "8+ hrs"],
  },
  {
    key: "hydration",
    label: "Hydration",
    icon: "💧",
    asset: ASSETS.fountain,
    color: "#44ccff",
    glowColor: "rgba(68,204,255,0.7)",
    position: { left: "50%", top: "38%" },
    question: "How much water did you drink?",
    options: ["< 3 glasses", "3-5 glasses", "6-8 glasses", "8+ glasses"],
  },
  {
    key: "nutrition",
    label: "Nutrition",
    icon: "🍎",
    asset: ASSETS.nutrition,
    color: "#ffb347",
    glowColor: "rgba(255,179,71,0.7)",
    position: { left: "26%", top: "65%" },
    question: "How was your nutrition today?",
    options: ["Poor", "Fair", "Good", "Excellent"],
  },
  {
    key: "exercise",
    label: "Exercise",
    icon: "⚡",
    asset: ASSETS.exercise,
    color: "#4dff91",
    glowColor: "rgba(77,255,145,0.7)",
    position: { right: "20%", top: "35%" },
    question: "Did you exercise today?",
    options: ["None", "Light walk", "Moderate", "Intense"],
  },
  {
    key: "mood",
    label: "Mood",
    icon: "✨",
    asset: ASSETS.mood,
    color: "#ffd700",
    glowColor: "rgba(255,215,0,0.7)",
    position: { right: "10%", top: "58%" },
    question: "How is your mood today?",
    options: ["😞 Low", "😐 Okay", "🙂 Good", "😄 Great"],
  },
];
function ThreeScene({ loggedAspects }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({ raf: null });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 1, 1000);
    camera.position.z = 100;

    // Fireflies
    const fireflyCount = 120;
    const fireflyGeo = new THREE.BufferGeometry();
    const ffPositions = new Float32Array(fireflyCount * 3);
    const ffVelocities = [];
    for (let i = 0; i < fireflyCount; i++) {
      ffPositions[i * 3]     = (Math.random() - 0.5) * w;
      ffPositions[i * 3 + 1] = (Math.random() - 0.5) * h;
      ffPositions[i * 3 + 2] = 0;
      ffVelocities.push({
        x: (Math.random() - 0.5) * 0.4,
        y: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
    fireflyGeo.setAttribute("position", new THREE.BufferAttribute(ffPositions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 3,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    scene.add(fireflies);

    const mistPlanes = [];
    for (let m = 0; m < 4; m++) {
      const mistGeo = new THREE.PlaneGeometry(w * 0.6, h * 0.15);
      const mistMat = new THREE.MeshBasicMaterial({
        color: 0x88bbff,
        transparent: true,
        opacity: 0.04 + Math.random() * 0.04,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mist = new THREE.Mesh(mistGeo, mistMat);
      mist.position.set((Math.random() - 0.5) * w * 0.3, -h * 0.1 + m * 30, 0);
      scene.add(mist);
      mistPlanes.push({ mesh: mist, speed: 0.15 + Math.random() * 0.1 });
    }

    let frame = 0;
    const animate = () => {
      const raf = requestAnimationFrame(animate);
      frame++;

      const ffPos = fireflies.geometry.attributes.position.array;
      for (let i = 0; i < fireflyCount; i++) {
        const v = ffVelocities[i];
        ffPos[i * 3]     += v.x + Math.sin(frame * 0.01 + v.phase) * 0.2;
        ffPos[i * 3 + 1] += v.y + Math.cos(frame * 0.013 + v.phase) * 0.15;
        if (ffPos[i * 3] >  w / 2) ffPos[i * 3] = -w / 2;
        if (ffPos[i * 3] < -w / 2) ffPos[i * 3] =  w / 2;
        if (ffPos[i * 3 + 1] >  h / 2) ffPos[i * 3 + 1] = -h / 2;
        if (ffPos[i * 3 + 1] < -h / 2) ffPos[i * 3 + 1] =  h / 2;
      }
      fireflies.geometry.attributes.position.needsUpdate = true;
      fireflyMat.opacity = 0.6 + Math.sin(frame * 0.03) * 0.25;

      mistPlanes.forEach((m) => {
        m.mesh.position.x += m.speed;
        if (m.mesh.position.x > w * 0.6) m.mesh.position.x = -w * 0.6;
        m.mesh.material.opacity = 0.03 + Math.abs(Math.sin(frame * 0.005 + m.speed)) * 0.05;
      });

      renderer.render(scene, camera);
      sceneRef.current.raf = raf;
    };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.left = -nw / 2; camera.right = nw / 2;
      camera.top  =  nh / 2; camera.bottom = -nh / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(sceneRef.current.raf);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [loggedAspects]);

  return (
    <div ref={mountRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }} />
  );
}

// ══════════════════════════════════════════════════════════
//  Modal for logging an aspect
// ══════════════════════════════════════════════════════════
function LogModal({ aspect, onClose, onLog }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>{aspect.icon}</div>
        <h2 style={styles.modalTitle}>{aspect.label}</h2>
        <p style={styles.modalQuestion}>{aspect.question}</p>
        <div style={styles.optionGrid}>
          {aspect.options.map((opt) => (
            <button
              key={opt}
              style={{
                ...styles.optionBtn,
                background: selected === opt
                  ? `linear-gradient(135deg, ${aspect.color}99, ${aspect.color}44)`
                  : "rgba(255,255,255,0.07)",
                borderColor: selected === opt ? aspect.color : "rgba(255,255,255,0.18)",
                boxShadow: selected === opt ? `0 0 16px ${aspect.glowColor}` : "none",
              }}
              onClick={() => setSelected(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.confirmBtn,
              background: selected
                ? `linear-gradient(135deg, ${aspect.color}cc, ${aspect.color}66)`
                : "rgba(255,255,255,0.1)",
              cursor: selected ? "pointer" : "not-allowed",
              boxShadow: selected ? `0 0 20px ${aspect.glowColor}` : "none",
            }}
            onClick={() => selected && onLog(aspect.key, selected)}
            disabled={!selected}
          >
            ✓ Log {aspect.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Individual Health Aspect Object
// ══════════════════════════════════════════════════════════
function AspectObject({ aspect, isLogged, foxReacting, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    if (isLogged) {
      setJustLogged(true);
      const t = setTimeout(() => setJustLogged(false), 1000);
      return () => clearTimeout(t);
    }
  }, [isLogged]);

  const glowIntensity = hovered ? "0 0 40px" : isLogged ? "0 0 24px" : "0 0 12px";
  const scale = hovered ? 1.12 : justLogged ? 1.18 : 1;

  return (
    <div
      style={{ ...styles.aspectWrapper }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Glow ring removed per user request */}
      {/* Asset image */}
      <img
        src={aspect.asset}
        alt={aspect.label}
        style={{
          ...styles.aspectImg,
          transform: `scale(${scale})`,
          filter: isLogged
            ? `drop-shadow(0 0 18px ${aspect.color}) brightness(1.15)`
            : hovered
            ? `drop-shadow(0 0 14px ${aspect.color}) brightness(1.08)`
            : `drop-shadow(0 0 6px ${aspect.color}88)`,
          transition: "all 0.3s cubic-bezier(.34,1.56,.64,1)",
        }}
      />
      {/* Label badge */}
      <div
        style={{
          ...styles.labelBadge,
          background: isLogged
            ? `linear-gradient(135deg, ${aspect.color}88, ${aspect.color}44)`
            : "rgba(10,8,20,0.75)",
          borderColor: aspect.color,
          boxShadow: isLogged ? `0 0 12px ${aspect.glowColor}` : "none",
        }}
      >
        <span style={{ marginRight: 4 }}>{aspect.icon}</span>
        {aspect.label}
        {isLogged && <span style={{ marginLeft: 6, color: "#7fffb2" }}>✓</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Fox Companion
// ══════════════════════════════════════════════════════════
function FoxCompanion({ reactTarget }) {
  const [blinking, setBlinking] = useState(false);
  const [tailFlick, setTailFlick] = useState(false);

  // Idle blink
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Tail flick
  useEffect(() => {
    const tailInterval = setInterval(() => {
      setTailFlick(true);
      setTimeout(() => setTailFlick(false), 600);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(tailInterval);
  }, []);

  // React to logged entry (look toward logged item)
  const rotation = reactTarget
    ? ASPECTS.find((a) => a.key === reactTarget)?.position?.right
      ? "8deg"
      : "-8deg"
    : "0deg";

  return (
    <div style={{ ...styles.foxWrapper, position: 'relative' }}>
      <img
        src={ASSETS.fox}
        alt="Fox companion"
        style={{
          ...styles.foxImg,
          transform: `
            scaleX(-1)
            rotate(${rotation})
            ${tailFlick ? "translateY(-4px)" : "translateY(0)"}
          `,
          filter: "drop-shadow(0 8px 24px rgba(255,140,0,0.4))",
          transition: "transform 0.5s ease, filter 0.3s ease",
        }}
      />
      {/* Blink overlay — simulated with CSS opacity on eyes region */}
      {blinking && (
        <div style={styles.blinkOverlay} />
      )}
      {/* Thought bubble on react */}
      {reactTarget && (
        <div style={styles.thoughtBubble}>
          {ASPECTS.find((a) => a.key === reactTarget)?.icon} Nice!
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Save / Continue Panel
// ══════════════════════════════════════════════════════════
function SavePanel({ logged, onSave }) {
  const total = ASPECTS.length;
  const done = Object.keys(logged).length;
  const allDone = done === total;

  return (
    <div style={styles.savePanel}>
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${(done / total) * 100}%`,
          }}
        />
      </div>
      <span style={styles.progressText}>
        {done}/{total} logged
      </span>
      <button
        style={{
          ...styles.saveBtn,
          opacity: allDone ? 1 : 0.55,
          cursor: allDone ? "pointer" : "not-allowed",
          boxShadow: allDone
            ? "0 0 30px rgba(100,220,255,0.6), 0 4px 24px rgba(0,0,0,0.5)"
            : "none",
        }}
        onClick={allDone ? onSave : undefined}
      >
        {allDone ? "✨ Save & Continue" : `Complete All (${total - done} remaining)`}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Main DailyLog Component
// ══════════════════════════════════════════════════════════
export default function DailyLog() {
  const navigate = useNavigate();
  const submitLog = useSanctuaryStore(s => s.submitLog);
  const hasLoggedToday = useSanctuaryStore(s => s.hasLoggedToday);
  
  const [logged, setLogged] = useState({});
  const [activeAspect, setActiveAspect] = useState(null);
  const [foxReact, setFoxReact] = useState(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Redirect if already logged today - check backend status
  useEffect(() => {
    const checkLogStatus = async () => {
      try {
        const status = await useSanctuaryStore.getState().checkDailyLogStatus();
        if (status.has_logged_today) {
          navigate('/sanctuaryworld', { replace: true });
        }
      } catch (error) {
        console.error('Failed to check log status:', error);
      }
    };
    checkLogStatus();
  }, [navigate]);

  const handleLog = useCallback((key, value) => {
    setLogged((prev) => ({ ...prev, [key]: value }));
    setActiveAspect(null);
    setFoxReact(key);
    setTimeout(() => setFoxReact(null), 2500);
  }, []);

  const handleSave = useCallback(() => {
    setSaveFlash(true);
    
    // Convert UI selections to store format (1-10 scale)
    const convertToScore = (value, aspectKey) => {
      const aspect = ASPECTS.find(a => a.key === aspectKey);
      if (!aspect) return 5;
      
      const index = aspect.options.indexOf(value);
      return index !== -1 ? (index + 1) * 2.5 : 5; // Maps 0-3 to 2.5, 5, 7.5, 10
    };

    const logData = {
      sleep: convertToScore(logged.sleep, 'sleep'),
      hydration: convertToScore(logged.hydration, 'hydration') || 6, // Default water assumption
      nutrition: convertToScore(logged.nutrition, 'nutrition'),
      exercise: convertToScore(logged.exercise, 'exercise'),
      mood: convertToScore(logged.mood, 'mood'),
    };

    // Submit to store (now async with backend integration)
    submitLog(logData).catch(err => {
      console.error('Failed to submit log:', err);
      // Still continue with navigation even if backend fails
    });
    
    setTimeout(() => {
      navigate('/sanctuaryworld', { replace: true }); // Return to sanctuary world
    }, 800);
  }, [logged, submitLog, navigate]);

  // Define assets for LayoutEditor
  const editorAssets = {
    fox: {
      content: <FoxCompanion reactTarget={foxReact} />,
      x: 100,
      y: 400,
      width: 200,
      height: 150,
      rotation: 0,
      zIndex: 10
    },
    sleepCrystal: {
      content: (
        <AspectObject
          aspect={ASPECTS[0]} // sleep
          isLogged={!!logged.sleep}
          foxReacting={foxReact === 'sleep'}
          onClick={() => setActiveAspect(ASPECTS[0])}
        />
      ),
      x: 200,
      y: 200,
      width: 150,
      height: 200,
      rotation: 0,
      zIndex: 6
    },
    waterFountain: {
      content: (
        <AspectObject
          aspect={ASPECTS[1]} // hydration
          isLogged={!!logged.hydration}
          foxReacting={foxReact === 'hydration'}
          onClick={() => setActiveAspect(ASPECTS[1])}
        />
      ),
      x: 400,
      y: 250,
      width: 120,
      height: 180,
      rotation: 0,
      zIndex: 6
    },
    nutritionBasket: {
      content: (
        <AspectObject
          aspect={ASPECTS[2]} // nutrition
          isLogged={!!logged.nutrition}
          foxReacting={foxReact === 'nutrition'}
          onClick={() => setActiveAspect(ASPECTS[2])}
        />
      ),
      x: 800,
      y: 220,
      width: 160,
      height: 160,
      rotation: 0,
      zIndex: 6
    },
    energyCrystal: {
      content: (
        <AspectObject
          aspect={ASPECTS[3]} // exercise
          isLogged={!!logged.exercise}
          foxReacting={foxReact === 'exercise'}
          onClick={() => setActiveAspect(ASPECTS[3])}
        />
      ),
      x: 600,
      y: 200,
      width: 140,
      height: 200,
      rotation: 0,
      zIndex: 6
    },
    moodLantern: {
      content: (
        <AspectObject
          aspect={ASPECTS[4]} // mood
          isLogged={!!logged.mood}
          foxReacting={foxReact === 'mood'}
          onClick={() => setActiveAspect(ASPECTS[4])}
        />
      ),
      x: 1000,
      y: 180,
      width: 120,
      height: 220,
      rotation: 0,
      zIndex: 6
    }
  };

  // Global keyboard toggle: press 'd' to enter/exit edit mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        setIsEditing(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={styles.root}>
      {/* Ensure any cached editor layout is cleared so we use the file-based layout */}
      <ClearCachedLayout />
        {/* ── Layer 1: Background image ── */}
        <div
          style={{
            ...styles.bgLayer,
            backgroundImage: `url(${ASSETS.background})`,
          }}
        />

        {/* ── Layer 2: Dark vignette overlay ── */}
        <div style={styles.vignette} />

        {/* ── Layer 3: Three.js particle canvas ── */}
        <ThreeScene loggedAspects={logged} />

        {/* ── Layer 4: Interactive HTML overlay ── */}
        <div style={styles.overlay}>

          {/* Title */}
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>HealthQuest</h1>
            <h2 style={styles.subtitle}>Daily Log</h2>
          </div>

          {/* Bottom save panel */}
          <SavePanel logged={logged} onSave={handleSave} />
        </div>

        {/* Render assets from static layout (editor removed) */}
        {isEditing && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 9999, background: '#000000cc', color: '#fff', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}>
            Edit mode disabled in this build
          </div>
        )}
        {Object.entries(defaultLayout).map(([key, cfg]) => {
            const wrapperStyle = {
              position: 'absolute',
              left: cfg.x,
              top: cfg.y,
              width: cfg.width,
              height: cfg.height,
              zIndex: (cfg.zIndex !== undefined) ? cfg.zIndex : 6,
              transform: `rotate(${cfg.rotation || 0}deg)`,
              pointerEvents: 'auto',
            };

            switch (key) {
              case 'fox':
                return (
                  <div key={key} style={wrapperStyle}>
                    <FoxCompanion reactTarget={foxReact} />
                  </div>
                );

              case 'sleepCrystal':
                return (
                  <div key={key} style={wrapperStyle}>
                    <AspectObject
                      aspect={ASPECTS[0]}
                      isLogged={!!logged.sleep}
                      foxReacting={foxReact === 'sleep'}
                      onClick={() => setActiveAspect(ASPECTS[0])}
                    />
                  </div>
                );

              case 'waterFountain':
                return (
                  <div key={key} style={wrapperStyle}>
                    <AspectObject
                      aspect={ASPECTS[1]}
                      isLogged={!!logged.hydration}
                      foxReacting={foxReact === 'hydration'}
                      onClick={() => setActiveAspect(ASPECTS[1])}
                    />
                  </div>
                );

              case 'nutritionBasket':
                return (
                  <div key={key} style={wrapperStyle}>
                    <AspectObject
                      aspect={ASPECTS[2]}
                      isLogged={!!logged.nutrition}
                      foxReacting={foxReact === 'nutrition'}
                      onClick={() => setActiveAspect(ASPECTS[2])}
                    />
                  </div>
                );

              case 'energyCrystal':
                return (
                  <div key={key} style={wrapperStyle}>
                    <AspectObject
                      aspect={ASPECTS[3]}
                      isLogged={!!logged.exercise}
                      foxReacting={foxReact === 'exercise'}
                      onClick={() => setActiveAspect(ASPECTS[3])}
                    />
                  </div>
                );

              case 'moodLantern':
                return (
                  <div key={key} style={wrapperStyle}>
                    <AspectObject
                      aspect={ASPECTS[4]}
                      isLogged={!!logged.mood}
                      foxReacting={foxReact === 'mood'}
                      onClick={() => setActiveAspect(ASPECTS[4])}
                    />
                  </div>
                );

              default:
                return null;
            }
          })}

        {/* ── Layer 5: Log modal ── */}
        {activeAspect && (
          <LogModal
            aspect={activeAspect}
            onClose={() => setActiveAspect(null)}
            onLog={handleLog}
          />
        )}

        {/* ── Save flash ── */}
        {saveFlash && <div style={styles.saveFlash} />}

        {/* ── Keyframe styles injected globally ── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400&display=swap');

          @keyframes pulseRing {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50%       { transform: scale(1.15); opacity: 1; }
          }
          @keyframes fountainPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.04); }
          }
          @keyframes titleFloat {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-6px); }
          }
          @keyframes auraRotate {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes thoughtBubble {
            0%   { opacity: 0; transform: translateY(10px) scale(0.8); }
            20%  { opacity: 1; transform: translateY(0)   scale(1); }
            80%  { opacity: 1; }
            100% { opacity: 0; transform: translateY(-10px); }
          }
          @keyframes saveFlash {
            0%   { opacity: 0; }
            30%  { opacity: 0.7; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    
  );
}

// Small helper component to clear cached layout on mount
function ClearCachedLayout() {
  useEffect(() => {
    try {
      const key = 'layout_dailylog';
      // If no layout is cached, seed with the file layout so runtime matches file
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultLayout));
      }
      // Also remove any older cached layout flag if you want a fresh seed in future
      // localStorage.removeItem(key);
    } catch (e) {
      // ignore storage errors
    }
  }, []);
  return null;
}

// ══════════════════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════════════════
const styles = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Lato', sans-serif",
    cursor: "default",
  },

  bgLayer: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    zIndex: 0,
  },

  vignette: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)",
    zIndex: 1,
  },

  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 40,
    pointerEvents: 'none',
  },

  // ── Title ──
  titleBlock: {
    position: "absolute",
    top: "2%",
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    userSelect: "none",
    zIndex: 10,
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(28px, 2.5vw, 46px)",
    fontWeight: 400,
    color: "#f7f2e8",
    margin: 0,
    letterSpacing: "0.03em",
    textShadow: `
      0 0 6px rgba(255,255,255,0.25),
      0 2px 6px rgba(0,0,0,0.85)
    `,
    lineHeight: 1.05,
  },
  subtitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(18px, 1.4vw, 28px)",
    fontWeight: 400,
    color: "#f7f2e8",
    margin: "-2px 0 0 0",
    letterSpacing: "0.02em",
    textShadow: `
      0 0 4px rgba(255,255,255,0.2),
      0 2px 4px rgba(0,0,0,0.8)
    `,
  },
  titleDecor: {
    display: "none",
  },

  // ── Aspect objects ──
  aspectWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    cursor: "pointer",
    animation: "fadeIn 0.6s ease both",
  },
  glowRing: {
    position: "absolute",
    width: "110%",
    height: "110%",
    borderRadius: "50%",
    border: "2px solid",
    pointerEvents: "none",
    transition: "all 0.3s ease",
    top: "-5%",
    left: "-5%",
  },
  aspectImg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    transition: "all 0.3s cubic-bezier(.34,1.56,.64,1)",
  },
  labelBadge: {
    marginTop: 6,
    padding: "4px 14px",
    border: "1px solid",
    borderRadius: 16,
    color: "#f0e8d0",
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(10px, 1.1vw, 13px)",
    letterSpacing: "0.1em",
    display: "flex",
    alignItems: "center",
    transition: "all 0.3s ease",
    userSelect: "none",
  },

  // ── Fox ──
  foxWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  foxImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transition: "transform 0.5s ease, filter 0.3s ease",
  },
  blinkOverlay: {
    position: "absolute",
    top: "30%",
    left: "25%",
    width: "50%",
    height: "12%",
    background: "rgba(20,10,5,0.6)",
    borderRadius: 4,
    pointerEvents: "none",
  },
  thoughtBubble: {
    position: "absolute",
    bottom: "100%",
    left: "60%",
    background: "rgba(10,6,20,0.85)",
    border: "1px solid rgba(255,200,100,0.4)",
    borderRadius: 12,
    padding: "4px 12px",
    color: "#ffd77a",
    fontSize: 13,
    fontFamily: "'Lato', sans-serif",
    whiteSpace: "nowrap",
    animation: "thoughtBubble 2.5s ease forwards",
    pointerEvents: "none",
    boxShadow: "0 0 12px rgba(255,200,0,0.3)",
  },

  // ── Save panel ──
  savePanel: {
    position: "absolute",
    bottom: "4%",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(8,6,20,0.75)",
    border: "1px solid rgba(100,180,255,0.25)",
    borderRadius: 40,
    padding: "10px 24px",
    backdropFilter: "blur(12px)",
    zIndex: 10,
    pointerEvents: 'auto',
    boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
  },
  progressBar: {
    width: 120,
    height: 6,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #44ccff, #88ffe0)",
    borderRadius: 3,
    transition: "width 0.5s ease",
    boxShadow: "0 0 8px rgba(68,204,255,0.6)",
  },
  progressText: {
    color: "#a0c8e8",
    fontSize: 12,
    fontFamily: "'Lato', sans-serif",
    whiteSpace: "nowrap",
  },
  saveBtn: {
    padding: "10px 28px",
    background: "linear-gradient(135deg, rgba(100,220,255,0.7), rgba(60,140,255,0.6))",
    border: "1px solid rgba(100,220,255,0.5)",
    borderRadius: 24,
    color: "#fff",
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(11px, 1.1vw, 14px)",
    letterSpacing: "0.08em",
    cursor: "pointer",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },

  // ── Modal ──
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    backdropFilter: "blur(6px)",
    animation: "fadeIn 0.25s ease",
  },
  modal: {
    background: "linear-gradient(145deg, rgba(8,6,28,0.97), rgba(14,10,35,0.95))",
    border: "1px solid rgba(120,80,220,0.4)",
    borderRadius: 20,
    padding: "36px 40px",
    minWidth: 320,
    maxWidth: 440,
    width: "90vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(80,40,180,0.3)",
    animation: "fadeIn 0.3s ease",
  },
  modalTitle: {
    fontFamily: "'Cinzel', serif",
    color: "#f0e8d0",
    fontSize: 24,
    margin: "0 0 8px",
    letterSpacing: "0.15em",
  },
  modalQuestion: {
    color: "#a8b8d0",
    fontSize: 14,
    margin: "0 0 24px",
    textAlign: "center",
    lineHeight: 1.5,
  },
  optionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    width: "100%",
    marginBottom: 24,
  },
  optionBtn: {
    padding: "12px 8px",
    border: "1px solid",
    borderRadius: 12,
    color: "#e8dfc8",
    fontSize: 13,
    fontFamily: "'Lato', sans-serif",
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "0.04em",
  },
  modalActions: {
    display: "flex",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    padding: "11px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#888",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Lato', sans-serif",
    transition: "all 0.2s ease",
  },
  confirmBtn: {
    flex: 2,
    padding: "11px",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.05em",
    transition: "all 0.3s ease",
  },

  saveFlash: {
    position: "fixed",
    inset: 0,
    background: "rgba(100,220,255,0.25)",
    zIndex: 100,
    pointerEvents: "none",
    animation: "saveFlash 0.8s ease forwards",
  },
};
