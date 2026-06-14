// API service functions for HealthQuest AI

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token management
function getAuthToken() {
  return localStorage.getItem('hq_auth_token');
}

function setAuthToken(token) {
  localStorage.setItem('hq_auth_token', token);
}

function removeAuthToken() {
  localStorage.removeItem('hq_auth_token');
  localStorage.removeItem('hq_user');
}

// Authenticated fetch wrapper
async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    removeAuthToken();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }
  
  return response;
}

// Authentication functions
export async function register(userData) {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    const data = await response.json();
    setAuthToken(data.access_token);
    localStorage.setItem('hq_user', JSON.stringify(data.user));
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function login(credentials) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    const data = await response.json();
    setAuthToken(data.access_token);
    localStorage.setItem('hq_user', JSON.stringify(data.user));
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout() {
  removeAuthToken();
}

export async function getCurrentUser() {
  try {
    const response = await authFetch(`${API_BASE}/auth/me`);
    if (!response.ok) throw new Error('Failed to get current user');
    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export function getStoredUser() {
  const userStr = localStorage.getItem('hq_user');
  return userStr ? JSON.parse(userStr) : null;
}

export function isAuthenticated() {
  return !!getAuthToken();
}

// User management functions
export async function fetchUserLogs(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/logs/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return await response.json();
  } catch (error) {
    console.error('Fetch logs error:', error);
    throw error;
  }
}

// Check daily log status
export async function checkDailyLogStatus(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/logs/status/${userId}`);
    if (!response.ok) throw new Error('Failed to check daily log status');
    return await response.json();
  } catch (error) {
    console.error('Check daily log status error:', error);
    return { has_logged_today: false, next_available_at: new Date().toISOString().slice(0,10) };
  }
}

// Get complete user initialization data
export async function initializeUserState(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/users/${userId}/init`);
    if (!response.ok) throw new Error('Failed to initialize user state');
    return await response.json();
  } catch (error) {
    console.error('Initialize user state error:', error);
    throw error;
  }
}

export async function fetchTodayLog(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/logs/${userId}/today`);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No log for today
      }
      throw new Error('Failed to fetch today\'s log');
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch today log error:', error);
    return null;
  }
}

export async function updateUserCompanion(userId, companion) {
  try {
    const response = await authFetch(`${API_BASE}/api/users/${userId}/companion`, {
      method: 'PUT',
      body: JSON.stringify({ companion })
    });
    if (!response.ok) throw new Error('Failed to update companion');
    return await response.json();
  } catch (error) {
    console.error('Update companion error:', error);
    throw error;
  }
}

export async function getMemories(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/memories/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch memories');
    return await response.json();
  } catch (error) {
    console.error('Get memories error:', error);
    return [];
  }
}

// AI Context function
export async function getAIContext(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/context/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch AI context');
    return await response.json();
  } catch (error) {
    console.error('Get AI context error:', error);
    return null;
  }
}

// Storybook functions
export async function getStorybook(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/storybook/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch storybook');
    return await response.json();
  } catch (error) {
    console.error('Get storybook error:', error);
    return [];
  }
}

export async function generateStoryChapter(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/storybook/${userId}/generate`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to generate story chapter');
    return await response.json();
  } catch (error) {
    console.error('Generate story chapter error:', error);
    return null;
  }
}

export async function getAdvisor(userId) {
  try {
    const response = await authFetch(`${API_BASE}/advisor/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch advisor');
    return await response.json();
  } catch (error) {
    console.error('Advisor API error:', error);
    return {
      strongest_habit: "Your daily rituals",
      biggest_risk: "Inconsistent logging",
      prediction: "The sanctuary will continue to flourish",
      recommended_focus: "Maintain current habits",
      reasoning: "Your sanctuary shows steady growth"
    };
  }
}

export async function getCompanionAdvice(userId) {
  try {
    const response = await authFetch(`${API_BASE}/api/companion/advice`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    if (!response.ok) throw new Error('Failed to fetch companion advice');
    return await response.json();
  } catch (error) {
    console.error('Companion advice API error:', error);
    return {
      observation: "Your sanctuary companion watches quietly, sensing the rhythms of your daily journey.",
      advice: "Continue nurturing your wellness rituals, and the sanctuary will flourish in response."
    };
  }
}

export async function getReflection(userId) {
  try {
    const response = await authFetch(`${API_BASE}/reflection/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch reflection');
    return await response.json();
  } catch (error) {
    console.error('Reflection API error:', error);
    return {
      reflection: "The sanctuary holds memories of your journey, waiting for more days to weave into your story."
    };
  }
}

export async function getSanctuary(userId) {
  try {
    const response = await authFetch(`${API_BASE}/sanctuary/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch sanctuary state');
    return await response.json();
  } catch (error) {
    console.error('Sanctuary API error:', error);
    return null;
  }
}

export async function analyzeWorld(logData) {
  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });
    if (!response.ok) throw new Error('Failed to analyze world');
    return await response.json();
  } catch (error) {
    console.error('World analysis API error:', error);
    return null;
  }
}

export async function generateNarration(worldData) {
  try {
    const response = await fetch(`${API_BASE}/narrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldData)
    });
    if (!response.ok) throw new Error('Failed to generate narration');
    return await response.json();
  } catch (error) {
    console.error('Narration API error:', error);
    return { narration: "The sanctuary whispers softly in the twilight." };
  }
}

