import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useSanctuaryStore } from "../store/useSanctuaryStore";
import { useAuthStore } from "../store/useAuthStore";
import { ApiService, API_BASE } from "../services/api";
import sleepIcon from "/assets/CompanionScreen/Sleep.webp";
import hydrateIcon from "/assets/CompanionScreen/Hydrate.webp";
import exerciseIcon from "/assets/CompanionScreen/Exercise.webp";
import nutritionIcon from "/assets/CompanionScreen/Nutrients.webp";
import moodIcon from "/assets/CompanionScreen/ReduceStress.webp";
import foxImg from "/assets/CompanionScreen/CompanionFox.webp";
import bgImg from "/assets/CompanionScreen/CompanionScreenBG.webp";

// ─── Constants ──────────────────────────────────────────────────────────────────
const PANEL_TABS = ["Today", "Reflection", "Status"];

const FALLBACK = {
  advice:
    "The river seems stronger today. Every small step carves the stone.",
  reflection:
    "You've walked further than you know. The fireflies remember every step you took.",
  status: "Wellness: 78% · Season: Deepening Autumn · Day 42 of your journey.",
};

// Replace static METRIC_INSIGHTS with a function that uses real data
const getMetricInsights = (aiContent) => [
  {
    key: "sleep",
    label: "Sleep",
    icon: sleepIcon,
    color: "#f5a623",
    glow: "#f5a62366",
    value: aiContent.rawMetrics?.recent_7_sleep
      ? `${aiContent.rawMetrics.recent_7_sleep.toFixed(1)}h avg`
      : "—",
    insight: aiContent.strengths?.some(s => s.toLowerCase().includes("sleep"))
      ? "Sleep is one of your current strengths. Keep your evening routine stable."
      : aiContent.weaknesses?.some(s => s.toLowerCase().includes("sleep"))
      ? "Sleep needs attention. The Dream Crystal dims when rest is short."
      : "Your sleep pattern feeds the night sky and the Dream Crystal's glow.",
  },
  {
    key: "hydrate",
    label: "Hydration",
    icon: hydrateIcon,
    color: "#4fc3f7",
    glow: "#4fc3f766",
    value: aiContent.rawMetrics?.recent_7_water
      ? `${aiContent.rawMetrics.recent_7_water.toFixed(1)} glasses`
      : "—",
    insight: aiContent.strengths?.some(s => s.toLowerCase().includes("water") || s.toLowerCase().includes("hydration"))
      ? "Hydration is strong. The river flows clear and swift."
      : "Hydration shapes the river. More water keeps the sanctuary shimmering.",
  },
  {
    key: "exercise",
    label: "Exercise",
    icon: exerciseIcon,
    color: "#ffd54f",
    glow: "#ffd54f66",
    value: "—",
    insight: aiContent.recommendations?.some(r => r.toLowerCase().includes("exercise"))
      ? "Movement needs focus. Forest vitality responds to your physical energy."
      : "Movement logged. Forest paths grow brighter with each step.",
  },
  {
    key: "nutrition",
    label: "Nutrition",
    icon: nutritionIcon,
    color: "#ef6c00",
    glow: "#ef6c0066",
    value: "—",
    insight: aiContent.recommendations?.some(r => r.toLowerCase().includes("nutrition"))
      ? "Nutrition needs care. The orchard blooms when you nourish yourself well."
      : "Nourishing choices bloom in the orchard. The sanctuary grows with your nutrition.",
  },
  {
    key: "mood",
    label: "Mood",
    icon: moodIcon,
    color: "#ce93d8",
    glow: "#ce93d866",
    value: "—",
    insight: aiContent.strengths?.some(s => s.toLowerCase().includes("mood"))
      ? "Mood is a current strength. The sky is clear and the fireflies are bright."
      : "Your mood shapes the atmosphere. Calm moods bring fireflies and clear skies.",
  },
];

