// Local storage utilities for HealthQuest AI

export function getUser() {
  try {
    const user = localStorage.getItem('hq_user');
    return user ? JSON.parse(user) : { name: "Explorer", companion: "fox" };
  } catch {
    return { name: "Explorer", companion: "fox" };
  }
}

export function setUser(user) {
  localStorage.setItem('hq_user', JSON.stringify(user));
}

export function getLogs() {
  try {
    const logs = localStorage.getItem('hq_logs');
    return logs ? JSON.parse(logs) : [];
  } catch {
    return [];
  }
}

export function addLog(log) {
  const logs = getLogs();
  logs.push({ ...log, date: new Date().toISOString().split('T')[0] });
  localStorage.setItem('hq_logs', JSON.stringify(logs));
}

export function getWorld() {
  try {
    const world = localStorage.getItem('hq_world');
    return world ? JSON.parse(world) : {
      sky: "clear",
      river: "flowing", 
      forest: "lush",
      animal: "active",
      weather: "sunny",
      season: "spring"
    };
  } catch {
    return {
      sky: "clear",
      river: "flowing",
      forest: "lush", 
      animal: "active",
      weather: "sunny",
      season: "spring"
    };
  }
}

export function setWorld(world) {
  localStorage.setItem('hq_world', JSON.stringify(world));
}

export function getStreak() {
  const logs = getLogs();
  if (!logs.length) return 0;
  
  const today = new Date().toISOString().split('T')[0];
  const dates = logs.map(log => log.date).sort();
  let streak = 0;
  
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = new Date(dates[i]);
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - streak);
    
    if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}