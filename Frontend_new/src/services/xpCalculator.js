/**
 * XP Calculator Service - Frontend
 * Mirrors backend XP calculation for consistent display
 */

// XP Constants
const XP_RATES = {
  DAILY_LOG_BASE: 20,
  DAILY_LOG_SLEEP: 20,      // >= 7 hours
  DAILY_LOG_WATER: 20,      // >= 6 glasses
  DAILY_LOG_EXERCISE: 20,   // moderate/intense
  DAILY_LOG_NUTRITION: 20,  // good/great
  DAILY_LOG_MOOD: 10,       // >= 3/4

  STREAK_WEEKLY: 100,       // per week of streak
  STREAK_MONTHLY: 500,      // per month of streak

  ARTIFACT: 50,             // per unlocked artifact
  CHAPTER: 25,              // per storybook chapter
};

/**
 * Calculate XP from a single daily log entry
 */
export function calculateLogXP(log) {
  if (!log) return 0;
  
  let xp = 0;
  
  // Sleep XP (7+ hours = 20 XP)
  if (log.sleep >= 7) {
    xp += XP_RATES.DAILY_LOG_SLEEP;
  }
  
  // Hydration XP (6+ glasses = 20 XP) 
  if (log.water >= 6) {
    xp += XP_RATES.DAILY_LOG_WATER;
  }
  
  // Exercise XP (moderate/intense = 20 XP)
  if (typeof log.exercise === 'string') {
    if (['moderate', 'intense'].includes(log.exercise)) {
      xp += XP_RATES.DAILY_LOG_EXERCISE;
    }
  } else if (log.exercise >= 2) { // numeric 0-3 scale
    xp += XP_RATES.DAILY_LOG_EXERCISE;
  }
  
  // Nutrition XP (good/great = 20 XP)
  if (typeof log.nutrition === 'string') {
    if (['good', 'great'].includes(log.nutrition)) {
      xp += XP_RATES.DAILY_LOG_NUTRITION;
    }
  } else if (log.nutrition >= 2) { // numeric 0-3 scale
    xp += XP_RATES.DAILY_LOG_NUTRITION;
  }
  
  // Mood XP (3+ = 10 XP)
  if (log.mood >= 3) {
    xp += XP_RATES.DAILY_LOG_MOOD;
  }
  
  return xp;
}

/**
 * Calculate streak XP from log history
 */
export function calculateStreakXP(logs) {
  if (!logs || logs.length === 0) return 0;
  
  // Sort logs by date (newest first)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let currentStreak = 1;
  let maxStreak = 1;
  
  for (let i = 1; i < sortedLogs.length; i++) {
    const prevDate = new Date(sortedLogs[i-1].date);
    const currDate = new Date(sortedLogs[i].date);
    const daysDiff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  // Calculate streak bonuses
  let streakXP = 0;
  
  // Weekly streak bonuses (100 XP per week)
  if (maxStreak >= 7) {
    streakXP += Math.floor(maxStreak / 7) * XP_RATES.STREAK_WEEKLY;
  }
  
  // Monthly streak bonuses (500 XP per month)
  if (maxStreak >= 30) {
    streakXP += Math.floor(maxStreak / 30) * XP_RATES.STREAK_MONTHLY;
  }
  
  return streakXP;
}

/**
 * Calculate total XP breakdown for display
 */
export function calculateTotalXP(data) {
  const { logs = [], artifacts = [], chapters = [] } = data;
  
  // Daily log XP
  const dailyLogXP = logs.reduce((total, log) => total + calculateLogXP(log), 0);
  
  // Streak XP
  const streakXP = calculateStreakXP(logs);
  
  // Museum XP
  const museumXP = artifacts.filter(a => a.unlocked).length * XP_RATES.ARTIFACT;
  
  // Storybook XP
  const storyXP = chapters.length * XP_RATES.CHAPTER;
  
  const totalXP = dailyLogXP + streakXP + museumXP + storyXP;
  
  return {
    totalXP,
    dailyLogXP,
    streakXP,
    museumXP,
    storyXP,
    breakdown: {
      logs_count: logs.length,
      artifacts_count: artifacts.filter(a => a.unlocked).length,
      chapters_count: chapters.length,
      max_streak: calculateMaxStreak(logs)
    }
  };
}

/**
 * Calculate user level from XP
 */
export function calculateLevel(xp) {
  return Math.min(10, Math.floor(xp / 100) + 1);
}

/**
 * Calculate XP needed for next level
 */
export function calculateNextLevelXP(level) {
  return level * 100;
}

/**
 * Calculate current streak from logs
 */
export function calculateCurrentStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date().toISOString().slice(0, 10);
  
  let streak = 0;
  let currentDate = new Date(today);
  
  for (const log of sortedLogs) {
    const logDate = new Date(log.date);
    const expectedDateStr = currentDate.toISOString().slice(0, 10);
    
    if (log.date === expectedDateStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate maximum streak from logs
 */
function calculateMaxStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let currentStreak = 1;
  let maxStreak = 1;
  
  for (let i = 1; i < sortedLogs.length; i++) {
    const prevDate = new Date(sortedLogs[i-1].date);
    const currDate = new Date(sortedLogs[i].date);
    const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return maxStreak;
}

/**
 * Get XP progress for display
 */
export function getXPProgress(xp) {
  const level = calculateLevel(xp);
  const levelStartXP = (level - 1) * 100;
  const nextLevelXP = calculateNextLevelXP(level);
  const progressXP = xp - levelStartXP;
  const progressPercent = (progressXP / 100) * 100; // Each level is 100 XP
  
  return {
    level,
    currentXP: xp,
    progressXP,
    nextLevelXP,
    progressPercent: Math.min(100, progressPercent),
    isMaxLevel: level >= 10
  };
}

export default {
  calculateLogXP,
  calculateStreakXP,
  calculateTotalXP,
  calculateLevel,
  calculateNextLevelXP,
  calculateCurrentStreak,
  getXPProgress
};