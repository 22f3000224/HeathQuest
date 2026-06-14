import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useSanctuaryStore } from "../store/useSanctuaryStore";
import EditorAsset from "../components/EditorAsset";

// ── Asset paths ───────────────────────────────────────────────────────────────
const A_SPRING        = "/assets/ui/seasonal_icons/spring.webp";
const A_SUMMER        = "/assets/ui/seasonal_icons/summer.webp";
const A_AUTUMN        = "/assets/ui/seasonal_icons/autumn.webp";
const A_WINTER        = "/assets/ui/seasonal_icons/winter.webp";
const A_MIST          = "/assets/effects/mist.webp";
// Bridge and campfire assets removed
const A_RES_LEAF      = "/assets/ui/resource_icons/leaf.webp";
const A_RES_MOON      = "/assets/ui/resource_icons/moon.webp";
const A_RES_STAR      = "/assets/ui/resource_icons/star.webp";
const A_BG            = "/assets/MainSanctuaryBG.webp";
const A_CABIN         = "/assets/objects/cabin.webp";
const A_FOX_IDLE      = "/assets/Characters/Fox/fox_idle_clean.webp";
const A_FOX_BLINK     = "/assets/Characters/Fox/fox_blinking_clean.webp";
const A_OWL_IDLE      = "/assets/Characters/Owl/Owl_Idle.webp";
const A_OWL_FLAP      = "/assets/Characters/Owl/Owl_Flap.webp";
const A_TURTLE_IDLE   = "/assets/Characters/Turtle/Turtle_Idle.webp";
const A_TURTLE_WALK   = "/assets/Characters/Turtle/Turtle_Walk.webp";
const A_NAV_MUSEUM    = "/assets/ui/nav_icons/museum.jpg";
const A_NAV_CHRONICLE = "/assets/ui/nav_icons/Chronicle.jpg";
const A_NAV_COMPANION = "/assets/ui/nav_icons/companion.jpg";
const A_NAV_SETTINGS  = "/assets/ui/nav_icons/settings.jpg";

const SEASONS = [
  { id:"spring", label:"Spring", icon:A_SPRING, color:"#86efac" },
  { id:"summer", label:"Summer", icon:A_SUMMER, color:"#fde047" },
  { id:"autumn", label:"Autumn", icon:A_AUTUMN, color:"#fb923c" },
  { id:"winter", label:"Winter", icon:A_WINTER, color:"#bfdbfe" },
];

const NAV = [
  { id:"museum",      label:"Museum",      icon:A_NAV_MUSEUM,    route:"/museum"      },
  { id:"chronicle",   label:"Chronicle",   icon:A_NAV_CHRONICLE, route:"/chronicle"   },
  { id:"companion",   label:"Companion",   icon:A_NAV_COMPANION, route:"/companion",  isCenter:true },
  { id:"observatory", label:"Observatory", icon:null,            route:"/observatory", emoji:"🔭" },
  { id:"settings",    label:"Settings",    icon:A_NAV_SETTINGS,  route:"/settings"    },
];

const lerp = (a, b, t) => a + (b - a) * t;

// Safe numeric coercion helper
const num = (v, d = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);

