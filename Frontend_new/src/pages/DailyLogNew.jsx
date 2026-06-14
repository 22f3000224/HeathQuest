import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSanctuaryStore } from "../store/useSanctuaryStore";
import { checkDailyLogStatus } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

// Component to show when user has already logged today
function DailyLogCompleted({ todayLog, onClose }) {
  return (
    <div style={styles.completedContainer}>
      <div style={styles.completedHeader}>
        <div style={styles.checkmark}>✓</div>
        <h1 style={styles.completedTitle}>Daily Log Completed</h1>
        <p style={styles.completedSubtitle}>
          You've already submitted your log for today. Come back tomorrow!
        </p>
      </div>
      
      <div style={styles.logSummary}>
        <h3 style={styles.summaryTitle}>Today's Health Summary</h3>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>🌙</span>
            <span style={styles.summaryLabel}>Sleep</span>
            <span style={styles.summaryValue}>{todayLog.sleep} hours</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>💧</span>
            <span style={styles.summaryLabel}>Hydration</span>
            <span style={styles.summaryValue}>{todayLog.water} glasses</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>🍎</span>
            <span style={styles.summaryLabel}>Nutrition</span>
            <span style={styles.summaryValue}>{todayLog.nutrition}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>⚡</span>
            <span style={styles.summaryLabel}>Exercise</span>
            <span style={styles.summaryValue}>{todayLog.exercise}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryIcon}>✨</span>
            <span style={styles.summaryLabel}>Mood</span>
            <span style={styles.summaryValue}>Level {todayLog.mood}</span>
          </div>
        </div>
        
        <div style={styles.completionTime}>
          <p>Logged at: {new Date(todayLog.date).toLocaleDateString()}</p>
        </div>
      </div>
      
      <button style={styles.returnButton} onClick={onClose}>
        Return to Sanctuary
      </button>
    </div>
  );
}

// Loading component
function DailyLogLoading() {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingSpinner}></div>
      <p style={styles.loadingText}>Checking your daily log status...</p>
    </div>
  );
}

