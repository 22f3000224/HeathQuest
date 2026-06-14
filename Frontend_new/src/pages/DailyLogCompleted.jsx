import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSanctuaryStore } from "../store/useSanctuaryStore";
import { checkDailyLogStatus, fetchTodayLog } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

const ASSETS = {
  background: "/assets/DailyLog/DailyLogBG.webp",
  fox: "/assets/DailyLog/fox.webp",
};

export default function DailyLogCompleted() {
  const navigate = useNavigate();
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const getUserId = useAuthStore(s => s.getUserId);

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const userId = getUserId();
        const [status, log] = await Promise.all([
          checkDailyLogStatus(userId),
          fetchTodayLog(userId)
        ]);
        
        if (!status.has_logged_today) {
          // User hasn't logged today, redirect to daily log
          navigate('/dailylog', { replace: true });
          return;
        }
        
        setTodayLog(log);
      } catch (error) {
        console.error('Failed to fetch today log:', error);
        navigate('/sanctuaryworld', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayData();
  }, [getUserId, navigate]);

  const formatLogValue = (key, value) => {
    const mappings = {
      sleep: ['< 5 hrs', '5-6 hrs', '7-8 hrs', '8+ hrs'],
      water: ['< 3 glasses', '3-5 glasses', '6-8 glasses', '8+ glasses'],
      exercise: ['None', 'Light', 'Moderate', 'Intense'],
      nutrition: ['Poor', 'Fair', 'Good', 'Excellent'],
      mood: ['😞 Low', '😐 Okay', '🙂 Good', '😄 Great']
    };
    
    const options = mappings[key];
    if (options && typeof value === 'number' && value >= 1 && value <= 4) {
      return options[value - 1];
    }
    return String(value);
  };

  const getHealthScore = (log) => {
    if (!log) return 0;
    const total = (log.sleep || 0) + (log.water || 0) + (log.exercise || 0) + (log.nutrition || 0) + (log.mood || 0);
    return Math.round((total / 20) * 100); // Convert to percentage
  };

  if (loading) {
    return (
      <div style={styles.root}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingText}>Loading today's log...</div>
        </div>
      </div>
    );
  }

  const healthScore = getHealthScore(todayLog);
  const completedTime = todayLog?.created_at ? 
    new Date(todayLog.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
    'Earlier today';

  return (
    <div style={styles.root}>
      {/* Background */}
      <div
        style={{
          ...styles.bgLayer,
          backgroundImage: `url(${ASSETS.background})`,
        }}
      />
      
      {/* Vignette */}
      <div style={styles.vignette} />
      
      {/* Content */}
      <div style={styles.overlay}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.checkmark}>✓</div>
          <h1 style={styles.title}>Daily Log Completed</h1>
          <p style={styles.subtitle}>Completed at {completedTime}</p>
        </div>

        {/* Today's Summary Card */}
        <div style={styles.summaryCard}>
          <div style={styles.scoreSection}>
            <div style={styles.scoreCircle}>
              <span style={styles.scoreText}>{healthScore}%</span>
            </div>
            <p style={styles.scoreLabel}>Today's Wellness Score</p>
          </div>
          
          <div style={styles.logDetails}>
            <div style={styles.logRow}>
              <span style={styles.logIcon}>🌙</span>
              <span style={styles.logLabel}>Sleep:</span>
              <span style={styles.logValue}>{formatLogValue('sleep', todayLog?.sleep)}</span>
            </div>
            <div style={styles.logRow}>
              <span style={styles.logIcon}>💧</span>
              <span style={styles.logLabel}>Hydration:</span>
              <span style={styles.logValue}>{formatLogValue('water', todayLog?.water)}</span>
            </div>
            <div style={styles.logRow}>
              <span style={styles.logIcon}>🍎</span>
              <span style={styles.logLabel}>Nutrition:</span>
              <span style={styles.logValue}>{formatLogValue('nutrition', todayLog?.nutrition)}</span>
            </div>
            <div style={styles.logRow}>
              <span style={styles.logIcon}>⚡</span>
              <span style={styles.logLabel}>Exercise:</span>
              <span style={styles.logValue}>{formatLogValue('exercise', todayLog?.exercise)}</span>
            </div>
            <div style={styles.logRow}>
              <span style={styles.logIcon}>✨</span>
              <span style={styles.logLabel}>Mood:</span>
              <span style={styles.logValue}>{formatLogValue('mood', todayLog?.mood)}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={styles.messageCard}>
          <p style={styles.message}>
            Your sanctuary has recorded today's journey. Return tomorrow to continue nurturing your wellness.
          </p>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button 
            style={styles.primaryBtn}
            onClick={() => navigate('/sanctuaryworld')}
          >
            Return to Sanctuary
          </button>
          <button 
            style={styles.secondaryBtn}
            onClick={() => navigate('/chronicle')}
          >
            View Chronicle
          </button>
        </div>
      </div>

      {/* Fox companion */}
      <div style={styles.foxContainer}>
        <img src={ASSETS.fox} alt="Fox companion" style={styles.foxImg} />
      </div>
    </div>
  );
}

