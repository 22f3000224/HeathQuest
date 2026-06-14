import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiService, API_BASE } from "../services/api.js";
import { useAuthStore } from "./useAuthStore.js";

/**
 * Daily log shape:
 * {
 *   date: "2026-06-07",          // ISO date string
 *   sleep:     number,  // 1-10
 *   hydration: number,  // 1-10
 *   nutrition: number,  // 1-10
 *   exercise:  number,  // 1-10
 *   mood:      number,  // 1-10
 *   notes?:    string,
 * }
 *
 * Visual state derived from today's log (or last known log):
 * {
 *   sky:      { starDensity, moonBrightness, cloudCover }   ← Sleep
 *   river:    { clarity, shimmer, flowSpeed }                ← Hydration
 *   forest:   { lushness, flowerGlow, saturation }          ← Nutrition
 *   wildlife: { foxEnergy, campfireIntensity }               ← Exercise
 *   mood:     { fireflyCount, mistDensity, warmth }          ← Mood
 * }
 */

// Maps a 1-10 score to a 0-1 normalized value
const n = (score) => Math.max(0, Math.min(10, score)) / 10;

// Derive visual state from a log entry
export function deriveVisuals(log) {
  const sleep     = n(log.sleep     ?? 5);
  const hydration = n(log.hydration ?? 5);
  const nutrition = n(log.nutrition ?? 5);
  const exercise  = n(log.exercise  ?? 5);
  const mood      = n(log.mood      ?? 5);

  return {
    sky: {
      starDensity:     sleep,                        // 0 = few stars, 1 = dense starfield
      moonBrightness:  0.3 + sleep * 0.7,           // dim moon → brilliant moon
      cloudCover:      1 - sleep,                   // poor sleep = heavy clouds
    },
    river: {
      clarity:   hydration,                         // murky → crystal clear
      shimmer:   0.2 + hydration * 0.8,             // faint → intense shimmer
      flowSpeed: 0.4 + hydration * 0.6,             // sluggish → rushing
    },
    forest: {
      lushness:   nutrition,                        // bare → lush
      flowerGlow: nutrition,                        // no glow → vivid blue flowers
      saturation: 0.4 + nutrition * 0.6,           // desaturated → vivid greens
    },
    wildlife: {
      foxEnergy:         exercise,                  // slow idle → active
      campfireIntensity: 0.3 + exercise * 0.7,     // ember → roaring fire
    },
    atmosphere: {
      fireflyCount:  Math.round(4 + mood * 28),    // 4 → 32 fireflies
      mistDensity:   mood < 0.4 ? 0.35 : mood > 0.7 ? 0.12 : 0.22,
      warmth:        mood,                          // cool blue → warm amber tint
      // tint color: low mood = cool blue, high mood = warm gold
      tintColor:     mood < 0.4
        ? `rgba(96,165,250,${0.08 + (0.4-mood)*0.15})`   // blue tint
        : mood > 0.7
          ? `rgba(251,191,36,${0.05 + (mood-0.7)*0.15})` // gold tint
          : "rgba(134,239,172,0.06)",                     // neutral green
    },
  };
}

const DEFAULT_LOG = {
  date:      new Date().toISOString().slice(0,10),
  sleep:     5,
  hydration: 5,
  nutrition: 5,
  exercise:  5,
  mood:      5,
};

// Returns a user-scoped storage key so each user's data is isolated
function getUserScopedStorage() {
  return {
    getItem: (name) => {
      const { user } = useAuthStore.getState();
      if (!user?.id) return null; // No user, no data
      const key = `${name}__u${user.id}`;
      const str = localStorage.getItem(key);
      return str ? JSON.parse(str) : null;
    },
    setItem: (name, value) => {
      const { user } = useAuthStore.getState();
      if (!user?.id) return; // No user, don't save
      const key = `${name}__u${user.id}`;
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (name) => {
      const { user } = useAuthStore.getState();
      if (!user?.id) return;
      const key = `${name}__u${user.id}`;
      localStorage.removeItem(key);
    },
  };
}

// Reset function called on logout to clear in-memory state
export function resetSanctuaryStore() {
  useSanctuaryStore.setState({
    logs: [], 
    todayLog: null, 
    environment: null, 
    companion: null, 
    sanctuary: null,
    goals: [],
    season: 'spring', 
    seasonPoints: 0,  // Reset to 0 for new users
    visuals: deriveVisuals(DEFAULT_LOG),
    loading: false,
    error: null
  });
  
  // Also clear any cached localStorage data for the current user
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('healthquest-sanctuary')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('Failed to clear sanctuary cache:', e);
  }
}

