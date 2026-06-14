import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import * as THREE from 'three';
import './LandingPage.css';

const ASSETS = {
  bg: '/assets/background_lp.webp',
};

function createFireflies(count = 120) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.7) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    phases[i] = Math.random() * Math.PI * 2;
    velocities.push({
      x: (Math.random() - 0.5) * 0.003,
      y: Math.random() * 0.002 + 0.001,
    });
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffd67a,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login, register, loading, error, clearError } = useAuthStore();
  
  const canvasRef = useRef(null);
  const sceneRef = useRef({});
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  
  const [isLogin, setIsLogin] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      if (isLogin) {
        await login({ username: formData.username, password: formData.password });
        // Don't navigate - let the routing logic handle existing users
      } else {
        await register({ 
          username: formData.username, 
          email: formData.email, 
          password: formData.password 
        });
        // Don't navigate - let the routing logic handle new users
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };



  // Three.js background setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x080318);

    const scene = new THREE.Scene();
    const camH = 10;
    const camW = camH * (W / H);
    const camera = new THREE.OrthographicCamera(
      -camW / 2, camW / 2, camH / 2, -camH / 2, 0.1, 100
    );
    camera.position.z = 10;

    const loader = new THREE.TextureLoader();
    const bgTex = loader.load(ASSETS.bg);
    bgTex.minFilter = THREE.LinearFilter;

    const bgGeo = new THREE.PlaneGeometry(camW + 3, camH + 2);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: true });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.z = -8;
    scene.add(bg);

    // Fireflies
    const fireflies = createFireflies(180);
    scene.add(fireflies);

    sceneRef.current = { renderer, scene, camera, bg, fireflies, camH, camW };
    setLoaded(true);

    // Animation loop
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.016;

      const ff = fireflies;
      const pos = ff.geometry.attributes.position;
      const { velocities = [], phases = [] } = ff.userData || {};
      
      for (let i = 0; i < Math.min(velocities.length, pos.count); i++) {
        pos.array[i * 3] += (velocities[i]?.x || 0) + Math.sin(t * 0.5 + (phases[i] || 0)) * 0.002;
        pos.array[i * 3 + 1] += (velocities[i]?.y || 0) + Math.cos(t * 0.3 + (phases[i] || 0)) * 0.002;
        
        if (pos.array[i * 3] > 8) pos.array[i * 3] = -8;
        if (pos.array[i * 3] < -8) pos.array[i * 3] = 8;
        if (pos.array[i * 3 + 1] > 4) pos.array[i * 3 + 1] = -4;
      }
      pos.needsUpdate = true;
      
      ff.material.opacity = 0.6 + Math.sin(t * 1.5) * 0.3;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W2 = window.innerWidth, H2 = window.innerHeight;
      renderer.setSize(W2, H2);
      const cW2 = camH * (W2 / H2);
      camera.left = -cW2 / 2; camera.right = cW2 / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  const onMouseMove = useCallback((e) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth - 0.5,
      y: e.clientY / window.innerHeight - 0.5,
    };
  }, []);

  return (
    <div className="lp-root" onMouseMove={onMouseMove}>
      <canvas ref={canvasRef} className="lp-canvas" />
      
      <div className={`lp-ui ${loaded ? 'lp-ui--visible' : ''}`}>
        <div className="login-container">
          <div className="login-header">
            <div className="lp-emblem">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 15 Q40 20 40 35 Q40 50 50 58 Q60 50 60 35 Q60 20 50 15Z"/>
                <path d="M28 40 Q18 45 18 55 Q20 70 35 72 Q40 60 35 45 Q32 40 28 40Z"/>
                <path d="M72 40 Q82 45 82 55 Q80 70 65 72 Q60 60 65 45 Q68 40 72 40Z"/>
              </svg>
            </div>
            <h1 className="login-title">HealthQuest</h1>
            <p className="login-subtitle">Your sanctuary remembers you</p>
          </div>

          <div className="login-tabs">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setFormData({ username: '', email: '', password: '' });
              }}
              className={`login-tab ${isLogin ? 'active' : ''}`}
            >
              Return Home
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setFormData({ username: '', email: '', password: '' });
              }}
              className={`login-tab ${!isLogin ? 'active' : ''}`}
            >
              Begin Journey
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="login-input"
                placeholder="Choose a name for your journey"
              />
            </div>

            {!isLogin && (
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="login-input"
                  placeholder="your.email@example.com"
                />
              </div>
            )}

            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="login-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-submit lp-btn lp-btn--primary"
            >
              <span className="lp-btn__glow" />
              <span className="lp-btn__text">
                {loading ? 'Opening sanctuary...' : (isLogin ? 'Enter Sanctuary' : 'Begin Journey')}
              </span>
            </button>
          </form>

          <div className="login-footer">
            Your companion remembers every step of the journey.
          </div>
        </div>
      </div>
    </div>
  );
}
