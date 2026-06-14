import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSanctuaryStore } from './useSanctuaryStore';

export const useHealthStore = create(
  persist(
    (set, get) => ({
      // Weekly logs structure: { [week]: { sleep: avg, hydration: avg, ... } }
      weeklyLogs: {},
      currentWeek: 1,

      // Set weekly averages (could be calculated from daily logs)
      setWeeklyLog: (week, logData) =>
        set((state) => ({
          weeklyLogs: {
            ...state.weeklyLogs,
            [week]: logData,
          },
        })),

      // Update current week
      setCurrentWeek: (week) => set({ currentWeek: week }),

      // Get weekly log for specific week
      getWeeklyLog: (week) => {
        const { weeklyLogs } = get();
        return weeklyLogs[week] || null;
      },

      // Calculate weekly averages from daily logs. If `dailyLogs` is omitted,
      // read logs from `useSanctuaryStore`. Week numbering: week 1 = most recent 7 days,
      // week 2 = previous 7 days, etc.
      calculateWeeklyAverages: (dailyLogs = null, weekNumber = 1) => {
        try {
          const sanctuaryLogs = dailyLogs || useSanctuaryStore.getState().logs || [];

          // logs are stored newest-first. Compute slice for requested week.
          const start = (weekNumber - 1) * 7;
          const slice = sanctuaryLogs.slice(start, start + 7);

          if (!slice || slice.length === 0) {
            return null;
          }

          const keys = ['sleep', 'hydration', 'nutrition', 'exercise', 'mood'];
          const sums = { sleep: 0, hydration: 0, nutrition: 0, exercise: 0, mood: 0 };
          let count = 0;

          slice.forEach((log) => {
            if (!log) return;
            count += 1;
            keys.forEach((k) => {
              const v = Number(log[k]);
              if (!Number.isNaN(v)) sums[k] += v;
            });
          });

          if (count === 0) return null;

          const averages = {};
          keys.forEach((k) => {
            averages[k] = Math.round((sums[k] / count) * 10) / 10; // one decimal
          });

          set((state) => ({
            weeklyLogs: {
              ...state.weeklyLogs,
              [weekNumber]: averages,
            },
            currentWeek: Math.max(state.currentWeek || 1, weekNumber),
          }));

          return averages;
        } catch (err) {
          console.warn('Failed to calculate weekly averages:', err);
          return null;
        }
      },
    }),
    {
      name: 'healthquest-weekly-logs',
      partialize: (state) => ({
        weeklyLogs: state.weeklyLogs,
        currentWeek: state.currentWeek,
      }),
    }
  )
);

// Auto-recalculate weekly averages whenever sanctuary logs update.
// This avoids importing `useHealthStore` into the sanctuary store and prevents
// circular imports while keeping weekly data in sync automatically.
try {
  useSanctuaryStore.subscribe(
    (s) => s.logs,
    (logs, previous) => {
      const hs = useHealthStore.getState();
      // Recalculate week 1 (most recent week) when logs change
      try {
        hs.calculateWeeklyAverages(logs, 1);
      } catch (e) {
        console.warn('HealthStore auto-recalc failed:', e);
      }
    }
  );
} catch (e) {
  console.warn('Failed to subscribe to sanctuary store for auto-recalc:', e);
}