// ─── Deterministic RNG ────────────────────────────────────────────────────────
function rng(s) {
  const x = Math.sin(s + 1) * 10000;
  return x - Math.floor(x);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SVG OVERLAY LAYERS (from SanctuaryScene)
// ══════════════════════════════════════════════════════════════════════════════

function StarsLayer({ sky }) {
  const visible = sky === "clear" || sky === "partly_clear" || sky === "dark";
  const count = sky === "clear" ? 28 : sky === "partly_clear" ? 14 : 6;
  const stars = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      cx: rng(i * 7) * 88 + 4,
      cy: rng(i * 13) * 38 + 2,
      r: 0.8 + rng(i * 3) * 1.4,
      delay: rng(i * 5) * 4,
      dur: 2 + rng(i * 11) * 3,
    })), []
  );
  return (
    <AnimatePresence>
      {visible && (
        <motion.g
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
        >
          {stars.slice(0, count).map((s, i) => (
            <motion.circle
              key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r}
              fill="white"
              animate={{ opacity: [0.3, 1, 0.3], r: [s.r, s.r * 1.5, s.r] }}
              transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
            />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

function AuroraLayer({ sky }) {
  if (sky !== "clear") return null;
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 3 }}>
      <defs>
        <linearGradient id="aurora1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(0,255,150,0)"    />
          <stop offset="40%"  stopColor="rgba(0,255,150,0.18)" />
          <stop offset="70%"  stopColor="rgba(100,80,255,0.14)"/>
          <stop offset="100%" stopColor="rgba(100,80,255,0)"   />
        </linearGradient>
        <linearGradient id="aurora2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(0,200,255,0)"    />
          <stop offset="50%"  stopColor="rgba(0,200,255,0.12)" />
          <stop offset="100%" stopColor="rgba(0,200,255,0)"    />
        </linearGradient>
      </defs>
      <motion.ellipse cx="50%" cy="18%" rx="55%" ry="8%"
        fill="url(#aurora1)"
        animate={{ ry: ["8%","11%","8%"], cy: ["18%","15%","18%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.ellipse cx="40%" cy="12%" rx="40%" ry="5%"
        fill="url(#aurora2)"
        animate={{ ry: ["5%","7%","5%"], cx: ["40%","45%","40%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </motion.g>
  );
}

function SkyTintLayer({ sky }) {
  const tints = {
    clear:        "rgba(255,210,120,0.08)",
    partly_clear: "rgba(100,160,220,0.06)",
    cloudy:       "rgba(60,60,80,0.18)",
    dark:         "rgba(10,10,30,0.45)",
  };
  return (
    <motion.rect width="100%" height="55%"
      fill={tints[sky] || tints.cloudy}
      animate={{ fill: tints[sky] || tints.cloudy }}
      transition={{ duration: 2.5 }}
    />
  );
}

function CelestialLayer({ sky }) {
  const showSun  = sky === "clear" || sky === "partly_clear";
  const showMoon = sky === "dark"  || sky === "cloudy";
  return (
    <g opacity="0.85">
      <AnimatePresence>
        {showMoon && (
          <motion.g key="moon" initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
            <circle cx="82%" cy="8%" r="1.8%" fill="rgba(255,248,210,0.75)" />
            <circle cx="82.8%" cy="7.4%" r="1.1%" fill="rgba(180,160,100,0.25)" />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSun && (
          <motion.g key="sun" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
            <motion.circle cx="82%" cy="11%" r="2.5%"
              fill="rgba(255,220,80,0.65)"
              animate={{ r: ["2.5%","2.9%","2.5%"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <circle cx="82%" cy="11%" r="3.5%" fill="rgba(255,200,80,0.08)" />
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}

function RainDrops() {
  const drops = useMemo(() => Array.from({ length: 45 }, (_, i) => ({
    x: rng(i * 7) * 100,
    delay: rng(i * 13) * 1.5,
    dur: 0.6 + rng(i * 3) * 0.4,
  })), []);
  return (
    <g>
      {drops.map((d, i) => (
        <motion.line key={i}
          x1={`${d.x}%`} y1="-2%" x2={`${d.x - 0.5}%`} y2="2%"
          stroke="rgba(150,180,220,0.35)" strokeWidth="1"
          animate={{ y: [0, 600] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: "linear" }}
        />
      ))}
    </g>
  );
}

function GoldenRays() {
  return (
    <motion.g animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 6, repeat: Infinity }}>
      {[15, 30, 50, 65, 80].map((x, i) => (
        <motion.rect key={i}
          x={`${x}%`} y="0" width="3%" height="100%"
          fill={`rgba(255,200,60,${0.04 - i * 0.005})`}
          style={{ transform: "skewX(-8deg)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </motion.g>
  );
}

function MistLayer() {
  return (
    <g>
      {[0.6, 0.72, 0.82].map((y, i) => (
        <motion.ellipse key={i}
          cx="50%" cy={`${y * 100}%`} rx="70%" ry="6%"
          fill="rgba(180,200,220,0.08)"
          animate={{ cx: ["45%","55%","45%"], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 10 + i * 3, repeat: Infinity, ease: "easeInOut", delay: i * 2 }}
        />
      ))}
    </g>
  );
}

function WeatherLayer({ weather }) {
  return (
    <>
      <AnimatePresence>
        {weather === "stormy" && (
          <motion.g key="storm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }}>
            <rect width="100%" height="100%" fill="rgba(20,20,50,0.38)" />
            <RainDrops />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {weather === "cloudy" && (
          <motion.rect key="cloudy" width="100%" height="100%"
            fill="rgba(40,40,60,0.22)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {weather === "sunny" && (
          <motion.g key="sunny" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
            <motion.rect width="100%" height="100%"
              fill="rgba(255,180,40,0.07)"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <GoldenRays />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {weather === "sunny" && (
          <motion.g key="rainbow" initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} exit={{ opacity: 0 }} transition={{ duration: 3, delay: 1 }}>
            {["rgba(255,0,0,0.4)","rgba(255,120,0,0.35)","rgba(255,255,0,0.3)","rgba(0,200,0,0.3)","rgba(0,100,255,0.3)","rgba(120,0,255,0.28)"].map((c, i) => (
              <ellipse key={i} cx="30%" cy="95%" rx={`${32 + i * 2}%`} ry={`${18 + i * 1.2}%`}
                fill="none" stroke={c} strokeWidth="2.5"
              />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(weather === "overcast" || weather === "cloudy") && (
          <motion.g key="fog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
            <MistLayer />
          </motion.g>
        )}
      </AnimatePresence>
    </>
  );
}

function WaterfallSpray() {
  const drops = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    x: 35 + rng(i * 7) * 12,
    delay: rng(i * 11) * 2,
    dur: 0.8 + rng(i * 3) * 0.6,
  })), []);
  return (
    <g>
      {drops.map((d, i) => (
        <motion.circle key={i}
          cx={`${d.x}%`} cy="62%"
          r={1 + rng(i) * 2}
          fill="rgba(200,230,255,0.7)"
          animate={{ y: [0, 30], opacity: [0.8, 0], scale: [1, 0.3] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: "easeOut" }}
        />
      ))}
      <motion.ellipse cx="41%" cy="67%" rx="10%" ry="3%"
        fill="rgba(200,230,255,0.15)"
        animate={{ ry: ["3%","4%","3%"], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </g>
  );
}

function RiverSparkles() {
  const sparks = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    x: 28 + rng(i * 7) * 28,
    y: 70 + rng(i * 13) * 8,
    delay: rng(i * 5) * 3,
    dur: 1.5 + rng(i * 3) * 2,
  })), []);
  return (
    <g>
      {sparks.map((s, i) => (
        <motion.circle key={i}
          cx={`${s.x}%`} cy={`${s.y}%`} r={1.5}
          fill="rgba(255,255,255,0.9)"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </g>
  );
}

function RiverLayer({ river }) {
  const configs = {
    full:    { opacity: 1,    sparkles: true,  glow: "rgba(80,180,255,0.35)",  tint: "rgba(60,160,255,0.18)"  },
    flowing: { opacity: 0.85, sparkles: true,  glow: "rgba(60,140,220,0.22)",  tint: "rgba(40,120,200,0.12)"  },
    low:     { opacity: 0.55, sparkles: false, glow: "rgba(40,100,160,0.12)",  tint: "rgba(20,80,140,0.08)"   },
    dry:     { opacity: 0.18, sparkles: false, glow: "transparent",             tint: "rgba(80,60,40,0.15)"    },
  };
  const c = configs[river] || configs.low;
  return (
    <motion.g animate={{ opacity: c.opacity }} transition={{ duration: 2 }}>
      <motion.ellipse cx="42%" cy="72%" rx="28%" ry="6%"
        fill={c.glow}
        animate={{ ry: ["6%","7%","6%"], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <ellipse cx="42%" cy="75%" rx="30%" ry="5%" fill={c.tint} />
      <AnimatePresence>
        {river === "full" && (
          <motion.g key="wf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }}>
            <WaterfallSpray />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {c.sparkles && (
          <motion.g key="sp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RiverSparkles />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {river === "dry" && (
          <motion.g key="dry" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }}>
            {[38, 42, 46, 50].map((x, i) => (
              <ellipse key={i} cx={`${x}%`} cy={`${72 + i}%`} rx="3%" ry="1.5%"
                fill="rgba(100,80,60,0.5)" />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

function Flowers({ magic }) {
  const positions = [
    [8,82],[12,85],[20,80],[72,83],[78,87],[85,82],[90,85],[25,88],[65,86],[15,78],[88,78],
  ];
  const colors = magic
    ? ["rgba(255,100,200,0.9)","rgba(180,100,255,0.9)","rgba(100,220,255,0.9)","rgba(255,220,80,0.9)"]
    : ["rgba(200,120,180,0.7)","rgba(180,200,100,0.7)","rgba(200,180,80,0.7)"];
  return (
    <g>
      {positions.map(([x, y], i) => {
        const color = colors[i % colors.length];
        return (
          <motion.circle key={i}
            cx={`${x}%`} cy={`${y}%`} r={magic ? 3 : 2.5}
            fill={color}
            style={{ filter: magic ? `drop-shadow(0 0 4px ${color})` : "none" }}
            animate={magic
              ? { r: [2.5, 3.5, 2.5], opacity: [0.8, 1, 0.8] }
              : { opacity: [0.7, 1, 0.7] }
            }
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
          />
        );
      })}
    </g>
  );
}

function MagicPlants() {
  return (
    <g>
      {[[18,83],[75,84],[88,80]].map(([x,y],i) => (
        <motion.g key={i}>
          <ellipse cx={`${x}%`} cy={`${y}%`} rx="1.8%" ry="0.8%"
            fill="rgba(180,100,255,0.6)"
            style={{ filter: "drop-shadow(0 0 6px rgba(180,100,255,0.8))" }}
          />
          <motion.ellipse cx={`${x}%`} cy={`${y-1}%`} rx="2.2%" ry="1%"
            fill="rgba(200,130,255,0.4)"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.5 }}
          />
        </motion.g>
      ))}
      {[[22,75],[70,72],[80,78]].map(([x,y],i) => (
        <motion.circle key={`orb-${i}`}
          cx={`${x}%`} cy={`${y}%`} r={2}
          fill="rgba(255,240,100,0.8)"
          style={{ filter: "drop-shadow(0 0 5px rgba(255,240,100,0.9))" }}
          animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}
    </g>
  );
}

function ForestLayer({ forest }) {
  const configs = {
    lush:   { tint: "rgba(40,180,80,0.15)",  flowers: true,  glow: true,  magic: true  },
    green:  { tint: "rgba(30,140,60,0.10)",  flowers: true,  glow: false, magic: false },
    sparse: { tint: "rgba(80,100,50,0.06)",  flowers: false, glow: false, magic: false },
    bare:   { tint: "rgba(80,60,30,0.12)",   flowers: false, glow: false, magic: false },
  };
  const c = configs[forest] || configs.sparse;
  return (
    <g>
      <motion.rect width="100%" height="100%" fill={c.tint}
        animate={{ fill: c.tint }} transition={{ duration: 2.5 }}
      />
      <AnimatePresence>
        {c.glow && (
          <motion.g key="glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
            <motion.ellipse cx="15%" cy="45%" rx="18%" ry="8%"
              fill="rgba(80,220,100,0.12)"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <motion.ellipse cx="82%" cy="42%" rx="16%" ry="7%"
              fill="rgba(60,200,80,0.10)"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 6, repeat: Infinity, delay: 1 }}
            />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {c.flowers && (
          <motion.g key="flowers" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }}>
            <Flowers magic={c.magic} />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {c.magic && (
          <motion.g key="magic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2, delay: 0.5 }}>
            <MagicPlants />
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}

function DeerSilhouette({ x, y }) {
  const X = num(x, 0);
  const Y = num(y, 0);
  return (
    <motion.g
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <ellipse cx={`${X}%`} cy={`${Y}%`} rx="3.5%" ry="2%"   fill="rgba(160,100,60,0.75)" />
      <circle  cx={`${X+3}%`} cy={`${Y-2.5}%`} r="1.6%"       fill="rgba(160,100,60,0.75)" />
      <path    d={`M ${X+3.2} ${Y-4} L ${X+2.5} ${Y-6.5} M ${X+3.2} ${Y-4} L ${X+4} ${Y-6.5}`}
        stroke="rgba(120,70,30,0.8)" strokeWidth="1.5" fill="none" />
      {[-2,-0.5,1,2.5].map((ox,i) => (
        <line key={i}
          x1={`${X+ox}%`} y1={`${Y+1.5}%`}
          x2={`${X+ox}%`} y2={`${Y+4.5}%`}
          stroke="rgba(130,80,40,0.7)" strokeWidth="1.5"
        />
      ))}
    </motion.g>
  );
}

function RabbitSilhouette({ x, y, small }) {
  const s = small ? 0.7 : 1;
  const X = num(x, 0);
  const Y = num(y, 0);
  return (
    <motion.g
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: small ? 0.5 : 0 }}
    >
      <ellipse cx={`${X}%`}       cy={`${Y}%`}           rx={`${1.8*s}%`} ry={`${1.2*s}%`} fill="rgba(200,180,160,0.7)" />
      <circle  cx={`${X+1.5*s}%`} cy={`${Y-1.5*s}%`}     r={`${0.9*s}%`}                    fill="rgba(200,180,160,0.7)" />
      <ellipse cx={`${X+1.2*s}%`} cy={`${Y-3*s}%`}        rx={`${0.3*s}%`} ry={`${1*s}%`}   fill="rgba(200,180,160,0.7)" />
      <ellipse cx={`${X+1.9*s}%`} cy={`${Y-3*s}%`}        rx={`${0.3*s}%`} ry={`${1*s}%`}   fill="rgba(200,180,160,0.7)" />
    </motion.g>
  );
}

function FlyingBirds() {
  const birds = useMemo(() => [
    { sx:20, sy:25, dx:85, delay:0,  dur:14 },
    { sx:10, sy:20, dx:90, delay:3,  dur:16 },
    { sx:15, sy:28, dx:88, delay:6,  dur:18 },
  ], []);
  return (
    <g>
      {birds.map((b, i) => (
        <motion.g key={i}
          animate={{ x: [`${b.sx}%`,`${b.dx}%`], y: [`${b.sy}%`,`${b.sy-5}%`,`${b.sy}%`] }}
          transition={{ duration: b.dur, repeat: Infinity, delay: b.delay, ease: "linear" }}
        >
          <path d="M -8 0 Q -4 -4 0 0 Q 4 -4 8 0"
            stroke="rgba(40,30,20,0.7)" strokeWidth="1.5" fill="none" />
        </motion.g>
      ))}
    </g>
  );
}

function Butterflies() {
  const bflies = useMemo(() => [
    { x:35, y:60, color:"rgba(255,150,200,0.8)", delay:0 },
    { x:55, y:55, color:"rgba(150,200,255,0.8)", delay:1 },
    { x:62, y:65, color:"rgba(255,220,100,0.8)", delay:2 },
  ], []);
  return (
    <g>
      {bflies.map((b, i) => (
        <motion.g key={i}
          animate={{
            x: [`${b.x}%`,`${b.x+6}%`,`${b.x+2}%`,`${b.x}%`],
            y: [`${b.y}%`,`${b.y-4}%`,`${b.y+2}%`,`${b.y}%`],
          }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, delay: b.delay, ease: "easeInOut" }}
        >
          <motion.ellipse cx="-3" cy="0" rx="3.5" ry="2" fill={b.color}
            animate={{ scaleX: [1,-1,1] }} transition={{ duration: 0.3, repeat: Infinity }}
          />
          <motion.ellipse cx="3" cy="0" rx="3.5" ry="2" fill={b.color}
            animate={{ scaleX: [1,-1,1] }} transition={{ duration: 0.3, repeat: Infinity }}
          />
          <ellipse cx="0" cy="0" rx="1" ry="3" fill="rgba(40,30,20,0.6)" />
        </motion.g>
      ))}
    </g>
  );
}

function SVGFireflies({ count }) {
  const flies = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: 10 + rng(i * 7) * 75,
      y: 55 + rng(i * 13) * 35,
      delay: rng(i * 5) * 5,
      dur: 4 + rng(i * 3) * 4,
      dx: (rng(i * 17) - 0.5) * 12,
      dy: (rng(i * 19) - 0.5) * 8,
    })), [count]
  );
  return (
    <g>
      {flies.map((f, i) => (
        <motion.circle key={i}
          cx={`${f.x}%`} cy={`${f.y}%`} r={2}
          fill="rgba(255,240,100,0.9)"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,240,100,0.9))" }}
          animate={{ x: [0,f.dx,0], y: [0,f.dy,0], opacity: [0,0.9,0.3,0.9,0] }}
          transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
        />
      ))}
    </g>
  );
}

function WildlifeLayer({ animal }) {
  const showDeer      = animal === "active" || animal === "energetic";
  const showRabbits   = animal === "energetic";
  const showBirds     = animal === "active" || animal === "energetic";
  const showButterfly = animal === "energetic";
  return (
    <g>
      <AnimatePresence>
        {showDeer && (
          <motion.g key="deer" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:20 }} transition={{ duration:1.5,delay:0.3 }}>
            <DeerSilhouette x={68} y={74} />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRabbits && (
          <motion.g key="rabbits" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:1.5,delay:0.8 }}>
            <RabbitSilhouette x={22} y={85} />
            <RabbitSilhouette x={25} y={87} small />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBirds && (
          <motion.g key="birds" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:1 }}>
            <FlyingBirds />
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showButterfly && (
          <motion.g key="butterflies" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:1.5,delay:1 }}>
            <Butterflies />
          </motion.g>
        )}
      </AnimatePresence>
      <SVGFireflies count={animal === "energetic" ? 12 : animal === "active" ? 6 : 2} />
    </g>
  );
}

function UpdateBloomLayer({ blooming }) {
  return (
    <AnimatePresence>
      {blooming && (
        <motion.g key="bloom"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.5 }}
        >
          <motion.circle cx="50%" cy="60%" r="5%"
            fill="rgba(255,240,180,0.7)"
            animate={{ r:["5%","80%"], opacity:[0.7,0] }}
            transition={{ duration:2.5, ease:"easeOut" }}
          />
          {Array.from({ length:8 }, (_,i) => {
            const angle = (i/8) * Math.PI * 2;
            const tx = 50 + Math.cos(angle) * 40;
            const ty = 60 + Math.sin(angle) * 30;
            return (
              <motion.circle key={i}
                cx="50%" cy="60%" r={4}
                fill="rgba(100,220,150,0.8)"
                style={{ filter:"drop-shadow(0 0 6px rgba(100,220,150,0.8))" }}
                animate={{ cx:["50%",`${tx}%`], cy:["60%",`${ty}%`], opacity:[1,0], r:[4,8,0] }}
                transition={{ duration:2, ease:"easeOut", delay:i*0.05 }}
              />
            );
          })}
          <motion.rect width="100%" height="100%"
            fill="rgba(200,255,220,0.12)"
            animate={{ opacity:[0,0.5,0] }}
            transition={{ duration:0.8 }}
          />
        </motion.g>
      )}
    </AnimatePresence>
  );
}

function TransformLayer({ active }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.g key="transform" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
          <motion.circle cx="50%" cy="60%" r="3%" fill="rgba(255,240,200,0.9)"
            animate={{ r:["3%","45%"], opacity:[1,0] }} transition={{ duration:1.2, ease:"easeOut" }} />
          {[0,1,2,3,4].map(i => (
            <motion.circle key={i} cx={`${50+(i-2)*6}%`} cy={`${60-i*2}%`} r={1.6}
              fill="rgba(126,200,160,0.9)"
              initial={{ opacity:0,scale:0.4 }} animate={{ opacity:[1,0],scale:[1.2,0.2] }} transition={{ duration:1.1,delay:i*0.08 }} />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

// ── SVG Overlay: full layer stack rendered over the BG ────────────────────────
function SanctuarySceneOverlay({ world, blooming }) {
  const {
    sky      = "partly_clear",
    river    = "flowing",
    forest   = "sparse",
    animal   = "resting",
    weather  = "overcast",
  } = world;

  const [transformActive, setTransformActive] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem("hq_companion_transform");
    if (v === "1") {
      setTransformActive(true);
      localStorage.removeItem("hq_companion_transform");
      const t = setTimeout(() => setTransformActive(false), 1400);
      return () => clearTimeout(t);
    }
  }, [world]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:2 }}
    >
      {/* subtle darkening tint */}
      <rect x="0" y="0" width="100" height="100" fill="rgba(4,6,14,0.18)" />

      <g opacity="1.0">
        <SkyTintLayer  sky={sky}         />
        <AuroraLayer   sky={sky}         />
        <StarsLayer    sky={sky}         />
        <CelestialLayer sky={sky}        />
        <WeatherLayer  weather={weather} />
        <ForestLayer   forest={forest}   />
        <RiverLayer    river={river}     />
        <WildlifeLayer animal={animal}   />
        <TransformLayer active={transformActive} />
        <UpdateBloomLayer blooming={blooming}    />
      </g>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function SanctuaryWorld() {
  const navigate = useNavigate();
  const location = useLocation();

  const setSanctuarySetup = useSanctuaryStore(s => s.setSanctuarySetup);
  useEffect(() => {
    if (location?.state && (location.state.environment || location.state.companion || location.state.goals)) {
      setSanctuarySetup({
        environment: location.state.environment || undefined,
        companion:   location.state.companion   || undefined,
        goals:       location.state.goals       || [],
      });
    }
  }, [location?.state]);

  // ── Store ──────────────────────────────────────────────────────────────────
  const visuals      = useSanctuaryStore(s => s.visuals);
  const companion    = useSanctuaryStore(s => s.companion);
  const season       = useSanctuaryStore(s => s.season);
  const seasonPoints = useSanctuaryStore(s => s.seasonPoints);
  const setSeason    = useSanctuaryStore(s => s.setSeason);
  const recalculate  = useSanctuaryStore(s => s.recalculate);
  const hasLoggedToday = useSanctuaryStore(s => s.hasLoggedToday);
  const submitLog    = useSanctuaryStore(s => s.submitLog);
  const logs         = useSanctuaryStore(s => s.logs);
  const todayLog     = useSanctuaryStore(s => s.todayLog);
  const loading      = useSanctuaryStore(s => s.loading);
  const error        = useSanctuaryStore(s => s.error);


  const todayLogged = hasLoggedToday();
  useEffect(() => { 
    recalculate(); 
    // Backend initialization already syncs state, no need to sync again
  }, [recalculate]);

  // Deep-merge visuals with safe defaults to avoid transient `undefined` values
  const defaults = {
    sky: { starDensity: 0.5, moonBrightness: 0.5, cloudCover: 0.3 },
    river: { clarity: 0.5, shimmer: 0.5, flowSpeed: 0.5 },
    forest: { lushness: 0.5, saturation: 80, flowerGlow: 0.5 },
    wildlife: { foxEnergy: 0.5, campfireIntensity: 0.5 },
    atmosphere: { warmth: 0.5, mistDensity: 0.5, tintColor: "transparent", fireflyCount: 6 },
  };
  const merged = {
    sky: { ...defaults.sky, ...(visuals?.sky || {}) },
    river: { ...defaults.river, ...(visuals?.river || {}) },
    forest: { ...defaults.forest, ...(visuals?.forest || {}) },
    wildlife: { ...defaults.wildlife, ...(visuals?.wildlife || {}) },
    atmosphere: { ...defaults.atmosphere, ...(visuals?.atmosphere || {}) },
  };
  const sky = merged.sky;
  const river = merged.river;
  const forest = merged.forest;
  const wildlife = merged.wildlife;
  const atmosphere = merged.atmosphere;

  // small helper to coerce numeric values to safe defaults
  const num = (v, d = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);

  // Debug: log tint color to help locate color-shift issues
  if (typeof window !== 'undefined') console.log('Sanctuary atmosphere.tintColor=', atmosphere.tintColor);

  // ── Local state ────────────────────────────────────────────────────────────
  const [tick, setTick]               = useState(0);
  const [foxFrame, setFoxFrame]       = useState("idle");
  const [owlFrame, setOwlFrame]       = useState("idle");
  const [turtleFrame, setTurtleFrame] = useState("idle");
  const [companionExpression, setCompanionExpression] = useState("calm");
  const [navHover, setNavHover]       = useState(null);
  const [seasonHover, setSeasonHover] = useState(null);
  const [showDebug, setShowDebug]     = useState(false);
  const [leftHover, setLeftHover]     = useState(null);
  const [blooming, setBlooming]       = useState(false);

  const [demoLog, setDemoLog] = useState({
    sleep:5, hydration:5, nutrition:5, exercise:5, mood:5
  });

  // ── Narration state ────────────────────────────────────────────────────────
  const DEFAULT_NARRATIONS = {
    fox:    "The sanctuary is quiet. I've been waiting for you. Tell me how you're doing today.",
    owl:    "I've been watching from the old tree. The sanctuary holds its breath. How was your day?",
    turtle: "The river remembers every step you've taken. Rest here a moment with me.",
  };
  const latestNarration = todayLog?.narration || logs[0]?.narration || null;
  const [loadingNarration, setLoadingNarration] = useState(false);
  const [displayNarration, setDisplayNarration] = useState(latestNarration || DEFAULT_NARRATIONS[companion] || DEFAULT_NARRATIONS.fox);

  // Sync narration when todayLog updates (after submitLog resolves)
  useEffect(() => {
    const n = todayLog?.narration || logs[0]?.narration;
    if (n) setDisplayNarration(n);
    else setDisplayNarration(DEFAULT_NARRATIONS[companion] || DEFAULT_NARRATIONS.fox);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLog, logs, companion]);

  // Show loading dots briefly after submitLog is triggered
  const prevTodayLogged = React.useRef(todayLogged);
  useEffect(() => {
    if (!prevTodayLogged.current && todayLogged) {
      setLoadingNarration(true);
      const timer = setTimeout(() => setLoadingNarration(false), 6000);
      return () => clearTimeout(timer);
    }
    prevTodayLogged.current = todayLogged;
  }, [todayLogged]);

  // ── CSS-animated fireflies (HTML layer — more performant at scale) ──────────
  const fireflies = useMemo(() =>
    Array.from({ length: atmosphere.fireflyCount }, (_, i) => ({
      id: i,
      x:    Math.random() * 100,
      y:    5 + Math.random() * 72,
      size: 2 + Math.random() * 3,
      dur:  5 + Math.random() * 9,
      delay:Math.random() * 7,
      dx:   (Math.random() - 0.5) * 150,
      dy:   (Math.random() - 0.5) * 100,
      op:   0.45 + Math.random() * 0.55,
    })),
  [atmosphere.fireflyCount]);

  // ── Seasonal particles ─────────────────────────────────────────────────────
  const seasonParticles = useMemo(() => {
    if (season === "spring" || season === "summer") return [];
    const count = season === "winter" ? 38 : 22;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x:    Math.random() * 110 - 5,
      size: season === "winter" ? 3 + Math.random() * 5 : 9 + Math.random() * 11,
      dur:  7 + Math.random() * 9,
      delay:Math.random() * 9,
      drift:(Math.random() - 0.5) * 70,
      emoji:["🍂","🍁"][Math.floor(Math.random()*2)],
    }));
  }, [season]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 80);
    return () => clearInterval(t);
  }, []);

  // ── Companion blink/flap intervals ────────────────────────────────────────
  useEffect(() => {
    const lastBlinkRef = { last: 0 };
    const base = Math.max(1200, lerp(5000, 1800, wildlife.foxEnergy || 0.5));
    const interval = base + Math.random() * 1000;
    const minGap = 1500; // minimum ms between blinks
    const t = setInterval(() => {
      const now = Date.now();
      if (now - lastBlinkRef.last < minGap) return;
      lastBlinkRef.last = now;
      setFoxFrame("blink");
      setTimeout(() => { setFoxFrame("idle"); }, 300);
    }, interval);
    return () => clearInterval(t);
  }, [wildlife.foxEnergy]);

  useEffect(() => {
    const t = setInterval(() => {
      setOwlFrame("flap");
      setTimeout(() => setOwlFrame("idle"), 350);
    }, 4200 + Math.random() * 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setTurtleFrame("walk");
      setTimeout(() => setTurtleFrame("idle"), 800);
    }, 8000 + Math.random() * 4000);
    return () => clearInterval(t);
  }, []);

  // ── Companion expression from health metrics ───────────────────────────────
  useEffect(() => {
    const avg = (
        num(merged.sky.starDensity, 0.5) + num(merged.river.clarity, 0.5) +
        num(merged.forest.lushness, 0.5) + num(merged.wildlife.foxEnergy, 0.5) +
        num(merged.atmosphere.warmth, 0.5)
      ) / 5;
    if      (avg > 0.8) setCompanionExpression("energetic");
    else if (avg > 0.6) setCompanionExpression("happy");
    else if (avg > 0.4) setCompanionExpression("calm");
    else if (avg > 0.2) setCompanionExpression("worried");
    else                setCompanionExpression("tired");
  }, [visuals]);

  // ── Derived animation values ───────────────────────────────────────────────
  const fireIntensity  = num(wildlife.campfireIntensity, 0.5);

  const riverShimmer   = num(river.shimmer, 0.5);
  const riverColor     = `rgba(96,${Math.round(lerp(130,210,num(river.clarity,0.5)))},250,${lerp(0.05,0.22,riverShimmer)})`;

  const moonOpacity    = sky.moonBrightness || 0.5;
  const moonGlow       = lerp(8, 28, sky.moonBrightness || 0.5);
  const cloudOverlay   = `rgba(20,20,40,${(sky.cloudCover || 0.3) * 0.35})`;
  // Ensure `forest.saturation` is interpreted correctly.
  // If it's already a percentage (e.g. 80), use it directly; otherwise treat as normalized [0,1].
  const forestSaturationRaw = forest.saturation;
  // debug
  if (typeof window !== 'undefined') console.log('forest.saturation=', forestSaturationRaw);
  // prefer finite numeric percentages; fall back to safe default
  const forestSaturate = Number.isFinite(forestSaturationRaw)
    ? Math.max(50, Math.min(120, forestSaturationRaw))
    : 80;
  if (typeof window !== 'undefined') console.log('forestSaturate =', forestSaturate, 'forest=', forest);
  const flowerGlowSize = lerp(4, 18, num(forest.flowerGlow, 0.5));

  // ── Companion asset map ────────────────────────────────────────────────────
  const companionMap = {
    fox:    { idle:A_FOX_IDLE,    alt:A_FOX_BLINK,   frame:foxFrame,    color:"#f97316", label:"Fox",    emoji:"🦊" },
    owl:    { idle:A_OWL_IDLE,    alt:A_OWL_FLAP,    frame:owlFrame,    color:"#93c5fd", label:"Owl",    emoji:"🦉" },
    turtle: { idle:A_TURTLE_IDLE, alt:A_TURTLE_WALK,  frame:turtleFrame, color:"#86efac", label:"Turtle", emoji:"🐢" },
  };
  const comp = companionMap[companion] || companionMap.fox;

  // ── Map store visuals → SanctuaryScene world props ────────────────────────
  const sceneWorld = useMemo(() => {
    // sky state
    const starDensity = num(merged.sky.starDensity, 0.5);
    const skyState =
      starDensity > 0.75 ? "clear" :
      starDensity > 0.45 ? "partly_clear" :
      starDensity > 0.2  ? "cloudy" : "dark";

    // river state
    const clarity = num(merged.river.clarity, 0.5);
    const riverState =
      clarity > 0.75 ? "full" :
      clarity > 0.5  ? "flowing" :
      clarity > 0.25 ? "low" : "dry";

    // forest state
    const lushness = num(merged.forest.lushness, 0.5);
    const forestState =
      lushness > 0.75 ? "lush" :
      lushness > 0.5  ? "green" :
      lushness > 0.25 ? "sparse" : "bare";

    // animal state
    const energy = num(merged.wildlife.foxEnergy, 0.5);
    const animalState =
      energy > 0.75 ? "energetic" :
      energy > 0.45 ? "active" :
      energy > 0.2  ? "resting" : "sleeping";

    // weather from mood/atmosphere
    const warmth = num(merged.atmosphere.warmth, 0.5);
    const weatherState =
      warmth > 0.75 ? "sunny" :
      warmth > 0.5  ? "overcast" :
      warmth > 0.25 ? "cloudy" : "stormy";

    return { sky: skyState, river: riverState, forest: forestState, animal: animalState, weather: weatherState };
  }, [visuals]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDemoSubmit = () => {
    submitLog(demoLog);
    setBlooming(true);
    setLoadingNarration(true);
    setTimeout(() => setBlooming(false), 2800);
    setTimeout(() => setLoadingNarration(false), 6000);
  };

  const handleNavClick = (route) => navigate(route);

  const handleCabinClick = () => {
    if (!todayLogged) navigate("/dailylog");
  };

  const handleCompanionClick = () => {
    if      (companion === "fox")    {
      if (foxFrame !== "blink") {
        setFoxFrame("blink");
        setTimeout(() => setFoxFrame("idle"), 350);
      }
    }
    else if (companion === "owl")    { setOwlFrame("flap");     setTimeout(() => setOwlFrame("idle"),    350); }
    else if (companion === "turtle") { setTurtleFrame("walk");  setTimeout(() => setTurtleFrame("idle"), 800); }
  };

  return (
    <div style={{
      position:"relative", width:"100vw", height:"100vh",
      overflow:"hidden", fontFamily:"Georgia,serif", userSelect:"none",
    }}>

      {/* ── 1. BACKGROUND IMAGE (with forest saturation + cloud overlay) ── */}
      <div style={{ position:"absolute", inset:0, zIndex:0 }}>
        <img src={A_BG} alt="" style={{
          width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center top",
          filter:`saturate(${forestSaturate}%)`,
          transition:"filter 1.5s ease",
        }}/>
        {/* Cloud cover — Sleep */}
        <div style={{
          position:"absolute", inset:0,
          background:cloudOverlay,
          transition:"background 1.8s ease",
          pointerEvents:"none",
        }}/>
        {/* Mood atmosphere tint (temporarily disabled for debugging) */}
        {false && (
          <div style={{
            position:"absolute", inset:0,
            background:atmosphere.tintColor,
            transition:"background 1.5s ease",
            pointerEvents:"none",
          }}/>
        )}
        {/* Moon brightness boost */}
        <div style={{
          position:"absolute", top:0, right:"10%", width:"20%", height:"28%",
          background:`radial-gradient(ellipse, rgba(255,255,230,${(moonOpacity-0.3)*0.18}) 0%, transparent 70%)`,
          filter:`blur(${moonGlow}px)`,
          transition:"all 1.8s ease",
          pointerEvents:"none",
          mixBlendMode:"screen",
        }}/>
        {/* Edge vignette */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 88% 88% at 50% 44%, transparent 28%, rgba(0,0,10,0.55) 100%)",
          pointerEvents:"none",
        }}/>
        {/* Bottom gradient for nav */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:"30%",
          background:"linear-gradient(to top, rgba(0,0,12,0.93) 0%, rgba(0,0,12,0.6) 50%, transparent 100%)",
          pointerEvents:"none",
        }}/>
      </div>

      {/* ── 2. SVG SCENE OVERLAYS (SanctuaryScene layers) ── */}
      <SanctuarySceneOverlay world={sceneWorld} blooming={blooming} />

      {/* ── 3. River shimmer overlay (Hydration) ── */}
      <div style={{
        position:"absolute", bottom:"14%", left:"20%", right:"20%", height:"22%",
        background:riverColor,
        borderRadius:"50%",
        filter:`blur(${lerp(12,4,river.clarity)}px)`,
        transition:"all 1.5s ease",
        pointerEvents:"none",
        zIndex:3,
        mixBlendMode:"screen",
        animation:`riverShimmer ${lerp(3,1.2,num(river.flowSpeed,0.5)).toFixed(1)}s ease-in-out infinite`,
      }}/>

      {/* ── 4. Mist (density from mood) ── */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:4 }}>
        <img src={A_MIST} alt="" style={{
          position:"absolute", bottom:"22%", left:"-5%", width:"55%",
          opacity:atmosphere.mistDensity * 0.85,
          transition:"opacity 1.5s ease",
          animation:"mistL 22s ease-in-out infinite alternate",
        }}/>
        <img src={A_MIST} alt="" style={{
          position:"absolute", bottom:"14%", right:"-5%", width:"50%",
          opacity:atmosphere.mistDensity * 0.65,
          transition:"opacity 1.5s ease",
          animation:"mistR 28s ease-in-out infinite alternate-reverse",
        }}/>
      </div>

      {/* ── 5. HTML Fireflies (CSS-animated, Mood) ── */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:4 }}>
        {fireflies.map(ff => (
          <div key={ff.id} style={{
            position:"absolute", left:`${ff.x}%`, top:`${ff.y}%`,
            width:ff.size, height:ff.size, borderRadius:"50%",
            background:"#fef08a",
            boxShadow:`0 0 ${ff.size*3}px #fef08a, 0 0 ${ff.size*6}px #fde047`,
            animation:`ffloat ${ff.dur}s ${ff.delay}s ease-in-out infinite`,
            "--dx":`${ff.dx}px`, "--dy":`${ff.dy}px`, "--op":ff.op,
          }}/>
        ))}
      </div>

      {/* ── 6. Seasonal particles ── */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:4 }}>
        {seasonParticles.map(p =>
          season === "autumn" ? (
            <div key={p.id} style={{
              position:"absolute", left:`${p.x}%`, top:"-5%",
              fontSize:p.size, opacity:0.85,
              animation:`leafFall ${p.dur}s ${p.delay}s linear infinite`,
              "--drift":`${p.drift}px`,
            }}>{p.emoji}</div>
          ) : (
            <div key={p.id} style={{
              position:"absolute", left:`${p.x}%`, top:"-2%",
              width:p.size, height:p.size, borderRadius:"50%",
              background:"rgba(219,234,254,0.85)",
              boxShadow:"0 0 4px rgba(219,234,254,0.5)",
              animation:`snowFall ${p.dur}s ${p.delay}s linear infinite`,
              "--drift":`${p.drift}px`,
            }}/>
          )
        )}
      </div>

      {/* ── 7. Glowing flowers — Nutrition ── */}
      <div style={{
        position:"absolute", bottom:"17%", left:"4%",
        display:"flex", gap:6, zIndex:5, pointerEvents:"none",
      }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width: lerp(10,22,forest.flowerGlow || 0.5),
            height:lerp(10,22,forest.flowerGlow || 0.5),
            borderRadius:"50%",
            background:"rgba(59,130,246,0.7)",
            boxShadow:`0 0 ${flowerGlowSize}px #3b82f6, 0 0 ${flowerGlowSize*2}px #2563eb`,
            opacity: lerp(0.2, 0.9, forest.flowerGlow || 0.5),
            transition:"all 1.5s ease",
            animation:`flowerPulse ${2.5+i*0.4}s ${i*0.3}s ease-in-out infinite`,
          }}/>
        ))}
      </div>

      <EditorAsset id="cabin" defaultX={776} defaultY={326} defaultWidth={456} defaultHeight={415}>
        <div style={{
          width:"100%", height:"100%",
          filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
          animation:"bobSlow 6s ease-in-out infinite",
          zIndex:6, transition:"filter 1.2s ease",
          position:"relative",
        }}>
          <div
            onClick={handleCabinClick}
            style={{ cursor: todayLogged ? "default" : "pointer", position:"relative" }}
          >
            <img src={A_CABIN} alt="Cabin" style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}/>
            {!todayLogged && (
              <div style={{
                position:"absolute", top:"15%", right:"20%",
                width:"clamp(20px,3vw,32px)", height:"clamp(20px,3vw,32px)",
                borderRadius:"50%", background:"#fbbf24", border:"2px solid #fff",
                boxShadow:"0 0 12px #fbbf24, 0 0 24px rgba(251,191,36,0.5)",
                animation:"dailyLogPulse 2s ease-in-out infinite",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"clamp(8px,1.2vw,12px)", zIndex:1,
              }}>✨</div>
            )}
            {todayLogged && (
              <div style={{
                position:"absolute", top:"15%", right:"20%",
                width:"clamp(18px,2.5vw,28px)", height:"clamp(18px,2.5vw,28px)",
                borderRadius:"50%", background:"#10b981", border:"2px solid #fff",
                boxShadow:"0 0 8px #10b981",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"clamp(8px,1vw,10px)", color:"#fff", fontWeight:"bold", zIndex:1,
              }}>✓</div>
            )}
            {!todayLogged && (
              <div style={{
                position:"absolute", bottom:"-25px", left:"50%",
                transform:"translateX(-50%)",
                background:"rgba(0,0,0,0.8)", color:"#fbbf24",
                padding:"4px 8px", borderRadius:"12px",
                fontSize:"clamp(0.6rem,0.8vw,0.7rem)", whiteSpace:"nowrap",
                border:"1px solid rgba(251,191,36,0.3)",
                animation:"fadeInOut 3s ease-in-out infinite", zIndex:1,
              }}>Click to log today</div>
            )}
          </div>
        </div>
      </EditorAsset>

      <EditorAsset id="companion" defaultX={219} defaultY={376} defaultWidth={306} defaultHeight={279}>
        {/* Companion animal (moved into EditorAsset) */}
        <div
          onClick={handleCompanionClick}
          style={{
            width:"100%", height:"100%",
            filter:`drop-shadow(0 0 14px ${comp.color}77) drop-shadow(0 0 28px ${comp.color}44)`,
            // Keep fox mostly still; bob animation enabled for other companions
            animation: companion === "fox" ? "none" : `bobSlow ${lerp(5,2.5,wildlife.foxEnergy || 0.5).toFixed(1)}s 0.5s ease-in-out infinite`,
            zIndex:8, cursor:"pointer",
            transition:"filter 1s ease",
            position:"relative",
          }}
        >
          {/* Expression glow */}
          <div style={{
            position:"absolute", inset:"-20%",
            background: companionExpression === "energetic"
              ? `radial-gradient(circle, ${comp.color}33 0%, transparent 70%)`
              : companionExpression === "happy"
              ? `radial-gradient(circle, ${comp.color}22 0%, transparent 70%)`
              : "transparent",
            borderRadius:"50%",
            animation: companionExpression === "energetic" ? "companionPulse 2s ease-in-out infinite" : "none",
            transition:"all 1s ease",
            pointerEvents:"none",
          }}/>
          <img
            src={comp.frame === "idle" ? comp.idle : (comp.alt || comp.idle)}
            alt={comp.label}
            style={{
              width:"100%", height:"100%", objectFit:"contain", display:"block",
              filter: companionExpression === "tired"
                ? "brightness(0.7) saturate(0.6)"
                : companionExpression === "energetic"
                ? "brightness(1.2) saturate(1.3)"
                : "brightness(1) saturate(1)",
              transition:"filter 1s ease",
            }}
          />
          {companionExpression === "energetic" && (
            <div style={{
              position:"absolute", top:"-10%", left:"50%",
              transform:"translateX(-50%)",
              width:"140%", height:"140%",
              pointerEvents:"none", zIndex:1,
            }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  position:"absolute",
                  left:`${20 + i * 20}%`, top:`${10 + (i%2)*30}%`,
                  width:8, height:8, borderRadius:"50%",
                  background:"#fef08a", boxShadow:"0 0 8px #fef08a",
                  animation:`sparkle ${1.5+i*0.3}s ${i*0.2}s ease-in-out infinite`,
                }}/>
              ))}
            </div>
          )}
        </div>
      </EditorAsset>

      {/* ── 12. Left resource panel ── */}
      {[
        { icon:A_RES_LEAF, val:"12", color:"#86efac", label:"Leaves", x:"clamp(6px,1.2vw,18px)", y:"35%" },
        { icon:A_RES_MOON, val:"7",  color:"#c4b5fd", label:"Moons",  x:"clamp(6px,1.2vw,18px)", y:"45%" },
        { icon:A_RES_STAR, val:"34", color:"#fde047", label:"Stars",  x:"clamp(6px,1.2vw,18px)", y:"55%" },
      ].map(r => (
        <div key={r.label}
          onMouseEnter={() => setLeftHover(r.label)}
          onMouseLeave={() => setLeftHover(null)}
          style={{ 
            position:"absolute", 
            left: r.x, 
            top: r.y,
            display:"flex", 
            flexDirection:"column", 
            alignItems:"center", 
            cursor:"pointer",
            zIndex:20
          }}
        >
          <div style={{
            width:"clamp(36px,4.5vw,56px)", height:"clamp(36px,4.5vw,56px)",
            borderRadius:"50%",
            background: leftHover===r.label ? `${r.color}22` : "rgba(0,0,0,0.5)",
            border:`1.5px solid ${leftHover===r.label ? r.color : "rgba(255,255,255,0.18)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.3s", backdropFilter:"blur(6px)",
            boxShadow: leftHover===r.label ? `0 0 14px ${r.color}66` : "none",
          }}>
            <img src={r.icon} alt={r.label} style={{ width:"58%", height:"58%", objectFit:"contain" }}/>
          </div>
          <span style={{ fontSize:"clamp(0.5rem,0.75vw,0.65rem)", color:r.color, textShadow:`0 0 8px ${r.color}`, marginTop:2, fontWeight:"bold" }}>{r.val}</span>
        </div>
      ))}

      {/* ── 13. Top-right: season points ── */}
      <div style={{
        position:"absolute", top:"clamp(6px,1vh,14px)", right:"clamp(10px,1.5vw,22px)",
        zIndex:20, display:"flex", alignItems:"center", gap:6,
        background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)",
        border:"1px solid rgba(255,255,255,0.15)", borderRadius:20, padding:"4px 12px",
      }}>
        <img src={A_RES_STAR} alt="star" style={{ width:18, height:18, objectFit:"contain" }}/>
        <span style={{ fontSize:"clamp(0.75rem,1.1vw,0.95rem)", color:"#fde047", textShadow:"0 0 10px #fde047", fontWeight:"bold" }}>{seasonPoints}</span>
      </div>

      {/* ── 14. Seasonal bar (top center) ── */}
      <div style={{
        position:"absolute", top:"clamp(6px,1vh,14px)", left:"50%",
        transform:"translateX(-50%)",
        display:"flex", alignItems:"center", gap:"clamp(6px,1.2vw,16px)",
        background:"rgba(0,0,10,0.55)", backdropFilter:"blur(10px)",
        border:"1px solid rgba(255,255,255,0.12)", borderRadius:30, padding:"6px 20px",
        zIndex:20,
      }}>
        {SEASONS.map(s => {
          const isActive = season === s.id;
          return (
            <div key={s.id}
              onClick={() => setSeason(s.id)}
              onMouseEnter={() => setSeasonHover(s.id)}
              onMouseLeave={() => setSeasonHover(null)}
              style={{
                display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                padding:"3px 10px", borderRadius:20,
                background: isActive ? `${s.color}22` : "transparent",
                border:`1px solid ${isActive ? s.color : "transparent"}`,
                transform: isActive || seasonHover===s.id ? "scale(1.08)" : "scale(1)",
                transition:"all 0.3s",
              }}
            >
              <img src={s.icon} alt={s.label} style={{
                width:"clamp(16px,2vw,24px)", height:"clamp(16px,2vw,24px)",
                objectFit:"contain",
                filter: isActive ? `drop-shadow(0 0 6px ${s.color})` : "none",
                transition:"filter 0.3s",
              }}/>
              <span style={{
                fontSize:"clamp(0.58rem,0.85vw,0.78rem)", letterSpacing:"0.05em",
                color: isActive ? s.color : "rgba(203,213,225,0.7)",
                textShadow: isActive ? `0 0 10px ${s.color}` : "none",
                transition:"all 0.3s",
              }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── 15. Metric visual legend (top-left) ── */}
      <div style={{
        position:"absolute", top:"clamp(6px,1vh,14px)", left:"clamp(6px,1.2vw,18px)",
        zIndex:20,
        background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:12, padding:"8px 12px",
        display:"flex", flexDirection:"column", gap:4,
      }}>
        {[
          { label:"Sleep",     val: num(merged.sky.starDensity, 0),      color:"#c4b5fd", icon:"🌙" },
            { label:"Hydration", val: num(merged.river.clarity, 0),        color:"#38bdf8", icon:"💧" },
            { label:"Nutrition", val: num(merged.forest.lushness, 0),      color:"#86efac", icon:"🍎" },
            { label:"Exercise",  val: num(merged.wildlife.foxEnergy, 0),   color:"#fb923c", icon:"🏃" },
            { label:"Mood",      val: num(merged.atmosphere.warmth, 0),    color:"#f9a8d4", icon:"🪷" },
        ].map(m => (
          <div key={m.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"0.65rem" }}>{m.icon}</span>
            <div style={{
              width:"clamp(50px,6vw,80px)", height:4, borderRadius:4,
              background:"rgba(255,255,255,0.1)", overflow:"hidden",
            }}>
              <div style={{
                width:`${(m.val ?? 0)*100}%`, height:"100%",
                background:m.color,
                boxShadow:`0 0 6px ${m.color}`,
                borderRadius:4,
                transition:"width 1.5s ease",
              }}/>
            </div>
            <span style={{ fontSize:"0.55rem", color:"rgba(203,213,225,0.55)", minWidth:28 }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── 16. DEV: Log demo panel (toggle with D key) ── */}
      {showDebug && (
        <div style={{
          position:"absolute", top:"50%", right:16,
          transform:"translateY(-50%)",
          background:"rgba(0,0,15,0.85)", backdropFilter:"blur(12px)",
          border:"1px solid rgba(251,191,36,0.3)", borderRadius:16,
          padding:16, zIndex:30, minWidth:200,
        }}>
          <div style={{ color:"#fde047", fontSize:"0.75rem", letterSpacing:"0.1em", marginBottom:10, textAlign:"center" }}>
            ── Daily Log ──
          </div>
          {["sleep","hydration","nutrition","exercise","mood"].map(k => (
            <div key={k} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <span style={{ color:"rgba(203,213,225,0.8)", fontSize:"0.65rem", textTransform:"capitalize" }}>{k}</span>
                <span style={{ color:"#fde047", fontSize:"0.65rem" }}>{demoLog[k]}/10</span>
              </div>
              <input type="range" min={1} max={10} value={demoLog[k]}
                onChange={e => setDemoLog(p => ({...p,[k]:+e.target.value}))}
                style={{ width:"100%", accentColor:"#f59e0b" }}
              />
            </div>
          ))}
          <button
            onClick={handleDemoSubmit}
            style={{
              width:"100%", marginTop:4, padding:"6px 0",
              borderRadius:20, border:"1px solid #f59e0b",
              background:"rgba(245,158,11,0.2)", color:"#fde047",
              fontSize:"0.7rem", letterSpacing:"0.1em", cursor:"pointer",
              fontFamily:"Georgia,serif",
            }}
          >Apply to Sanctuary</button>
        </div>
      )}

      <KeyListener onD={() => setShowDebug(p => !p)}/>

      {/* ── 17. Companion speech bubble ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        style={{
          position: "absolute",
          bottom: "clamp(90px,14vh,130px)",
          left: "clamp(10px,3vw,20px)",
          right: "clamp(10px,3vw,20px)",
          zIndex: 18,
          background: "rgba(4,6,14,0.88)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(126,200,160,0.22)",
          borderRadius: 20,
          padding: "12px 16px",
          maxHeight: 80,
          overflow: "hidden",
          boxShadow: "0 4px 28px rgba(0,0,0,0.5)",
          cursor: "pointer",
        }}
        onClick={() => navigate("/companion")}
      >
        {/* Speech tail */}
        <div style={{
          position: "absolute", bottom: -8, left: 44,
          width: 0, height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid rgba(4,6,14,0.88)",
        }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3.5, repeat: Infinity }}
            style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}
          >
            {comp.emoji}
          </motion.div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.3)",
              marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>{comp.label}</span>
              <span style={{ color: "rgba(126,200,160,0.45)", fontSize: 9 }}>Tap to speak ›</span>
            </div>
            {loadingNarration ? (
              <div style={{ display: "flex", gap: 5, alignItems: "center", minHeight: 20 }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(126,200,160,0.9)", display: "inline-block" }}
                  />
                ))}
              </div>
            ) : (
              <motion.p
                key={displayNarration}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  fontSize: 13, lineHeight: 1.65,
                  color: "rgba(238,234,226,0.88)",
                  fontStyle: "italic", margin: 0,
                  fontFamily: "Georgia,'Palatino Linotype',serif",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                "{displayNarration}"
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 18. Bottom nav ── */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        height:"clamp(72px,11vh,110px)",
        zIndex:20, display:"flex", alignItems:"stretch",
      }}>
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to top, rgba(0,0,15,0.97) 0%, rgba(0,0,15,0.88) 100%)",
          borderTop:"1px solid rgba(255,255,255,0.07)",
          backdropFilter:"blur(14px)",
        }}/>
        <div style={{
          position:"absolute", top:0, left:"8%", right:"8%", height:1,
          background:"linear-gradient(to right, transparent, rgba(251,191,36,0.45), rgba(251,191,36,0.75), rgba(251,191,36,0.45), transparent)",
          boxShadow:"0 0 10px rgba(251,191,36,0.35)",
        }}/>
        <div style={{
          position:"relative", width:"100%",
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:"clamp(8px,3.5vw,52px)", padding:"0 clamp(16px,3vw,48px)",
        }}>
          {NAV.map(n => {
            const isHov    = navHover === n.id;
            const isCenter = n.isCenter;
            return (
              <div key={n.id}
                onClick={() => handleNavClick(n.route)}
                onMouseEnter={() => setNavHover(n.id)}
                onMouseLeave={() => setNavHover(null)}
                style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                  cursor:"pointer",
                  transform: isCenter
                    ? `translateY(${isHov ? -22 : -18}px) scale(${isHov ? 1.15 : 1.1})`
                    : `translateY(${isHov ? -6 : 0}px) scale(${isHov ? 1.1 : 1})`,
                  transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <div style={{
                  width:  isCenter ? "clamp(54px,7vw,82px)" : "clamp(44px,5.5vw,66px)",
                  height: isCenter ? "clamp(54px,7vw,82px)" : "clamp(44px,5.5vw,66px)",
                  borderRadius:"50%",
                  background: isCenter
                    ? `radial-gradient(circle, rgba(251,191,36,${isHov?0.5:0.35}), rgba(251,146,60,${isHov?0.35:0.22}))`
                    : isHov ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.45)",
                  border: isCenter
                    ? `2px solid ${isHov ? "#fbbf24" : "#f59e0b"}`
                    : `1.5px solid ${isHov ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow: isCenter
                    ? `0 0 ${isHov?24:16}px rgba(251,191,36,${isHov?0.7:0.45}), 0 0 ${isHov?48:32}px rgba(251,191,36,${isHov?0.35:0.2})`
                    : isHov ? "0 0 14px rgba(255,255,255,0.25)" : "none",
                  transition:"all 0.3s", backdropFilter:"blur(6px)", overflow:"hidden",
                }}>
                  {n.icon ? (
                    <img src={n.icon} alt={n.label} style={{
                      width:"72%", height:"72%", objectFit:"contain",
                      filter:`brightness(${isHov?1.3:0.9})`, transition:"filter 0.3s",
                    }}/>
                  ) : (
                    <span style={{ fontSize: isCenter ? "clamp(1.4rem,2.5vw,2rem)" : "clamp(1.1rem,2vw,1.6rem)" }}>
                      {n.emoji}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize:"clamp(0.52rem,0.82vw,0.68rem)", letterSpacing:"0.06em",
                  color: isCenter
                    ? isHov ? "#fbbf24" : "#f59e0b"
                    : isHov ? "rgba(255,255,255,0.9)" : "rgba(203,213,225,0.6)",
                  textShadow: isHov ? isCenter ? "0 0 10px #fbbf24" : "0 0 8px rgba(255,255,255,0.4)" : "none",
                  transition:"all 0.3s",
                }}>{n.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Loading overlay ── */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "rgba(0,0,15,0.9)", border: "1px solid #fbbf24",
            borderRadius: 16, padding: "20px 30px", textAlign: "center"
          }}>
            <div style={{ color: "#fbbf24", marginBottom: 8 }}>Syncing sanctuary...</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
              {[0,1,2].map(i => (
                <motion.div key={i}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Error notification ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 40, background: "rgba(220,38,38,0.9)", color: "white",
            padding: "8px 16px", borderRadius: 8, fontSize: "0.8rem"
          }}
        >
          {error}
        </motion.div>
      )}

      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes ffloat {
          0%   { transform:translate(0,0);                              opacity:0; }
          15%  { opacity:var(--op,0.8); }
          50%  { transform:translate(var(--dx,60px),var(--dy,-40px));   opacity:var(--op,0.8); }
          85%  { opacity:var(--op,0.8); }
          100% { transform:translate(0,0);                              opacity:0; }
        }
        @keyframes bobSlow {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-6px); }
        }
        @keyframes mistL {
          0%   { transform:translateX(-3%) scaleX(1.03); }
          100% { transform:translateX(3%)  scaleX(0.97); }
        }
        @keyframes mistR {
          0%   { transform:translateX(3%)  scaleX(0.97); }
          100% { transform:translateX(-3%) scaleX(1.03); }
        }
        @keyframes leafFall {
          0%   { transform:translate(0,0) rotate(0deg);                       opacity:0; }
          10%  { opacity:0.85; }
          90%  { opacity:0.6; }
          100% { transform:translate(var(--drift,30px),105vh) rotate(360deg); opacity:0; }
        }
        @keyframes snowFall {
          0%   { transform:translate(0,0);                     opacity:0; }
          10%  { opacity:0.8; }
          90%  { opacity:0.5; }
          100% { transform:translate(var(--drift,20px),105vh); opacity:0; }
        }
        @keyframes riverShimmer {
          0%,100% { opacity:0.85; transform:scaleX(1); }
          50%      { opacity:1;    transform:scaleX(1.04); }
        }
        @keyframes flowerPulse {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%      { opacity:1;   transform:scale(1.2); }
        }
        @keyframes companionPulse {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%      { opacity:1;   transform:scale(1.05); }
        }
        @keyframes sparkle {
          0%,100% { opacity:0; transform:scale(0.5); }
          50%      { opacity:1; transform:scale(1.2); }
        }
        @keyframes dailyLogPulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.1); opacity:0.8; }
        }
        @keyframes fadeInOut {
          0%,100% { opacity:0; }
          50%      { opacity:1; }
        }
      `}</style>
    </div>
  );
}

// ── Keyboard shortcut helper ───────────────────────────────────────────────────
function KeyListener({ onD }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "d" || e.key === "D") onD(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onD]);
  return null;
}