const styles = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Lato', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%)",
    zIndex: 1,
  },

  overlay: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    maxWidth: 480,
    padding: 24,
  },

  loadingContainer: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  loadingText: {
    color: "#f0e8d0",
    fontSize: 18,
    fontFamily: "'Cinzel', serif",
  },

  header: {
    textAlign: "center",
    marginBottom: 16,
  },

  checkmark: {
    fontSize: 48,
    color: "#4ade80",
    marginBottom: 8,
    textShadow: "0 0 20px rgba(74,222,128,0.6)",
  },

  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(24px, 4vw, 32px)",
    color: "#f0e8d0",
    margin: 0,
    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
  },

  subtitle: {
    color: "#a0b8d0",
    fontSize: 14,
    margin: "4px 0 0 0",
  },

  summaryCard: {
    background: "rgba(8,6,20,0.85)",
    border: "1px solid rgba(120,80,220,0.3)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },

  scoreSection: {
    textAlign: "center",
    marginBottom: 20,
  },

  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "3px solid #4ade80",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 8px",
    background: "rgba(74,222,128,0.1)",
    boxShadow: "0 0 20px rgba(74,222,128,0.3)",
  },

  scoreText: {
    fontSize: 18,
    fontWeight: 600,
    color: "#4ade80",
  },

  scoreLabel: {
    color: "#a0b8d0",
    fontSize: 12,
    margin: 0,
  },

  logDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  logRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },

  logIcon: {
    fontSize: 18,
    width: 24,
  },

  logLabel: {
    color: "#b0c4d8",
    fontSize: 14,
    minWidth: 80,
  },

  logValue: {
    color: "#f0e8d0",
    fontSize: 14,
    fontWeight: 500,
    marginLeft: "auto",
  },

  messageCard: {
    background: "rgba(8,6,20,0.7)",
    border: "1px solid rgba(100,180,255,0.2)",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    textAlign: "center",
  },

  message: {
    color: "#c8d8e8",
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
    fontStyle: "italic",
  },

  actions: {
    display: "flex",
    gap: 12,
    width: "100%",
  },

  primaryBtn: {
    flex: 2,
    padding: "12px 24px",
    background: "linear-gradient(135deg, #4ade80, #22c55e)",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    fontFamily: "'Cinzel', serif",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 16px rgba(74,222,128,0.3)",
  },

  secondaryBtn: {
    flex: 1,
    padding: "12px 20px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 12,
    color: "#b0c4d8",
    fontSize: 14,
    fontFamily: "'Lato', sans-serif",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  foxContainer: {
    position: "absolute",
    bottom: 40,
    right: 60,
    zIndex: 5,
  },

  foxImg: {
    width: 120,
    height: 90,
    objectFit: "contain",
    transform: "scaleX(-1)",
    filter: "drop-shadow(0 4px 12px rgba(255,140,0,0.4))",
  },
};