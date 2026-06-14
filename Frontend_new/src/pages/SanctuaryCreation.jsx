import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSanctuaryStore } from "../store/useSanctuaryStore";
// Polyfill `process` for browser bundles that reference it (e.g., some deps)
if (typeof process === "undefined") {
  // eslint-disable-next-line no-undef
  window.process = { env: {} };
}

const IMG_BG          = "/assets/SanctuaryCreationBG.webp";
const IMG_FOX_IDLE    = "/assets/Characters/Fox/fox_idle_clean.webp";
const IMG_FOX_BLINK   = "/assets/Characters/Fox/fox_blinking_clean.webp";
const IMG_OWL_IDLE    = "/assets/Characters/Owl/Owl_Idle.webp";
const IMG_OWL_FLAP    = "/assets/Characters/Owl/Owl_Flap.webp";
const IMG_TURTLE_IDLE = "/assets/screen2/Trutle.jpg";
const IMG_DEER_IDLE   = "/assets/screen2/Deer_idle.webp";
const IMG_CRYSTAL_FOREST = "/assets/objects/crystals_forest.jpg";
const IMG_CRYSTAL_ISLAND = "/assets/objects/crystals_island.jpg";
const IMG_CRYSTAL_MOUNTAIN = "/assets/objects/crystals_mountain.jpg";
const IMG_REFERENCE = "/reference/SanctuaryCreation.webp";
const SANCTUARY_LAYOUT = {
  fox: { x:131, y:283, width:403, height:603 },

  owl: { x:15, y:414, width:330, height:385 },

  crystalForest: { x:207, y:103, width:389, height:271 },

  crystalIsland: { x:543, y:98, width:414, height:276 },

  crystalMountain: { x:884, y:104, width:384, height:259 },

  deer: { x:1196, y:324, width:280, height:350 }
};
export default function SanctuaryCreation() {
  const navigate = useNavigate();
  const [selectedEnv, setSelectedEnv]             = useState(null);
  const [selectedGoals, setSelectedGoals]         = useState([]);
  const [selectedCompanion, setSelectedCompanion] = useState(null);
  const [foxFrame, setFoxFrame]   = useState("idle");
  const [owlFrame, setOwlFrame]   = useState("idle");
  const [fireflies, setFireflies] = useState([]);
  const [continueHover, setContinueHover] = useState(false);
  const [crystalTick, setCrystalTick]     = useState(0);
  const [hoveredGoal, setHoveredGoal]     = useState(null);
  const [assetPositions, setAssetPositions] = useState({ fox: { x: 100, y: 100, isDragging: false, isFixed: false } });
  const setSanctuarySetup = useSanctuaryStore(s => s.setSanctuarySetup);

  const environments = [
    { id:"forest",   label:"Forest",   crystal:"/assets/objects/crystals_forest.jpg",   color:"#4ade80", glow:"#22c55e" },
    { id:"island",   label:"Island",   crystal:"/assets/objects/crystals_island.jpg",   color:"#60a5fa", glow:"#3b82f6" },
    { id:"mountain", label:"Mountain", crystal:"/assets/objects/crystals_mountain.jpg", color:"#e2e8f0", glow:"#cbd5e1" },
  ];

  const goals = [
    { id:"sleep",     label:"Sleep Better",       icon:"/assets/CompanionScreen/Sleep.webp",      color:"#818cf8" },
    { id:"hydrate",   label:"Hydrate More",       icon:"/assets/CompanionScreen/Hydrate.webp",    color:"#38bdf8" },
    { id:"exercise",  label:"Exercise More",      icon:"/assets/CompanionScreen/Exercise.webp",   color:"#fb923c" },
    { id:"nutrition", label:"Improve Nutrition",  icon:"/assets/CompanionScreen/Nutrients.webp",  color:"#f87171" },
    { id:"stress",    label:"Reduce Stress",      icon:"/assets/CompanionScreen/ReduceStress.webp",color:"#c084fc" },
  ];

  // fireflies
  useEffect(() => {
    setFireflies(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 10 + Math.random() * 75,
      size: 2 + Math.random() * 3,
      dur: 5 + Math.random() * 8,
      delay: Math.random() * 6,
      dx: (Math.random() - 0.5) * 140,
      dy: (Math.random() - 0.5) * 90,
      op: 0.5 + Math.random() * 0.5,
    })));
  }, []);

  // fox blink
  useEffect(() => {
    const t = setInterval(() => {
      setFoxFrame("blink");
      setTimeout(() => setFoxFrame("idle"), 200);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(t);
  }, []);

  // owl flap
  useEffect(() => {
    const t = setInterval(() => {
      setOwlFrame("flap");
      setTimeout(() => setOwlFrame("idle"), 250);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(t);
  }, []);

  // crystal animation tick
  useEffect(() => {
    const t = setInterval(() => setCrystalTick(prev => prev + 1), 16);
    return () => clearInterval(t);
  }, []);

  const handleEnvSelect = (envId) => {
    setSelectedEnv(envId);
  };

  const toggleGoal = (goalId) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const sel = environments.find(e => e.id === selectedEnv);
  const canContinue = selectedEnv && selectedGoals.length > 0 && selectedCompanion;

  return (
    <div style={{
      position:"relative", width:"100vw", height:"100vh",
      overflow:"hidden", fontFamily:"Georgia,serif", userSelect:"none",
    }}>
      {/* BG */}
      <div style={{ position:"absolute", inset:0 }}>
        <img src={IMG_BG} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }} />
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 90% 90% at 50% 45%, transparent 25%, rgba(0,0,12,0.6) 100%)" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%", background:"linear-gradient(to top, rgba(0,0,15,0.88) 0%, transparent 100%)" }} />
      </div>

      {/* Mist */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1 }}>
        <img src="/assets/effects/mist.webp" alt="" style={{ position:"absolute", bottom:"18%", left:0, width:"110%", opacity:0.22, animation:"mistA 20s ease-in-out infinite alternate" }} />
        <img src="/assets/effects/mist.webp" alt="" style={{ position:"absolute", bottom:"8%",  right:0, width:"85%",  opacity:0.15, animation:"mistB 28s ease-in-out infinite alternate-reverse" }} />
      </div>

      {/* Fireflies */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:2 }}>
        {fireflies.map(ff => (
          <div key={ff.id} style={{
            position:"absolute", left:`${ff.x}%`, top:`${ff.y}%`,
            width:ff.size, height:ff.size, borderRadius:"50%",
            background:"#fef08a",
            boxShadow:`0 0 ${ff.size*3}px #fef08a, 0 0 ${ff.size*6}px #fde047`,
            animation:`ff ${ff.dur}s ${ff.delay}s ease-in-out infinite`,
            "--dx":`${ff.dx}px`, "--dy":`${ff.dy}px`, "--op":ff.op,
          }} />
        ))}
      </div>

      {/* Title */}
      <div style={{ position:"absolute", top:0, left:0, right:0, textAlign:"center", paddingTop:"2.5vh", zIndex:10 }}>
        <h1 style={{
          margin:0, fontWeight:"normal", letterSpacing:"0.1em",
          fontSize:"clamp(1.6rem,3.2vw,2.6rem)",
          color:"#fef3c7",
          textShadow:"0 0 30px rgba(251,191,36,0.8), 0 0 60px rgba(251,191,36,0.35), 2px 2px 8px rgba(0,0,0,0.9)",
        }}>── Sanctuary Creation ──</h1>
        <p style={{
          margin:"5px 0 0", letterSpacing:"0.05em",
          fontSize:"clamp(0.7rem,1.2vw,0.9rem)",
          color:"#bfdbfe",
          textShadow:"0 0 12px rgba(147,197,253,0.5), 1px 1px 4px rgba(0,0,0,0.8)",
        }}>Choose your environment · choose your guide · set your goals</p>
      </div>

      {/* ─── CRYSTALS ROW ─── */}
      {/* Forest Crystal */}
      <div onClick={() => handleEnvSelect("forest")}
        style={{
          position:"absolute",
          left:"207px",
          top:"103px",
          width:"389px",
          height:"271px",
          cursor:"pointer",
          zIndex:10,
          filter: selectedEnv === "forest"
            ? "drop-shadow(0 0 18px #22c55e) drop-shadow(0 0 36px #22c55e88)"
            : "drop-shadow(0 0 6px #22c55e55)",
          transform: selectedEnv === "forest" ? "scale(1.05)" : "scale(1)",
          transition:"all 0.3s ease",
        }}
      >
        <img src={IMG_CRYSTAL_FOREST} alt="Forest" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      </div>
      {/* Forest Label */}
      <div style={{
        position:"absolute",
        left:"207px",
        top:"384px",
        width:"389px",
        textAlign:"center",
        zIndex:10,
      }}>
        <div style={{
          display:"inline-block",
          padding:"4px 18px", 
          borderRadius:20,
          background: "transparent",
          border:`1.5px solid ${selectedEnv === "forest" ? "#22c55e" : "rgba(255,255,255,0.18)"}`,
          color: selectedEnv === "forest" ? "#4ade80" : "#cbd5e1",
          fontSize:"clamp(0.65rem,0.95vw,0.8rem)", 
          letterSpacing:"0.1em",
          textShadow: selectedEnv === "forest" ? "0 0 10px #22c55e" : "none",
          transition:"all 0.3s",
        }}>Forest</div>
      </div>

      {/* Island Crystal */}
      <div onClick={() => handleEnvSelect("island")}
        style={{
          position:"absolute",
          left:"543px",
          top:"98px",
          width:"414px",
          height:"276px",
          cursor:"pointer",
          zIndex:10,
          filter: selectedEnv === "island"
            ? "drop-shadow(0 0 18px #3b82f6) drop-shadow(0 0 36px #3b82f688)"
            : "drop-shadow(0 0 6px #3b82f655)",
          transform: selectedEnv === "island" ? "scale(1.05)" : "scale(1)",
          transition:"all 0.3s ease",
        }}
      >
        <img src={IMG_CRYSTAL_ISLAND} alt="Island" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      </div>
      {/* Island Label */}
      <div style={{
        position:"absolute",
        left:"543px",
        top:"384px",
        width:"414px",
        textAlign:"center",
        zIndex:10,
      }}>
        <div style={{
          display:"inline-block",
          padding:"4px 18px", 
          borderRadius:20,
          background: "transparent",
          border:`1.5px solid ${selectedEnv === "island" ? "#3b82f6" : "rgba(255,255,255,0.18)"}`,
          color: selectedEnv === "island" ? "#60a5fa" : "#cbd5e1",
          fontSize:"clamp(0.65rem,0.95vw,0.8rem)", 
          letterSpacing:"0.1em",
          textShadow: selectedEnv === "island" ? "0 0 10px #3b82f6" : "none",
          transition:"all 0.3s",
        }}>Island</div>
      </div>

      {/* Mountain Crystal */}
      <div onClick={() => handleEnvSelect("mountain")}
        style={{
          position:"absolute",
          left:"884px",
          top:"104px",
          width:"384px",
          height:"259px",
          cursor:"pointer",
          zIndex:10,
          filter: selectedEnv === "mountain"
            ? "drop-shadow(0 0 18px #cbd5e1) drop-shadow(0 0 36px #cbd5e188)"
            : "drop-shadow(0 0 6px #cbd5e155)",
          transform: selectedEnv === "mountain" ? "scale(1.05)" : "scale(1)",
          transition:"all 0.3s ease",
        }}
      >
        <img src={IMG_CRYSTAL_MOUNTAIN} alt="Mountain" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      </div>
      {/* Mountain Label */}
      <div style={{
        position:"absolute",
        left:"884px",
        top:"373px",
        width:"384px",
        textAlign:"center",
        zIndex:10,
      }}>
        <div style={{
          display:"inline-block",
          padding:"4px 18px", 
          borderRadius:20,
          background: "transparent",
          border:`1.5px solid ${selectedEnv === "mountain" ? "#cbd5e1" : "rgba(255,255,255,0.18)"}`,
          color: selectedEnv === "mountain" ? "#e2e8f0" : "#cbd5e1",
          fontSize:"clamp(0.65rem,0.95vw,0.8rem)", 
          letterSpacing:"0.1em",
          textShadow: selectedEnv === "mountain" ? "0 0 10px #cbd5e1" : "none",
          transition:"all 0.3s",
        }}>Mountain</div>
      </div>

      {/* ─── POOL AREA (center, mid-height) ─── */}
      <div style={{
        position:"absolute",
        top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        width:"clamp(200px,30vw,400px)",
        height:"clamp(120px,18vw,240px)",
        zIndex:8,
      }}>
        {/* Pool glow */}
        <div style={{
          position:"absolute", inset:0, borderRadius:"50%",
          background: sel
            ? `radial-gradient(ellipse, ${sel.glow}44 0%, transparent 70%)`
            : "radial-gradient(ellipse, rgba(96,165,250,0.25) 0%, transparent 70%)",
          filter:"blur(10px)",
          transition:"background 0.5s",
          animation:"poolPulse 3s ease-in-out infinite",
        }} />

        {/* Rune dots */}
        {selectedGoals.map((gid, i) => {
          const g = goals.find(x => x.id === gid);
          const a2 = (i / selectedGoals.length) * Math.PI * 2 - Math.PI / 2;
          const rx=46, ry=36;
          return (
            <div key={gid} style={{
              position:"absolute",
              left:`${50 + rx*Math.cos(a2)}%`, top:`${50 + ry*Math.sin(a2)}%`,
              transform:"translate(-50%,-50%)",
              width:10, height:10, borderRadius:"50%",
              background:g.color,
              boxShadow:`0 0 14px ${g.color}, 0 0 28px ${g.color}`,
              animation:"runeGlow 2s ease-in-out infinite",
            }} />
          );
        })}
      </div>

      {/* ─── COMPANIONS ─── */}
      {/* Fox — positioned to match editor reference */}
      <div onClick={() => setSelectedCompanion("fox")}
        style={{
          position:"absolute",
          left:"131px",
          top:"283px",
          width:"403px",
          height:"603px",
          cursor:"pointer",
          zIndex:12,
          filter: selectedCompanion==="fox"
            ? "drop-shadow(0 0 16px #ff8c42) drop-shadow(0 0 32px #ff6b1a)"
            : "drop-shadow(0 0 5px rgba(255,140,66,0.3))",
          transform: selectedCompanion==="fox" ? "scale(1.1)" : "scale(1)",
          transition:"all 0.4s ease",
        }}
      >
        <img
          src={foxFrame==="idle" ? IMG_FOX_IDLE : IMG_FOX_BLINK}
          alt="Fox"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain"
          }}
        />
        {selectedCompanion==="fox" && (
          <div style={{ textAlign:"center", color:"#ffb885", fontSize:"0.65rem", marginTop:3, textShadow:"0 0 8px #ff8c42" }}>Fox ✦</div>
        )}
      </div>

      {/* Owl — positioned using extracted coordinates */}
      <div onClick={() => setSelectedCompanion("owl")}
        style={{
          position:"absolute",
          left:"15px",
          top:"414px",
          width:"330px",
          height:"385px",
          cursor:"pointer",
          zIndex:12,
          filter: selectedCompanion==="owl"
            ? "drop-shadow(0 0 16px #93c5fd) drop-shadow(0 0 32px #60a5fa)"
            : "drop-shadow(0 0 5px rgba(147,197,253,0.3))",
          transform: selectedCompanion==="owl" ? "scale(1.1)" : "scale(1)",
          transition:"all 0.4s ease",
          animation:"bobY 2.8s 1.1s ease-in-out infinite",
        }}
      >
        <img src={owlFrame==="idle" ? IMG_OWL_IDLE : IMG_OWL_FLAP} alt="Owl" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
        {selectedCompanion==="owl" && (
          <div style={{ textAlign:"center", color:"#bfdbfe", fontSize:"0.65rem", marginTop:3, textShadow:"0 0 8px #60a5fa" }}>Owl ✦</div>
        )}
      </div>

      {/* Red Panda — positioned using extracted coordinates */}
      <div onClick={() => setSelectedCompanion("panda")}
        style={{
          position:"absolute",
          left:"985px",
          top:"494px",
          width:"263px",
          height:"275px",
          cursor:"pointer",
          zIndex:12,
          filter: selectedCompanion==="panda"
            ? "drop-shadow(0 0 16px #fb7185) drop-shadow(0 0 32px #f43f5e)"
            : "drop-shadow(0 0 5px rgba(251,113,133,0.3))",
          transform: selectedCompanion==="panda" ? "scale(1.1)" : "scale(1)",
          transition:"all 0.4s ease",
          animation:"bobY 5s 2s ease-in-out infinite",
        }}
      >
        <img src={IMG_TURTLE_IDLE} alt="Red Panda" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
        {selectedCompanion==="panda" && (
          <div style={{ textAlign:"center", color:"#fda4af", fontSize:"0.65rem", marginTop:3, textShadow:"0 0 8px #fb7185" }}>Red Panda ✦</div>
        )}
      </div>

      {/* Turtle — positioned using extracted coordinates - CLICKABLE COMPANION */}
      <div onClick={() => setSelectedCompanion("turtle")}
        style={{
          position:"absolute",
          left:"1200px",
          top:"600px",
          width:"200px",
          height:"200px",
          cursor:"pointer",
          zIndex:12,
          filter: selectedCompanion==="turtle"
            ? "drop-shadow(0 0 16px #86efac) drop-shadow(0 0 32px #4ade80)"
            : "drop-shadow(0 0 5px rgba(134,239,172,0.3))",
          transform: selectedCompanion==="turtle" ? "scale(1.1)" : "scale(1)",
          transition:"all 0.4s ease",
          animation:"bobY 5s 2s ease-in-out infinite",
        }}
      >
        <img src={IMG_DEER_IDLE} alt="Turtle" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
        {selectedCompanion==="turtle" && (
          <div style={{ textAlign:"center", color:"#bbf7d0", fontSize:"0.65rem", marginTop:3, textShadow:"0 0 8px #4ade80" }}>Turtle ✦</div>
        )}
      </div>

      {/* ─── GOAL ICONS ─── */}
      {/* Sleep Goal */}
      <div onClick={() => toggleGoal("sleep")}
           onMouseEnter={() => setHoveredGoal("sleep")}
           onMouseLeave={() => setHoveredGoal(null)}
        style={{
          position:"absolute",
          left:"449px",
          top:"418px",
          width:"154px",
          height:"140px",
          cursor:"pointer",
          zIndex:20,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}
      >
        <img
          src="/assets/CompanionScreen/Sleep.webp"
          alt="Sleep"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain",
            filter: selectedGoals.includes("sleep")
              ? "drop-shadow(0 0 15px #818cf8)"
              : "none",
            transition:"all 0.3s ease"
          }}
        />
        {hoveredGoal === "sleep" && (
          <div style={{
            position:"absolute", top:"-35px", left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.8)", color:"#818cf8", padding:"4px 8px", borderRadius:4,
            fontSize:"0.7rem", whiteSpace:"nowrap", pointerEvents:"none",
            textShadow:"0 0 8px #818cf8",
          }}>Sleep Better</div>
        )}
      </div>

      {/* Hydrate Goal */}
      <div onClick={() => toggleGoal("hydrate")}
           onMouseEnter={() => setHoveredGoal("hydrate")}
           onMouseLeave={() => setHoveredGoal(null)}
        style={{
          position:"absolute",
          left:"566px",
          top:"418px",
          width:"155px",
          height:"142px",
          cursor:"pointer",
          zIndex:20,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}
      >
        <img
          src="/assets/CompanionScreen/Hydrate.webp"
          alt="Hydrate"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain",
            filter: selectedGoals.includes("hydrate")
              ? "drop-shadow(0 0 15px #38bdf8)"
              : "none",
            transition:"all 0.3s ease"
          }}
        />
        {hoveredGoal === "hydrate" && (
          <div style={{
            position:"absolute", top:"-35px", left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.8)", color:"#38bdf8", padding:"4px 8px", borderRadius:4,
            fontSize:"0.7rem", whiteSpace:"nowrap", pointerEvents:"none",
            textShadow:"0 0 8px #38bdf8",
          }}>Hydrate More</div>
        )}
      </div>

      {/* Exercise Goal */}
      <div onClick={() => toggleGoal("exercise")}
           onMouseEnter={() => setHoveredGoal("exercise")}
           onMouseLeave={() => setHoveredGoal(null)}
        style={{
          position:"absolute",
          left:"682px",
          top:"414px",
          width:"152px",
          height:"154px",
          cursor:"pointer",
          zIndex:20,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}
      >
        <img
          src="/assets/CompanionScreen/Exercise.webp"
          alt="Exercise"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain",
            filter: selectedGoals.includes("exercise")
              ? "drop-shadow(0 0 15px #fb923c)"
              : "none",
            transition:"all 0.3s ease"
          }}
        />
        {hoveredGoal === "exercise" && (
          <div style={{
            position:"absolute", top:"-35px", left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.8)", color:"#fb923c", padding:"4px 8px", borderRadius:4,
            fontSize:"0.7rem", whiteSpace:"nowrap", pointerEvents:"none",
            textShadow:"0 0 8px #fb923c",
          }}>Exercise More</div>
        )}
      </div>

      {/* Nutrition Goal */}
      <div onClick={() => toggleGoal("nutrition")}
           onMouseEnter={() => setHoveredGoal("nutrition")}
           onMouseLeave={() => setHoveredGoal(null)}
        style={{
          position:"absolute",
          left:"794px",
          top:"418px",
          width:"154px",
          height:"140px",
          cursor:"pointer",
          zIndex:20,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}
      >
        <img
          src="/assets/CompanionScreen/Nutrients.webp"
          alt="Nutrition"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain",
            filter: selectedGoals.includes("nutrition")
              ? "drop-shadow(0 0 15px #f87171)"
              : "none",
            transition:"all 0.3s ease"
          }}
        />
        {hoveredGoal === "nutrition" && (
          <div style={{
            position:"absolute", top:"-35px", left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.8)", color:"#f87171", padding:"4px 8px", borderRadius:4,
            fontSize:"0.7rem", whiteSpace:"nowrap", pointerEvents:"none",
            textShadow:"0 0 8px #f87171",
          }}>Improve Nutrition</div>
        )}
      </div>

      {/* Stress Goal */}
      <div onClick={() => toggleGoal("stress")}
           onMouseEnter={() => setHoveredGoal("stress")}
           onMouseLeave={() => setHoveredGoal(null)}
        style={{
          position:"absolute",
          left:"917px",
          top:"418px",
          width:"154px",
          height:"140px",
          cursor:"pointer",
          zIndex:20,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}
      >
        <img
          src="/assets/CompanionScreen/ReduceStress.webp"
          alt="Stress"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain",
            filter: selectedGoals.includes("stress")
              ? "drop-shadow(0 0 15px #c084fc)"
              : "none",
            transition:"all 0.3s ease"
          }}
        />
        {hoveredGoal === "stress" && (
          <div style={{
            position:"absolute", top:"-35px", left:"50%", transform:"translateX(-50%)",
            background:"rgba(0,0,0,0.8)", color:"#c084fc", padding:"4px 8px", borderRadius:4,
            fontSize:"0.7rem", whiteSpace:"nowrap", pointerEvents:"none",
            textShadow:"0 0 8px #c084fc",
          }}>Reduce Stress</div>
        )}
      </div>

      {/* ─── CONTINUE BUTTON ─── */}
      <div style={{ position:"absolute", bottom:"clamp(10px,2vh,22px)", left:"50%", transform:"translateX(-50%)", zIndex:20, textAlign:"center" }}>
        <button
          onClick={() => {
            if (!canContinue) return;
            setSanctuarySetup({ environment: selectedEnv, companion: selectedCompanion, goals: selectedGoals })
              .then(() => {
                navigate("/sanctuaryworld");
              })
              .catch(err => {
                console.error('Failed to setup sanctuary:', err);
                // Navigate anyway if setup fails
                navigate("/sanctuaryworld");
              });
          }}
          onMouseEnter={() => setContinueHover(true)}
          onMouseLeave={() => setContinueHover(false)}
          style={{
            padding:"clamp(8px,1.2vh,13px) clamp(36px,5vw,76px)",
            borderRadius:40,
            border: canContinue
              ? `2px solid ${continueHover ? "#86efac" : "#4ade80"}`
              : "2px solid rgba(255,255,255,0.12)",
            background: canContinue
              ? continueHover
                ? "linear-gradient(135deg,rgba(34,197,94,0.5),rgba(16,185,129,0.4))"
                : "linear-gradient(135deg,rgba(34,197,94,0.3),rgba(16,185,129,0.25))"
              : "rgba(0,0,0,0.4)",
            color: canContinue ? "#bbf7d0" : "rgba(255,255,255,0.28)",
            fontSize:"clamp(0.82rem,1.3vw,1rem)", letterSpacing:"0.18em",
            cursor: canContinue ? "pointer" : "not-allowed",
            boxShadow: canContinue
              ? continueHover
                ? "0 0 28px rgba(34,197,94,0.7),0 0 56px rgba(34,197,94,0.35)"
                : "0 0 18px rgba(34,197,94,0.4),0 0 36px rgba(34,197,94,0.2)"
              : "none",
            transform: continueHover && canContinue ? "scale(1.04)" : "scale(1)",
            transition:"all 0.3s ease",
            backdropFilter:"blur(8px)",
            fontFamily:"Georgia,serif",
          }}
        >Continue</button>
        {!canContinue && (
          <div style={{ marginTop:4, fontSize:"0.58rem", color:"rgba(148,163,184,0.55)", letterSpacing:"0.06em" }}>
            {!selectedEnv ? "Choose an environment" : !selectedCompanion ? "Select a companion" : !selectedGoals.length ? "Select at least one goal" : ""}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ff {
          0%   { transform:translate(0,0);                          opacity:0; }
          15%  { opacity:var(--op,0.8); }
          50%  { transform:translate(var(--dx,60px),var(--dy,-40px)); opacity:var(--op,0.8); }
          85%  { opacity:var(--op,0.8); }
          100% { transform:translate(0,0);                          opacity:0; }
        }
        @keyframes crystalBob {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-10px); }
        }
        @keyframes bobY {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-7px); }
        }
        @keyframes mistA {
          0%   { transform:translateX(-4%) scaleX(1.04); }
          100% { transform:translateX(4%)  scaleX(0.97); }
        }
        @keyframes mistB {
          0%   { transform:translateX(3%)  scaleX(0.98); }
          100% { transform:translateX(-3%) scaleX(1.03); }
        }
        @keyframes poolPulse {
          0%,100% { opacity:0.65; transform:scale(1);    }
          50%      { opacity:1;    transform:scale(1.07); }
        }
        @keyframes runeGlow {
          0%,100% { opacity:0.55; transform:translate(-50%,-50%) scale(1);   }
          50%      { opacity:1;    transform:translate(-50%,-50%) scale(1.35); }
        }
      `}</style>
    </div>
  );
}
