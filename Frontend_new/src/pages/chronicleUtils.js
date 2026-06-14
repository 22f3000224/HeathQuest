/**
 * chronicleUtils.js
 * Generates AI-powered chapter narratives for the Chronicle Hall.
 * Calls your existing FastAPI backend (/api/chronicle/generate) which
 * uses Groq llama-3.3-70b-versatile — same pattern as companion narration.
 *
 * Falls back to a client-side Groq call if the backend is unavailable.
 */

import { API_BASE } from "../services/api.js";

/**
 * generateChapterNarrative
 * @param {Object} chapter  - chapter config { week, title, subtitle, emblem, ... }
 * @param {Object|null} weekData - health log data for that week
 * @returns {Promise<string>} - narrative text
 */
export async function generateChapterNarrative(chapter, weekData) {
  const prompt = buildPrompt(chapter, weekData);

  // ── Try backend first ──────────────────────────────────────────────────────
  try {
    const res = await fetch(`${API_BASE}/api/chronicle/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter, weekData, prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.narrative ?? fallbackNarrative(chapter);
    }
  } catch {
    // Backend unavailable — fall through to direct client call
  }

  // ── Direct Groq via Anthropic proxy not available here; return fallback ────
  return fallbackNarrative(chapter, weekData);
}

// ─── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(chapter, weekData) {
  const statsSection = weekData
    ? `
Health data for this week:
- Sleep: ${weekData.sleep ?? 'N/A'}/10
- Hydration: ${weekData.hydration ?? 'N/A'}/10
- Nutrition: ${weekData.nutrition ?? 'N/A'}/10
- Exercise: ${weekData.exercise ?? 'N/A'}/10
- Mood: ${weekData.mood ?? 'N/A'}/10
`
    : 'No detailed health data recorded for this week.';

  return `You are the narrator of a magical nature sanctuary journal called HealthQuest.
Write a short poetic chapter (3–5 paragraphs) for the chapter titled "${chapter.title}" 
(Week ${chapter.week} of the user's wellness journey). 
The chapter's theme: "${chapter.subtitle}".
${statsSection}
Weave the health metrics into nature imagery — sleep as moonlight, hydration as flowing rivers, 
nutrition as thriving flora, exercise as winds, mood as the sanctuary's weather.
Write in second person ("you"). Keep the tone mystical, warm, and encouraging.
Do not mention numbers directly. No markdown formatting, just plain flowing prose paragraphs separated by newlines.`;
}

// ─── Rich fallback narratives ─────────────────────────────────────────────────
function fallbackNarrative(chapter, weekData) {
  const templates = {
    1: `The sanctuary stirred as you took your first steps into its living heart. The ancient trees leaned closer, curious and welcoming, their roots sensing the rhythm of your quiet resolve.\n\nMorning light filtered through canopies that had waited countless seasons for a guardian like you. Each breath you drew became part of the forest's own breath — the beginning of a bond that would grow stronger with every choice.\n\nThe fox watched from the shadows of the great bookshelf, amber eyes bright with recognition. Something rare had arrived. Something worth remembering. The first chapter was written not in ink, but in the soft earth beneath your feet.`,
    2: `Water remembered you this week. Every stream and hidden spring in the sanctuary turned toward your footsteps, carrying whispers of progress downstream to the roots of the oldest trees.\n\nThe river of light that runs beneath the sanctuary floor glowed a little brighter — fed by the small commitments you kept, the quiet discipline of choosing well even when no one was watching.\n\nBy the week's end, the moon's reflection on the still water showed a sanctuary that had deepened. What flows, endures. What you tended this week will nourish what comes next.`,
    3: `The forests held their breath, then released it in song. Creatures that had retreated to the edges of the sanctuary began to return — drawn by the warmth your presence had woven into the air.\n\nBirdsong echoed through the valley once more. The fox lifted its head and listened, tail curling with quiet satisfaction. Wildlife does not return to places that have forgotten their purpose. It returns to places that are becoming whole.\n\nThis week the sanctuary welcomed new life. And so did you.`,
    4: `Something dormant stirred beneath the frost of old habits. A single blossom — pale and perfect — pushed through the still-cool earth near the sanctuary's heart.\n\nFirst blooms are brave. They do not wait for perfect conditions. They push because the season inside them says it is time. You found that season this week.\n\nThe bookshelves glowed a little warmer. The lanterns swayed as if nodding. The chronicle records what the garden already knows: you are beginning to bloom.`,
    5: `The great forest that had once stood silent and grey was alive with color again. Not the color of before — something richer, rebuilt from the specific materials of your choices, your rhythms, your small daily acts of care.\n\nRebirth is not return. It is transformation. The sanctuary that welcomes you now is shaped by every step you have taken, every log you have kept, every night you chose rest over restlessness.\n\nThe fox stood at the center of the clearing and turned to face you. In its amber eyes: recognition. In the rustling leaves: applause. The chronicle of the forest reborn is also the chronicle of you.`,
  };

  return templates[chapter.week] ?? `${chapter.title}\n\n${chapter.subtitle}\n\nThe sanctuary holds the memory of this week within its roots and branches. Every step, every breath, every choice became part of the living story of this place.\n\nThe chronicle endures.`;
}