// Convert frontend format to backend format
function convertToBackendFormat(frontendLog) {
  const user = getStoredUser();
  return {
    user_id: user?.id || 1,
    sleep: Math.round(frontendLog.sleep || 5),
    water: Math.round(frontendLog.hydration || frontendLog.water || 5),
    exercise: frontendLog.exercise < 3 ? "none" : 
             frontendLog.exercise < 5 ? "light" : 
             frontendLog.exercise < 8 ? "moderate" : "intense",
    nutrition: frontendLog.nutrition < 3 ? "poor" :
              frontendLog.nutrition < 5 ? "okay" : 
              frontendLog.nutrition < 8 ? "good" : "great",
    mood: Math.max(1, Math.min(4, Math.ceil((frontendLog.mood || 5) * 0.4)))
  };
}

// ApiService class for compatibility with store
export const ApiService = {
  async submitLog(logData) {
    try {
      const backendLog = convertToBackendFormat(logData);
      const response = await authFetch(`${API_BASE}/api/logs`, {
        method: 'POST',
        body: JSON.stringify(backendLog)
      });
      if (!response.ok) throw new Error('Failed to submit log');
      return await response.json();
    } catch (error) {
      console.error('Submit log API error:', error);
      throw error;
    }
  },

  async getNarration(logData, recentLogs, companion, userName) {
    try {
      const backendLog = convertToBackendFormat(logData);
      const backendHistory = recentLogs.map(log => convertToBackendFormat(log));
      
      const response = await authFetch(`${API_BASE}/narrate`, {
        method: 'POST',
        body: JSON.stringify({ 
          today: backendLog, 
          history: backendHistory, 
          companion: companion || 'fox', 
          name: userName || 'Traveler'
        })
      });
      if (!response.ok) throw new Error('Failed to get narration');
      return await response.json();
    } catch (error) {
      console.error('Get narration API error:', error);
      return { narration: "The sanctuary embraces your daily journey with quiet wisdom." };
    }
  },

  async generateChronicle(weekData, companion, userName) {
    try {
      const backendWeekData = weekData.map(log => convertToBackendFormat(log));
      const response = await fetch(`${API_BASE}/chronicle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          week_data: backendWeekData, 
          companion: companion || 'fox', 
          name: userName || 'Traveler'
        })
      });
      if (!response.ok) throw new Error('Failed to generate chronicle');
      return await response.json();
    } catch (error) {
      console.error('Generate chronicle API error:', error);
      return { chronicle: "Week by week, the sanctuary records your journey in whispered stories." };
    }
  },

  async generateStory(allLogs, companion, userName) {
    try {
      const backendHistory = allLogs.map(log => convertToBackendFormat(log));
      const response = await fetch(`${API_BASE}/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: backendHistory, 
          companion: companion || 'fox', 
          name: userName || 'Traveler'
        })
      });
      if (!response.ok) throw new Error('Failed to generate story');
      return await response.json();
    } catch (error) {
      console.error('Generate story API error:', error);
      return { story: "In the heart of the sanctuary, every day becomes part of an unfolding tale." };
    }
  }
,
  async generateArtifact(artifactMeta, todayLog, companion, userName) {
    try {
      // backend expects: { artifact: string, log_entry: dict, companion: str, name: str }
      const artifactName = typeof artifactMeta === 'string' ? artifactMeta : (artifactMeta?.artifact_name || artifactMeta?.name || artifactMeta?.label || String(artifactMeta));
      const payload = {
        artifact: artifactName,
        log_entry: todayLog ? convertToBackendFormat(todayLog) : {},
        companion: companion || 'fox',
        name: userName || 'Traveler',
      };
      const response = await fetch(`${API_BASE}/artifact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to generate artifact memory');
      return await response.json();
    } catch (error) {
      console.error('Generate artifact API error:', error);
      return { memory: artifactMeta?.story || `${artifactMeta?.label || 'This artifact'} holds a quiet memory.` };
    }
  },

  async chatWithCompanion(userId, message) {
    try {
      const response = await authFetch(`${API_BASE}/api/agent/chat/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Chat failed: ${error}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Chat with companion API error:', error);
      throw error;
    }
  },

  async getCompanionReflections(userId) {
    try {
      const response = await authFetch(`${API_BASE}/api/agent/reflection/${userId}`);
      if (!response.ok) throw new Error('Failed to get companion reflections');
      return await response.json();
    } catch (error) {
      console.error('Get companion reflections API error:', error);
      return {
        today_reflection: "Today holds new possibilities for growth.",
        weekly_reflection: "This week has been a step forward.", 
        fox_thoughts: "I am grateful to witness your journey."
      };
    }
  },

  async getHealthSummary(userId) {
    try {
      const response = await authFetch(`${API_BASE}/api/agent/summary/${userId}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Health summary failed: ${error}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get health summary API error:', error);
      return {
        today_summary: "Your sanctuary awaits your next mindful choice.",
        weekly_summary: "Building awareness through daily reflection.",
        health_score: 50,
        strengths: ["Mindful logging"],
        weaknesses: ["Consistency"],
        recommendations: ["Focus on one small improvement"]
      };
    }
  }
};