// ─── Three.js Firefly + Mist Scene ──────────────────────────────────────────────
function useThreeScene(canvasRef) {
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const count = 120;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = 0;
      velocities[i * 3] = (Math.random() - 0.5) * 0.0008;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.0008;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 0.012,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const fireflies = new THREE.Points(geo, mat);
    scene.add(fireflies);

    const mistGeo = new THREE.PlaneGeometry(2, 0.5);
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.04,
    });
    const mist = new THREE.Mesh(mistGeo, mistMat);
    mist.position.y = -0.55;
    scene.add(mist);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.01;

      const pos = fireflies.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += velocities[i * 3] + Math.sin(t + phases[i]) * 0.0003;
        pos[i * 3 + 1] += velocities[i * 3 + 1] + Math.cos(t * 0.7 + phases[i]) * 0.0003;
        if (pos[i * 3] > 1.1) pos[i * 3] = -1.1;
        if (pos[i * 3] < -1.1) pos[i * 3] = 1.1;
        if (pos[i * 3 + 1] > 1.1) pos[i * 3 + 1] = -1.1;
        if (pos[i * 3 + 1] < -1.1) pos[i * 3 + 1] = 1.1;
      }
      fireflies.geometry.attributes.position.needsUpdate = true;
      mat.opacity = 0.6 + Math.sin(t * 2) * 0.25;
      mist.position.x = Math.sin(t * 0.3) * 0.15;
      mistMat.opacity = 0.03 + Math.sin(t * 0.5) * 0.02;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      mistGeo.dispose();
      mistMat.dispose();
    };
  }, [canvasRef]);
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function CompanionScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const foxRef = useRef(null);
  const panelRef = useRef(null);

  const { user } = useAuthStore();

  const { logs, companion, visuals, generateChronicle } = useSanctuaryStore();
  const [activeTab, setActiveTab] = useState(0);
  const [foxReacting, setFoxReacting] = useState(false);
  const [aiContent, setAiContent] = useState({});
  const [loading, setLoading] = useState(false);
  const [liveLabel, setLiveLabel] = useState("Live insight");
  
  // Chat state for Status tab
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Companion name + hearts from store, with fallback
  const companionType = companion || "fox";
  const companionName = {
    "fox": "Fox",
    "owl": "Owl", 
    "panda": "Red Panda",
    "turtle": "Turtle"
  }[companionType] || "Fox";
  
  const companionMood = {
    "fox": "Curious, energetic",
    "owl": "Wise, observant",
    "panda": "Playful, gentle", 
    "turtle": "Patient, steady"
  }[companionType] || "Curious, energetic";
  
  const companionImg = {
    "fox": foxImg,
    "owl": foxImg, // Use fox image for now
    "panda": foxImg, // Use fox image for now
    "turtle": foxImg // Use fox image for now
  }[companionType] || foxImg;
  
  const hearts = 5;

  useThreeScene(canvasRef);

  // ─── Load AI content per tab ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Get real user ID
      const userId = user?.id || 1; // Use auth store user with fallback
      
      if (activeTab === 0 && !aiContent.advice) {
        setLoading(true);
        setLiveLabel("Loading…");
        try {
          const guidance = await ApiService.getHealthSummary(userId);
          console.log('Health summary response:', guidance); // Debug log
          const strengths = guidance.strengths?.slice(0, 2).join(" · ") || "";
          const recommendation = guidance.recommendations?.[0] || "";
          const text = recommendation
            ? `${recommendation} ${strengths ? `Your strengths: ${strengths}.` : ""}`
            : guidance.today_summary || FALLBACK.advice;
          
          setAiContent(p => ({ 
            ...p, 
            advice: text,
            healthScore: guidance.health_score || 50,
            strengths: guidance.strengths || [],
            weaknesses: guidance.weaknesses || [],
            recommendations: guidance.recommendations || [],
            rawMetrics: guidance.raw_metrics || {}
          }));
          setLiveLabel("Live insight");
        } catch (error) {
          console.error('Failed to load health guidance:', error);
          setAiContent((p) => ({ ...p, advice: FALLBACK.advice }));
          setLiveLabel("Cached insight");
        } finally {
          setLoading(false);
        }
      } else if (activeTab === 1 && !aiContent.reflection) {
        setLoading(true);
        setLiveLabel("Loading…");
        try {
          const reflections = await ApiService.getCompanionReflections(userId);
          console.log('Companion reflections response:', reflections); // Debug log
          const text = reflections.today_reflection || reflections.weekly_reflection || FALLBACK.reflection;
          setAiContent(p => ({
            ...p,
            reflection: text,
            weeklyReflection: reflections.weekly_reflection || "",
            foxThoughts: reflections.fox_thoughts || "",
          }));
          setLiveLabel("Live insight");
        } catch (error) {
          console.error('Failed to load companion reflections:', error);
          setAiContent((p) => ({ ...p, reflection: FALLBACK.reflection }));
          setLiveLabel("Cached insight");
        } finally {
          setLoading(false);
        }
      } else if (activeTab === 2 && !aiContent.status) {
        // Initialize with welcome message for Status/Chat tab
        if (chatMessages.length === 0) {
          setChatMessages([{
            id: Date.now(),
            type: 'companion',
            message: `Welcome back to our sanctuary. I'm ${companionName}, here to listen and share in your journey. How are you feeling today?`,
            timestamp: new Date()
          }]);
        }
        const todayLog = logs?.[0];
        if (todayLog) {
          const avg =
            ([todayLog.sleep, todayLog.hydration, todayLog.nutrition, todayLog.exercise, todayLog.mood]
              .reduce((a, b) => a + (b ?? 0), 0)) / 5;
          const wellness = Math.round(avg * 10);
          const season =
            avg > 0.8 ? "Flourishing Spring" :
            avg > 0.6 ? "Bright Summer" :
            avg > 0.4 ? "Gentle Autumn" : "Quiet Winter";
          setAiContent((p) => ({
            ...p,
            status: `Wellness: ${wellness}% • Season: ${season} | Day ${logs.length} of your sanctuary journey.`,
          }));
        } else {
          setAiContent((p) => ({ ...p, status: FALLBACK.status }));
        }
        setLiveLabel("Sanctuary data");
      }
    };
    load();
  }, [activeTab, aiContent.advice, aiContent.reflection, aiContent.status, logs, companionName, chatMessages.length]);

  // ─── Entrance animations ──────────────────────────────────────────────────────
  useEffect(() => {
    foxRef.current?.animate(
      [{ opacity: 0, transform: "translateX(-60px)" }, { opacity: 1, transform: "translateX(0)" }],
      { duration: 900, delay: 400, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
    panelRef.current?.animate(
      [{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "translateX(0)" }],
      { duration: 700, delay: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
  }, []);

  // ─── Fox idle glow pulse ──────────────────────────────────────────────────────
  useEffect(() => {
    const target = foxRef.current;
    if (!target) return;
    const anim = target.animate(
      [
        { filter: "drop-shadow(0 0 8px rgba(255,180,60,0.35))" },
        { filter: "drop-shadow(0 0 22px rgba(255,180,60,0.65)) drop-shadow(0 0 8px rgba(255,220,120,0.4))" },
      ],
      { duration: 2500, iterations: Infinity, direction: "alternate", easing: "ease-in-out" }
    );
    return () => anim.cancel();
  }, []);

  // ─── Fox bounce on tab change ─────────────────────────────────────────────────
  const foxReact = useCallback(() => {
    if (foxReacting) return;
    setFoxReacting(true);
    foxRef.current?.animate(
      [
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(-4deg) scale(1.06)" },
        { transform: "rotate(3deg) scale(1.04)" },
        { transform: "rotate(0deg) scale(1)" },
      ],
      { duration: 650, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", fill: "forwards" }
    );
    setTimeout(() => setFoxReacting(false), 650);
  }, [foxReacting]);

  const handleTabClick = (i) => {
    if (i === activeTab) return;
    setActiveTab(i);
    foxReact();
  };
  
  

  // Chat functions
  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    // Get real user ID
    const userId = user?.id || 1; // Use auth store user with fallback
    
    console.log('🚀 SENDING CHAT:', { userId, message: chatInput.trim(), apiBase: API_BASE });
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: chatInput.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    
    try {
      const response = await ApiService.chatWithCompanion(userId, userMessage.message);
      console.log('Chat response received:', response); // Debug log
      const companionMessage = {
        id: Date.now() + 1,
        type: 'companion',
        message: response.response || "I'm here with you, listening to your journey.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, companionMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const fallbackMessage = {
        id: Date.now() + 1,
        type: 'companion',
        message: "I'm having trouble connecting to the sanctuary right now, but I'm still here with you in spirit. Please ensure your backend is running.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setChatLoading(false);
    }
  };
  
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };
  
  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ─── Current guide text ───────────────────────────────────────────────────────
  const guideText =
    loading
      ? "Listening to the sanctuary…"
      : activeTab === 0
      ? aiContent.advice || FALLBACK.advice
      : activeTab === 1
      ? aiContent.reflection || FALLBACK.reflection
      : aiContent.status || FALLBACK.status;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* Background */}
      <div style={{ ...S.bgLayer, backgroundImage: `url(${bgImg})` }} />

      {/* Three.js canvas */}
      <canvas ref={canvasRef} style={S.threeCanvas} />

      {/* Vignette — stronger on the right to blend into panel */}
      <div style={S.vignette} />

      {/* ── Fox (left / centre of scene) ─────────────────────────────────────── */}
      <div ref={foxRef} style={S.foxWrap} onClick={foxReact} title="Click to interact">
        <img src={companionImg} alt={`${companionName} companion`} style={S.foxImg} />
      </div>

      {/* ── Right Panel ───────────────────────────────────────────────────────── */}
      <div ref={panelRef} style={S.panel}>

        {/* Fox header */}
        <div style={S.foxHeader}>
          <img src={companionImg} alt={`${companionName} avatar`} style={S.foxAvatar} />
          <div style={S.foxMeta}>
            <div style={S.foxName}>{companionName}</div>
            <div style={S.foxMood}>{companionMood}</div>
          </div>
          <div style={S.hearts}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} style={{ color: i < hearts ? "#e05c7a" : "rgba(255,255,255,0.2)", fontSize: 14 }}>
                ♥
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={S.divider} />

        {/* Tab switcher */}
        <div style={S.tabRow}>
          {PANEL_TABS.map((label, i) => (
            <button
              key={label}
              style={{ ...S.tabBtn, ...(activeTab === i ? S.tabBtnActive : {}) }}
              onClick={() => handleTabClick(i)}
            >
              <span style={S.tabIcon}>
                {i === 0 ? "✦" : i === 1 ? "▣" : "❧"}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* AI Guide block */}
        <div style={S.aiBlock}>
          <div style={S.aiHeader}>
            <span style={S.aiLabel}>AI Guide</span>
            <span style={{ ...S.aiLive, color: loading ? "#ffd54f" : "#7ec8a0" }}>
              {liveLabel}
            </span>
          </div>
          <p style={S.aiText}>"{guideText}"</p>
          {!loading && !aiContent[["advice","reflection","status"][activeTab]] && (
            <p style={S.aiError}>Unable to connect to sanctuary. Please try again.</p>
          )}
        </div>

        {/* Metric insight rows — shown only on Today tab */}
        {activeTab === 0 && (
          <div style={S.insightList}>
            {getMetricInsights(aiContent).map((m) => (
              <div key={m.key} style={S.insightRow}>
                <div style={{ ...S.insightIconWrap, boxShadow: `0 0 10px ${m.glow}`, border: `1px solid ${m.color}55` }}>
                  <img src={m.icon} alt={m.label} style={S.insightIcon} />
                </div>
                <div style={S.insightText}>
                  <div style={{ ...S.insightLabel, color: m.color }}>{m.label}</div>
                  <div style={S.insightDetail}>{m.insight}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reflection / Status / Chat content when not on Today tab */}
        {activeTab !== 0 && (
          <div style={S.altContent}>
            {activeTab === 1 ? (
              <p style={S.altText}>
                Your weekly chronicle is written in the stars above the sanctuary.
                Each day you logged, a firefly was born.
              </p>
            ) : (
              /* Chat Interface for Status Tab */
              <div style={S.chatContainer}>
                {/* Status Grid at top */}
                <div style={S.statusGridCompact}>
                  {[
                    { label: "Wellness", value: "78%" },
                    { label: "Season", value: "Autumn" },
                    { label: "Day", value: `#${logs?.length ?? 42}` },
                    { label: "Resonance", value: "94%" },
                  ].map((s) => (
                    <div key={s.label} style={S.statusCellCompact}>
                      <div style={S.statusValCompact}>{s.value}</div>
                      <div style={S.statusLblCompact}>{s.label}</div>
                    </div>
                  ))}
                </div>
                
                {/* Chat Messages */}
                <div ref={chatContainerRef} style={S.chatMessages}>
                  {chatMessages.map((msg) => (
                    <div key={msg.id} style={{
                      ...S.chatMessage,
                      ...(msg.type === 'user' ? S.chatMessageUser : S.chatMessageCompanion)
                    }}>
                      <div style={{
                        ...S.chatBubble,
                        ...(msg.type === 'user' ? S.chatBubbleUser : S.chatBubbleCompanion)
                      }}>
                        <div style={S.chatText}>{msg.message}</div>
                        <div style={S.chatTime}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing indicator */}
                  {chatLoading && (
                    <div style={{ ...S.chatMessage, ...S.chatMessageCompanion }}>
                      <div style={{ ...S.chatBubble, ...S.chatBubbleCompanion }}>
                        <div style={S.typingIndicator}>
                          <span style={S.typingDot}>•</span>
                          <span style={S.typingDot}>•</span>
                          <span style={S.typingDot}>•</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat Input */}
                <div style={S.chatInputContainer}>
                  <div style={S.chatInputWrapper}>
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      placeholder={`Chat with ${companionName}...`}
                      style={S.chatInput}
                      rows={1}
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={!chatInput.trim() || chatLoading}
                      style={{
                        ...S.chatSendBtn,
                        ...((!chatInput.trim() || chatLoading) ? S.chatSendBtnDisabled : {})
                      }}
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom tab bar inside panel */}
        <div style={S.bottomBar}>
          {[
            { icon: "✦", label: "Today's\nAdvice" },
            { icon: "▣", label: "Weekly\nReflection" },
            { icon: "❧", label: "Chat &\nStatus" },
          ].map((item, i) => (
            <button
              key={i}
              style={{ ...S.bottomBtn, ...(activeTab === i ? S.bottomBtnActive : {}) }}
              onClick={() => handleTabClick(i)}
            >
              <span style={S.bottomIcon}>{item.icon}</span>
              <span style={S.bottomLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Cinzel', 'Palatino Linotype', serif",
    userSelect: "none",
    display: "flex",
  },
  bgLayer: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    zIndex: 0,
  },
  threeCanvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
    pointerEvents: "none",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    pointerEvents: "none",
    background:
      "radial-gradient(ellipse at 35% 60%, transparent 20%, rgba(0,0,0,0.45) 80%), " +
      "linear-gradient(to right, transparent 50%, rgba(4,8,22,0.82) 78%, rgba(4,8,22,0.97) 100%)",
  },

  // ── Fox scene ──────────────────────────────────────────────────────────────
  foxWrap: {
    position: "absolute",
    bottom: "4%",
    left: "4%",
    zIndex: 8,
    cursor: "pointer",
    transformOrigin: "bottom center",
    opacity: 0,
  },
  foxImg: {
    width: "clamp(280px, 48vw, 700px)",
    height: "auto",
    display: "block",
    filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.7))",
  },

  // ── Right Panel ────────────────────────────────────────────────────────────
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "clamp(300px, 28vw, 380px)",
    height: "100vh",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    background: "rgba(4, 8, 22, 0.82)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderLeft: "1px solid rgba(120, 170, 255, 0.14)",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "none",
    opacity: 0,
    padding: "0 0 0 0",
  },

  // Fox header
  foxHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 20px 0 20px",
    flexShrink: 0,
  },
  foxAvatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid rgba(255,180,80,0.5)",
    filter: "drop-shadow(0 0 8px rgba(255,160,60,0.5))",
    flexShrink: 0,
  },
  foxMeta: {
    flex: 1,
    minWidth: 0,
  },
  foxName: {
    color: "#f0e6d0",
    fontSize: 18,
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    letterSpacing: "0.06em",
    lineHeight: 1.2,
  },
  foxMood: {
    color: "rgba(200,210,230,0.6)",
    fontSize: 12,
    fontFamily: "'Palatino Linotype', serif",
    fontStyle: "italic",
    marginTop: 2,
  },
  hearts: {
    display: "flex",
    gap: 3,
    flexShrink: 0,
  },

  divider: {
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(120,170,255,0.2), transparent)",
    margin: "16px 20px",
    flexShrink: 0,
  },

  // Tab switcher
  tabRow: {
    display: "flex",
    gap: 6,
    padding: "0 20px",
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "rgba(180,200,230,0.55)",
    fontSize: 12,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.04em",
    padding: "8px 4px",
    cursor: "pointer",
    transition: "all 0.25s",
    outline: "none",
  },
  tabBtnActive: {
    background: "rgba(80,140,255,0.18)",
    border: "1px solid rgba(100,160,255,0.35)",
    color: "#c8e6ff",
    boxShadow: "0 0 12px rgba(80,140,255,0.2)",
  },
  tabIcon: {
    fontSize: 11,
    opacity: 0.8,
  },

  // AI Guide block
  aiBlock: {
    margin: "16px 20px 0 20px",
    background: "rgba(10,18,40,0.6)",
    border: "1px solid rgba(120,170,255,0.15)",
    borderRadius: 12,
    padding: "14px 16px",
    flexShrink: 0,
  },
  aiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  aiLabel: {
    color: "rgba(180,200,240,0.5)",
    fontSize: 10,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
  aiLive: {
    fontSize: 10,
    fontFamily: "'Palatino Linotype', serif",
    fontStyle: "italic",
    letterSpacing: "0.04em",
    transition: "color 0.4s",
  },
  aiText: {
    color: "#d8ecff",
    fontSize: 13,
    fontFamily: "'Palatino Linotype', serif",
    fontStyle: "italic",
    lineHeight: 1.75,
    margin: 0,
    textShadow: "0 0 16px rgba(120,180,255,0.3)",
  },
  aiError: {
    color: "rgba(255,150,150,0.6)",
    fontSize: 11,
    fontFamily: "'Palatino Linotype', serif",
    marginTop: 8,
    fontStyle: "italic",
  },

  // Metric insight rows
  insightList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    margin: "12px 20px 0 20px",
    flex: 1,
    overflowY: "auto",
    scrollbarWidth: "none",
  },
  insightRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 0,
  },
  insightIcon: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },
  insightText: {
    flex: 1,
    minWidth: 0,
  },
  insightLabel: {
    fontSize: 10,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: 3,
    fontWeight: 600,
  },
  insightDetail: {
    color: "rgba(200,215,240,0.7)",
    fontSize: 12,
    fontFamily: "'Palatino Linotype', serif",
    lineHeight: 1.5,
  },

  // Alt content (reflection / status)
  altContent: {
    flex: 1,
    padding: "16px 20px",
    overflowY: "auto",
    scrollbarWidth: "none",
    display: "flex",
    flexDirection: "column",
  },
  altText: {
    color: "rgba(200,220,255,0.7)",
    fontSize: 13,
    fontFamily: "'Palatino Linotype', serif",
    fontStyle: "italic",
    lineHeight: 1.75,
    margin: 0,
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 8,
  },
  statusCell: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "14px 12px",
    textAlign: "center",
  },
  statusVal: {
    color: "#c8e6ff",
    fontSize: 20,
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    marginBottom: 4,
  },
  statusLbl: {
    color: "rgba(180,200,230,0.5)",
    fontSize: 10,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  
  // Chat styles
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: 12,
  },
  statusGridCompact: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 6,
    marginBottom: 8,
    flexShrink: 0,
  },
  statusCellCompact: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    padding: "8px 4px",
    textAlign: "center",
  },
  statusValCompact: {
    color: "#c8e6ff",
    fontSize: 14,
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    marginBottom: 2,
  },
  statusLblCompact: {
    color: "rgba(180,200,230,0.5)",
    fontSize: 8,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    scrollbarWidth: "none",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "8px 0",
    minHeight: 0,
  },
  chatMessage: {
    display: "flex",
    width: "100%",
  },
  chatMessageUser: {
    justifyContent: "flex-end",
  },
  chatMessageCompanion: {
    justifyContent: "flex-start",
  },
  chatBubble: {
    maxWidth: "85%",
    padding: "10px 12px",
    borderRadius: 12,
    position: "relative",
  },
  chatBubbleUser: {
    background: "rgba(80,140,255,0.2)",
    border: "1px solid rgba(100,160,255,0.3)",
    color: "#e6f3ff",
  },
  chatBubbleCompanion: {
    background: "rgba(255,180,60,0.15)",
    border: "1px solid rgba(255,180,60,0.25)",
    color: "#f0e6d0",
  },
  chatText: {
    fontSize: 12,
    fontFamily: "'Palatino Linotype', serif",
    lineHeight: 1.4,
    margin: 0,
  },
  chatTime: {
    fontSize: 9,
    opacity: 0.5,
    marginTop: 4,
    textAlign: "right",
    fontFamily: "'Cinzel', serif",
  },
  chatInputContainer: {
    flexShrink: 0,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 12,
  },
  chatInputWrapper: {
    display: "flex",
    gap: 8,
    alignItems: "flex-end",
  },
  chatInput: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#e6f3ff",
    fontSize: 12,
    fontFamily: "'Palatino Linotype', serif",
    padding: "8px 12px",
    resize: "none",
    outline: "none",
    transition: "border-color 0.2s",
    minHeight: 32,
    maxHeight: 80,
  },
  chatSendBtn: {
    background: "rgba(80,140,255,0.2)",
    border: "1px solid rgba(100,160,255,0.3)",
    borderRadius: 8,
    color: "#c8e6ff",
    fontSize: 14,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
    minWidth: 40,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chatSendBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  typingIndicator: {
    display: "flex",
    gap: 3,
    alignItems: "center",
  },
  typingDot: {
    fontSize: 16,
    animation: "pulse 1.5s ease-in-out infinite",
    opacity: 0.4,
  },

  // Bottom bar inside panel
  bottomBar: {
    display: "flex",
    borderTop: "1px solid rgba(120,170,255,0.12)",
    background: "rgba(4, 8, 22, 0.9)",
    flexShrink: 0,
    marginTop: "auto",
  },
  bottomBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "12px 4px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    outline: "none",
    transition: "background 0.2s",
    borderTop: "2px solid transparent",
  },
  bottomBtnActive: {
    background: "rgba(80,140,255,0.12)",
    borderTop: "2px solid rgba(100,160,255,0.5)",
  },
  bottomIcon: {
    fontSize: 16,
    color: "rgba(180,210,255,0.7)",
  },
  bottomLabel: {
    color: "rgba(160,190,230,0.6)",
    fontSize: 9,
    fontFamily: "'Cinzel', serif",
    letterSpacing: "0.06em",
    textAlign: "center",
    whiteSpace: "pre-line",
    lineHeight: 1.3,
  },
};

// Add CSS animation for typing indicator
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
`;
document.head.appendChild(style);