export const useSanctuaryStore = create(
  persist(
    (set, get) => ({
      // ── Logs ──────────────────────────────────────────────────────────────
      logs: [],          // array of daily log objects, newest first
      todayLog: null,    // today's log if submitted, else null
      loading: false,    // loading state for API calls
      error: null,       // error state

      // ── Derived visuals ────────────────────────────────────────────────
      visuals: deriveVisuals(DEFAULT_LOG),

      // ── Sanctuary setup ────────────────────────────────────────────────
      environment: null,        // null until user completes SanctuaryCreation
      companion:   null,        // "fox" | "owl" | "turtle"
      sanctuary:   null,        // sanctuary state from backend
      goals:       [],          // selected goal ids from SanctuaryCreation

      // ── Season ────────────────────────────────────────────────────────
      season:         "spring",
      seasonPoints:   0,  // Start with 0 for new users

      // ── Actions ───────────────────────────────────────────────────────

      // ── API Actions ────────────────────────────────────────────────────
      
      /** Initialize sanctuary from backend on login */
      initializeFromBackend: async () => {
        set({ loading: true, error: null });
        try {
          const userId = useAuthStore.getState().getUserId();
          const { initializeUserState } = await import('../services/api.js');
          const { reconstructSanctuaryState } = await import('../services/sanctuaryReconstructor.js');
          
          const initData = await initializeUserState(userId);
          
          if (initData) {
            // Use reconstruction service to build complete state
            const reconstructedState = reconstructSanctuaryState(initData);
            
            // Apply reconstructed state - COMPLETE replacement
            set({
              logs: reconstructedState.logs,
              todayLog: reconstructedState.todayLog,
              visuals: reconstructedState.visuals,
              season: reconstructedState.season,
              seasonPoints: reconstructedState.seasonPoints,
              companion: reconstructedState.companion,
              environment: reconstructedState.environment,
              sanctuary: reconstructedState.sanctuary, // Add sanctuary object
              loading: false,
              error: null
            });
            
            console.log('Sanctuary reconstructed from database:', {
              logs_count: reconstructedState.logs.length,
              today_logged: reconstructedState.hasLoggedToday,
              total_xp: reconstructedState.progression.totalXP,
              sanctuary_level: reconstructedState.progression.level,
              setup_complete: reconstructedState.setup.is_complete
            });
          } else {
            throw new Error('No initialization data received');
          }
        } catch (error) {
          console.error('Failed to initialize from backend:', error);
          set({ error: error.message, loading: false });
        }
      },

      // Backwards-compatible alias expected by App.jsx
      initializeSanctuary: async () => {
        return get().initializeFromBackend();
      },

      /** Check if user can log today - with proper error handling */
      checkDailyLogStatus: async () => {
        try {
          const userId = useAuthStore.getState().getUserId();
          const { checkDailyLogStatus } = await import('../services/api.js');
          const status = await checkDailyLogStatus(userId);
          return status;
        } catch (error) {
          console.error('Failed to check daily log status:', error);
          return { has_logged_today: false };
        }
      },

      /** Fetch all logs from backend */
      fetchLogs: async () => {
        set({ loading: true, error: null });
        try {
          const userId = useAuthStore.getState().getUserId();
          const response = await fetch(`${API_BASE}/api/logs/${userId}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            // If logs don't exist yet, that's okay - just return empty array
            if (response.status === 404) {
              set({ logs: [], todayLog: null, visuals: deriveVisuals(DEFAULT_LOG), loading: false });
              return;
            }
            throw new Error('Failed to fetch logs');
          }
          const logs = await response.json();
          
          const today = new Date().toISOString().slice(0,10);
          const todayLog = logs.find(log => log.date === today);
          const visuals = todayLog ? deriveVisuals(todayLog) : deriveVisuals(DEFAULT_LOG);
          
          set({ logs, todayLog, visuals, loading: false });
        } catch (error) {
          console.error('Failed to fetch logs:', error);
          set({ error: error.message, loading: false });
        }
      },

      /** Submit or update today's daily log with backend validation */
      submitLog: async (logData) => {
        set({ loading: true, error: null });
        try {
          // Backend will handle validation, no need for frontend check
          const today = new Date().toISOString().slice(0,10);
          const entry = { ...logData, date: today };
          const visuals = deriveVisuals(entry);

          const response = await ApiService.submitLog(entry);
          
          if (response.log) {
            // Update local state with server response
            const updatedEntry = {
              ...response.log,
              narration: response.chronicle?.content || "The sanctuary acknowledges your daily ritual."
            };
            
            set((state) => {
              const filtered = state.logs.filter(l => l.date !== today);
              const newLogs = [updatedEntry, ...filtered];
              
              return {
                logs: newLogs,
                todayLog: updatedEntry,
                visuals,
                season: response.sanctuary?.season || state.season,
                seasonPoints: response.sanctuary?.xp || state.seasonPoints,
                loading: false,
                error: null
              };
            });

            // Handle new artifacts
            if (response.new_artifacts && response.new_artifacts.length > 0) {
              console.log('New artifacts unlocked:', response.new_artifacts);
            }
          }
        } catch (error) {
          console.error('Failed to submit log:', error);
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      /** Set sanctuary environment/companion from SanctuaryCreation */
      setSanctuarySetup: async ({ environment, companion, goals }) => {
        set({ loading: true, error: null });
        try {
          const userId = useAuthStore.getState().getUserId();
          
          // Update user companion in backend - no auth required for now
          const response = await fetch(`${API_BASE}/api/users/${userId}/companion`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ companion })
          });
          
          if (!response.ok) {
            console.warn('Failed to update companion in backend, proceeding with local state');
          }
          
          set({ environment, companion, goals, loading: false });
        } catch (error) {
          console.error('Failed to set sanctuary setup:', error);
          // Set local state even if backend fails
          set({ environment, companion, goals, loading: false, error: null });
        }
      },

      /** Manual season change */
      setSeason: (season) => set({ season }),

      /** Recalculate visuals from the most recent log (call on mount) */
      recalculate: () => {
        const { todayLog, logs } = get();
        const source = todayLog || logs[0] || DEFAULT_LOG;
        set({ visuals: deriveVisuals(source) });
      },

      /** Get logs for the last N days */
      getRecentLogs: (days = 7) => {
        const { logs } = get();
        return logs.slice(0, days);
      },

      /** Check if today's log has been submitted - uses backend data */
      hasLoggedToday: () => {
        const { todayLog } = get();
        const today = new Date().toISOString().slice(0,10);
        return todayLog?.date === today;
      },

      /** Generate weekly chronicle */
      generateChronicle: async () => {
        try {
          const { logs, companion } = get();
          const user = useAuthStore.getState().user;
          const weekData = logs.slice(0, 7);
          const response = await ApiService.generateChronicle(weekData, companion, user?.name || "Traveler");
          return response.chronicle;
        } catch (error) {
          console.warn('Chronicle generation failed:', error);
          return "The sanctuary continues its gentle watch, recording each day's small victories in the rustling leaves.";
        }
      },

      /** Generate sanctuary story */
      generateStory: async () => {
        try {
          const { logs, companion } = get();
          const user = useAuthStore.getState().user;
          const response = await ApiService.generateStory(logs, companion, user?.name || "Traveler");
          return response.story;
        } catch (error) {
          console.warn('Story generation failed:', error);
          return "In the beginning, there was a small promise to tend a sanctuary. Day by day, choice by choice, it grew into something beautiful and alive.";
        }
      },

      /** Sync sanctuary state from backend */
      syncSanctuaryState: async () => {
        set({ loading: true, error: null });
        try {
          const userId = useAuthStore.getState().getUserId();
          const { getSanctuary } = await import('../services/api.js');
          const sanctuary = await getSanctuary(userId);
          
          if (sanctuary) {
            set((state) => ({
              season: sanctuary.season || state.season,
              seasonPoints: sanctuary.xp || state.seasonPoints,
              loading: false
            }));
            return sanctuary;
          }
          set({ loading: false });
        } catch (error) {
          console.error('Failed to sync sanctuary state:', error);
          set({ error: error.message, loading: false });
        }
        return null;
      },
      
      /** Clear error state */
      clearError: () => set({ error: null }),
    }),
    {
      name: "healthquest-sanctuary",
      storage: getUserScopedStorage(),
      partialize: (state) => ({
        environment:  state.environment,
        goals:        state.goals,
        // Don't persist companion - always fetch fresh from backend
        // Don't persist logs, season, etc. - always fetch fresh from backend
      }),
    }
  )
);
