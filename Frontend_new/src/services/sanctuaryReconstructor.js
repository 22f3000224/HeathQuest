/**
 * Sanctuary Reconstruction Service
 * Handles complete sanctuary state reconstruction from backend data
 */

import { deriveVisuals } from '../store/useSanctuaryStore.js';
import { calculateTotalXP, calculateLevel, getXPProgress } from './xpCalculator.js';

/**
 * Reconstruct complete sanctuary state from initialization data
 */
export function reconstructSanctuaryState(initData) {
  if (!initData) {
    console.warn('No initialization data provided for sanctuary reconstruction');
    return getDefaultSanctuaryState();
  }

  const {
    user,
    sanctuary,
    daily_logs = [],
    today_log,
    museum = {},
    storybook = {},
    progression = {},
    streaks = {}
  } = initData;

  // Calculate derived visuals from most recent log
  const sourceLog = today_log || daily_logs[0] || getDefaultLog();
  const visuals = deriveVisuals(sourceLog);

  // Calculate XP from database records
  const xpData = calculateTotalXP({
    logs: daily_logs,
    artifacts: museum.artifacts || [],
    chapters: storybook.chapters || []
  });

  // Get XP progress information
  const xpProgress = getXPProgress(xpData.totalXP);

  // Determine sanctuary setup status
  const isSetupComplete = !!(user?.companion && sanctuary);

  console.log('Sanctuary reconstructed:', {
    user_id: user?.id,
    is_new_user: initData.status?.is_new_user || false,
    logs_count: daily_logs.length,
    today_logged: !!today_log,
    total_xp: xpData.totalXP,
    level: xpProgress.level,
    setup_complete: isSetupComplete
  });

  return {
    // User state
    user: {
      id: user?.id,
      name: user?.name || 'Explorer',
      companion: user?.companion,
      email: user?.email,
      created_at: user?.created_at
    },

    // Sanctuary visual state
    sanctuary: {
      ...sanctuary,
      level: xpProgress.level,
      xp: xpData.totalXP,
      next_level_xp: xpProgress.nextLevelXP
    },

    // Log data
    logs: daily_logs,
    todayLog: today_log,
    hasLoggedToday: !!today_log,

    // Visual state derived from logs
    visuals,
    
    // Progression data
    progression: {
      ...progression,
      ...xpData,
      level: xpProgress.level,
      xp_progress: xpProgress
    },

    // Museum state
    museum: {
      artifacts: museum.artifacts || [],
      unlocked_count: museum.unlocked_count || 0,
      total_count: museum.total_count || 0
    },

    // Storybook state
    storybook: {
      chapters: storybook.chapters || [],
      total_chapters: storybook.total_chapters || 0
    },

    // Streak data
    streaks: {
      current_streak: streaks.current_streak || 0,
      longest_streak: streaks.longest_streak || 0
    },

    // Setup state
    setup: {
      is_complete: isSetupComplete,
      has_companion: !!user?.companion,
      has_sanctuary: !!sanctuary
    },

    // Season and environment
    season: sanctuary?.season || 'spring',
    seasonPoints: xpData.totalXP,
    environment: sanctuary ? 'forest' : null,
    companion: user?.companion
  };
}

/**
 * Get default sanctuary state for new users
 */
function getDefaultSanctuaryState() {
  const defaultLog = getDefaultLog();
  const visuals = deriveVisuals(defaultLog);

  return {
    user: null,
    sanctuary: null,
    logs: [],
    todayLog: null,
    hasLoggedToday: false,
    visuals,
    progression: {
      totalXP: 0,
      dailyLogXP: 0,
      streakXP: 0,
      museumXP: 0,
      storyXP: 0,
      level: 1,
      xp_progress: getXPProgress(0)
    },
    museum: { artifacts: [], unlocked_count: 0, total_count: 0 },
    storybook: { chapters: [], total_chapters: 0 },
    streaks: { current_streak: 0, longest_streak: 0 },
    setup: { is_complete: false, has_companion: false, has_sanctuary: false },
    season: 'spring',
    seasonPoints: 0,
    environment: null,
    companion: null
  };
}

/**
 * Get default log values
 */
function getDefaultLog() {
  return {
    date: new Date().toISOString().slice(0, 10),
    sleep: 5,
    hydration: 5,
    nutrition: 5,
    exercise: 5,
    mood: 5
  };
}

/**
 * Validate sanctuary state completeness
 */
export function validateSanctuaryState(state) {
  const issues = [];

  if (!state.user?.id) {
    issues.push('Missing user ID');
  }

  if (!Array.isArray(state.logs)) {
    issues.push('Invalid logs array');
  }

  if (state.progression?.totalXP < 0) {
    issues.push('Invalid XP value');
  }

  if (state.progression?.level < 1 || state.progression?.level > 10) {
    issues.push('Invalid level value');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

export default {
  reconstructSanctuaryState,
  validateSanctuaryState
};