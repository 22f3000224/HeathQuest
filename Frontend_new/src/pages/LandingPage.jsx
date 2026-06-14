import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// ─── Asset paths ────────────────────────────────────────────────────────────
// Use the cleaned fox assets (fox_idle_clean.png / fox_blinking_clean.png)
// Place them in the same folder as the originals
const FOX_X = -0.20;
const FOX_Y = -0.25;

const ASSETS = {
  bg: '/assets/background_lp.webp',
  fox: {
    idle:     '/assets/Characters/Fox/fox_idle_clean.webp',
    blinking: '/assets/Characters/Fox/fox_blinking_clean.webp',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createPlane(texture, width, height, z) {
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = z;
  return mesh;
}

function createFireflies(count = 180) {
  const geo        = new THREE.BufferGeometry();
  const positions  = new Float32Array(count * 3);
  const phases     = new Float32Array(count);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.7) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    phases[i] = Math.random() * Math.PI * 2;
    velocities.push({
      x: (Math.random() - 0.5) * 0.005,
      y: Math.random() * 0.003 + 0.001,
    });
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffd67a,
    size: 0.22,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  pts.userData = { velocities, phases };
  return pts;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const canvasRef = useRef(null);
  const sceneRef  = useRef({});
  const rafRef    = useRef(null);
  const navigate  = useNavigate();
  const mouseRef  = useRef({ x: 0, y: 0 });
  const [loaded, setLoaded]     = useState(false);
  const [btnHover, setBtnHover] = useState(null);

  // ── Three.js init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x080318);

    const scene  = new THREE.Scene();
    const camH   = 10;
    const camW   = camH * (W / H);
    const camera = new THREE.OrthographicCamera(
      -camW / 2, camW / 2, camH / 2, -camH / 2, 0.1, 100
    );
    camera.position.z = 10;

    const loader = new THREE.TextureLoader();
    const load   = (url) => loader.load(url);

    // ── Background ─────────────────────────────────────────────────────────
    const bgTex = load(ASSETS.bg);
    bgTex.minFilter = THREE.LinearFilter;
    const bg = createPlane(bgTex, camW + 3, camH + 2, -8);
    scene.add(bg);

    // Vignette for contrast
    const vigCanvas = document.createElement('canvas');
    vigCanvas.width = vigCanvas.height = 512;
    const ctx = vigCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 60, 256, 256, 360);
    grad.addColorStop(0,   'rgba(0,0,0,0)');
    grad.addColorStop(0.6, 'rgba(4,2,18,0.25)');
    grad.addColorStop(1,   'rgba(4,2,18,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const vigMesh = createPlane(new THREE.CanvasTexture(vigCanvas), camW * 1.05, camH * 1.05, -1);
    scene.add(vigMesh);

    // ── Fox — bottom-left, blends via NormalBlending on cleaned PNG ────────
    const foxIdleTex  = load(ASSETS.fox.idle);
    const foxBlinkTex = load(ASSETS.fox.blinking);

    // Premultiplied alpha helps the cleaned PNG blend cleanly
    [foxIdleTex, foxBlinkTex].forEach(t => { t.premultiplyAlpha = true; });

    // Reduced fox size
    const foxH = camH * 0.38;
    const foxW = foxH * (1536 / 1024);
    // Use a ShaderMaterial to discard baked halo fragments (near-white, semi-transparent)
    const foxUniforms = {
      map: { value: foxIdleTex },
      // Slight warm dusk tint and slightly reduced brightness for natural blend
      color: { value: new THREE.Color(0.85, 0.75, 0.65) },
      threshold: { value: 0.65 },
    };

    const foxMat = new THREE.ShaderMaterial({
      uniforms: foxUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 color;
        uniform float threshold;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture(map, vUv);
          // discard fragments that are semi-transparent (baked halo)
          if (tex.a < threshold) discard;
          gl_FragColor = vec4(tex.rgb * color, tex.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    // Ensure the material's map updates when we swap textures during blink
    foxMat.onBeforeCompile = (shader) => { /* placeholder so HMR sees shader */ };
    const foxMesh = new THREE.Mesh(new THREE.PlaneGeometry(foxW, foxH), foxMat);
    // Flip horizontally so the fox faces toward the horizon (observing the world)
    foxMesh.scale.x = -1;
    // Position fox back and left on flat area
    foxMesh.position.set(camW * FOX_X, camH * FOX_Y, -2);
    scene.add(foxMesh);

    // ── Fireflies ─────────────────────────────────────────────────────────
    const fireflies = createFireflies(320);
    scene.add(fireflies);

    sceneRef.current = {
      renderer, scene, camera, bg, vigMesh,
      fox: { mesh: foxMesh, idleTex: foxIdleTex, blinkTex: foxBlinkTex, material: foxMat },
      fireflies, camH, camW,
    };

    setTimeout(() => setLoaded(true), 700);

    // ── Animation loop ────────────────────────────────────────────────────
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.016;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // bg.position.x = mx * 0.20;
      // bg.position.y = my * 0.10;

      foxMesh.position.y = sceneRef.current.camH * FOX_Y + Math.sin(t * 0.85) * 0.055;
      foxMesh.position.x = sceneRef.current.camW * FOX_X;

      const ff  = fireflies;
      const pos = ff.geometry.attributes.position;
      const { velocities, phases } = ff.userData;
      for (let i = 0; i < velocities.length; i++) {
        pos.array[i * 3]     += velocities[i].x + Math.sin(t * 0.7 + phases[i]) * 0.004;
        pos.array[i * 3 + 1] += velocities[i].y + Math.cos(t * 0.5 + phases[i]) * 0.003;
        if (pos.array[i * 3]     >  10) pos.array[i * 3]     = -10;
        if (pos.array[i * 3]     < -10) pos.array[i * 3]     =  10;
        if (pos.array[i * 3 + 1] >   5) pos.array[i * 3 + 1] = -5.5;
      }
      pos.needsUpdate = true;
      // Stronger, warmer firefly glow modulation
      ff.material.opacity = 0.75 + Math.sin(t * 2.2) * 0.40;

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      const W2 = window.innerWidth, H2 = window.innerHeight;
      renderer.setSize(W2, H2);
      const cW2 = camH * (W2 / H2);
      camera.left = -cW2 / 2; camera.right = cW2 / 2;
      camera.updateProjectionMatrix();
      sceneRef.current.camW = cW2;
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  // ── Mouse parallax ────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth  - 0.5,
      y: e.clientY / window.innerHeight - 0.5,
    };
  }, []);

  // ── Fox blink cycle ───────────────────────────────────────────────────────
  useEffect(() => {
    const timeoutRef = { current: null };
    const blink = () => {
      const { fox } = sceneRef.current;
      if (!fox?.mesh) return;
      // swap the uniform map for blink texture
      if (fox.material && fox.material.uniforms && fox.material.uniforms.map) {
        fox.material.uniforms.map.value = fox.blinkTex;
      } else if (fox.mesh.material) {
        fox.mesh.material.map = fox.blinkTex;
        fox.mesh.material.needsUpdate = true;
      }
      setTimeout(() => {
        if (!fox?.mesh) return;
        if (fox.material && fox.material.uniforms && fox.material.uniforms.map) {
          fox.material.uniforms.map.value = fox.idleTex;
        } else {
          fox.mesh.material.map = fox.idleTex;
          fox.mesh.material.needsUpdate = true;
        }
      }, 180);
    };
    const schedule = () => {
      timeoutRef.current = setTimeout(() => { blink(); schedule(); }, 2800 + Math.random() * 5000);
    };
    schedule();
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="lp-root" onMouseMove={onMouseMove}>
      <canvas ref={canvasRef} className="lp-canvas" />

      <div className={`lp-ui ${loaded ? 'lp-ui--visible' : ''}`}>

        {/* CSS Title — no image asset */}
        <div className="lp-title-wrap">
          <div className="lp-logo">

          <div className="lp-emblem">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 15 Q40 20 40 35 Q40 50 50 58 Q60 50 60 35 Q60 20 50 15Z"/>
              <path d="M28 40 Q18 45 18 55 Q20 70 35 72 Q40 60 35 45 Q32 40 28 40Z"/>
              <path d="M72 40 Q82 45 82 55 Q80 70 65 72 Q60 60 65 45 Q68 40 72 40Z"/>
            </svg>
          </div>

            <h1 className="lp-logo__text">HealthQuest</h1>
          </div>
          <p className="lp-subtitle">Build a world that reflects your life.</p>
        </div>

        {/* Buttons */}
        <div className="lp-buttons">
          <button
            className={`lp-btn lp-btn--primary ${btnHover === 'begin' ? 'lp-btn--hovered' : ''}`}
            onMouseEnter={() => setBtnHover('begin')}
            onMouseLeave={() => setBtnHover(null)}
            onClick={() => navigate('/login')}
          >
            <span className="lp-btn__glow" />
            <span className="lp-btn__text">Begin Journey</span>
          </button>

          <button
            className={`lp-btn lp-btn--secondary ${btnHover === 'continue' ? 'lp-btn--hovered' : ''}`}
            onMouseEnter={() => setBtnHover('continue')}
            onMouseLeave={() => setBtnHover(null)}
            onClick={() => navigate('/login')}
          >
            <span className="lp-btn__glow" />
            <span className="lp-btn__text">Return to Sanctuary</span>
          </button>
        </div>

      </div>
    </div>
  );
}