// Error component
function DailyLogError({ error, onRetry }) {
  return (
    <div style={styles.errorContainer}>
      <div style={styles.errorIcon}>⚠️</div>
      <h2 style={styles.errorTitle}>Unable to Load Daily Log</h2>
      <p style={styles.errorMessage}>{error}</p>
      <button style={styles.retryButton} onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// Main Daily Log component
export default function DailyLogPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { todayLog, submitLog, checkDailyLogStatus, loading, error } = useSanctuaryStore();
  
  const [logStatus, setLogStatus] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check daily log status on mount
  useEffect(() => {
    async function checkStatus() {
      if (!user?.id) {
        setPageError("User not authenticated");
        setPageLoading(false);
        return;
      }

      try {
        setPageLoading(true);
        setPageError(null);
        
        const status = await checkDailyLogStatus(user.id);
        setLogStatus(status);
        
        // If user has logged today, we need the actual log data
        if (status.has_logged_today && !todayLog) {
          // Trigger store to fetch today's log
          await useSanctuaryStore.getState().fetchLogs();
        }
        
      } catch (error) {
        console.error('Failed to check daily log status:', error);
        setPageError(error.message);
      } finally {
        setPageLoading(false);
      }
    }

    checkStatus();
  }, [user?.id]);

  // Handle log submission
  const handleSubmitLog = async (logData) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await submitLog(logData);
      
      // Refresh status after successful submission
      const newStatus = await checkDailyLogStatus(user.id);
      setLogStatus(newStatus);
      
    } catch (error) {
      console.error('Failed to submit log:', error);
      // Show user-friendly error message
      if (error.message.includes('already completed')) {
        setPageError("You've already logged today. Only one log per day is allowed.");
      } else {
        setPageError("Failed to submit log. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setPageError(null);
    window.location.reload();
  };

  // Handle return to sanctuary
  const handleReturn = () => {
    navigate('/sanctuary');
  };

  // Loading state
  if (pageLoading || loading) {
    return <DailyLogLoading />;
  }

  // Error state
  if (pageError || error) {
    return <DailyLogError error={pageError || error} onRetry={handleRetry} />;
  }

  // Already logged today - show completion view
  if (logStatus?.has_logged_today && todayLog) {
    return <DailyLogCompleted todayLog={todayLog} onClose={handleReturn} />;
  }

  // Show regular daily log form
  return (
    <div style={styles.container}>
      <DailyLogForm 
        onSubmit={handleSubmitLog}
        isSubmitting={isSubmitting}
        onCancel={handleReturn}
      />
    </div>
  );
}

// Daily Log Form Component (simplified version of original)
function DailyLogForm({ onSubmit, isSubmitting, onCancel }) {
  const [logData, setLogData] = useState({
    sleep: 7,
    hydration: 6,
    nutrition: 'good',
    exercise: 'moderate',
    mood: 3
  });

  const handleSubmit = () => {
    if (isSubmitting) return;
    onSubmit(logData);
  };

  return (
    <div style={styles.formContainer}>
      <div style={styles.header}>
        <h1 style={styles.title}>Daily Health Log</h1>
        <p style={styles.subtitle}>Record your wellness journey for today</p>
      </div>

      <div style={styles.aspectsContainer}>
        {/* Sleep */}
        <div style={styles.aspect}>
          <div style={styles.aspectHeader}>
            <span style={styles.aspectIcon}>🌙</span>
            <h3 style={styles.aspectTitle}>Sleep</h3>
          </div>
          <p style={styles.aspectQuestion}>How many hours did you sleep?</p>
          <input
            type="range"
            min="3"
            max="12"
            value={logData.sleep}
            onChange={(e) => setLogData({...logData, sleep: parseInt(e.target.value)})}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>{logData.sleep} hours</span>
        </div>

        {/* Hydration */}
        <div style={styles.aspect}>
          <div style={styles.aspectHeader}>
            <span style={styles.aspectIcon}>💧</span>
            <h3 style={styles.aspectTitle}>Hydration</h3>
          </div>
          <p style={styles.aspectQuestion}>How many glasses of water?</p>
          <input
            type="range"
            min="1"
            max="12"
            value={logData.hydration}
            onChange={(e) => setLogData({...logData, hydration: parseInt(e.target.value)})}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>{logData.hydration} glasses</span>
        </div>

        {/* Nutrition */}
        <div style={styles.aspect}>
          <div style={styles.aspectHeader}>
            <span style={styles.aspectIcon}>🍎</span>
            <h3 style={styles.aspectTitle}>Nutrition</h3>
          </div>
          <p style={styles.aspectQuestion}>How was your nutrition today?</p>
          <select 
            value={logData.nutrition}
            onChange={(e) => setLogData({...logData, nutrition: e.target.value})}
            style={styles.select}
          >
            <option value="poor">Poor</option>
            <option value="okay">Okay</option>
            <option value="good">Good</option>
            <option value="great">Great</option>
          </select>
        </div>

        {/* Exercise */}
        <div style={styles.aspect}>
          <div style={styles.aspectHeader}>
            <span style={styles.aspectIcon}>⚡</span>
            <h3 style={styles.aspectTitle}>Exercise</h3>
          </div>
          <p style={styles.aspectQuestion}>Did you exercise today?</p>
          <select 
            value={logData.exercise}
            onChange={(e) => setLogData({...logData, exercise: e.target.value})}
            style={styles.select}
          >
            <option value="none">None</option>
            <option value="light">Light walk</option>
            <option value="moderate">Moderate</option>
            <option value="intense">Intense</option>
          </select>
        </div>

        {/* Mood */}
        <div style={styles.aspect}>
          <div style={styles.aspectHeader}>
            <span style={styles.aspectIcon}>✨</span>
            <h3 style={styles.aspectTitle}>Mood</h3>
          </div>
          <p style={styles.aspectQuestion}>How is your mood today?</p>
          <input
            type="range"
            min="1"
            max="4"
            value={logData.mood}
            onChange={(e) => setLogData({...logData, mood: parseInt(e.target.value)})}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>
            {logData.mood === 1 ? "😞 Low" : 
             logData.mood === 2 ? "😐 Okay" :
             logData.mood === 3 ? "🙂 Good" : "😄 Great"}
          </span>
        </div>
      </div>

      <div style={styles.actions}>
        <button style={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button 
          style={{
            ...styles.submitButton,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : '✓ Submit Log'}
        </button>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
    color: 'white',
    padding: '20px',
  },
  
  // Loading styles
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    color: 'white',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #44ccff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '16px',
    opacity: 0.8,
  },
  
  // Error styles
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    color: 'white',
    padding: '20px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '24px',
    marginBottom: '12px',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: '16px',
    marginBottom: '24px',
    textAlign: 'center',
    opacity: 0.8,
  },
  retryButton: {
    padding: '12px 24px',
    background: '#44ccff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  
  // Completed styles
  completedContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    color: 'white',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedHeader: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  checkmark: {
    fontSize: '64px',
    color: '#4dff91',
    marginBottom: '16px',
  },
  completedTitle: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  completedSubtitle: {
    fontSize: '18px',
    opacity: 0.8,
  },
  
  logSummary: {
    background: 'rgba(255,255,255,0.05)',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '600px',
    width: '100%',
    marginBottom: '32px',
  },
  summaryTitle: {
    fontSize: '20px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    gap: '12px',
  },
  summaryIcon: {
    fontSize: '24px',
  },
  summaryLabel: {
    flex: 1,
    fontSize: '14px',
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  completionTime: {
    textAlign: 'center',
    fontSize: '14px',
    opacity: 0.6,
  },
  returnButton: {
    padding: '16px 32px',
    background: '#44ccff',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  
  // Form styles
  formContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'rgba(255,255,255,0.05)',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    opacity: 0.8,
  },
  
  aspectsContainer: {
    display: 'grid',
    gap: '24px',
    marginBottom: '32px',
  },
  aspect: {
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  aspectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  aspectIcon: {
    fontSize: '24px',
  },
  aspectTitle: {
    fontSize: '18px',
    margin: 0,
  },
  aspectQuestion: {
    fontSize: '14px',
    opacity: 0.8,
    marginBottom: '16px',
  },
  
  slider: {
    width: '100%',
    marginBottom: '8px',
  },
  sliderValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#44ccff',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
  },
  
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  cancelButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  submitButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #4dff91, #44ccff)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};