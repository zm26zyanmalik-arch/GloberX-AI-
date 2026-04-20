import { ChatMessage, Subject, Level } from '../types';

import { MASTER_CURRICULUM } from "../curriculum";

// Robust retry helper
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    // Only retry on network errors or transient 5xx errors
    const isNetworkError = !error.response;
    const isRetriableStatus = error.response?.status >= 500;
    
    if (isNetworkError || isRetriableStatus) {
      console.warn(`API call failed, retrying in ${delay}ms (${retries} left)...`, error);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    throw error;
  }
};

export async function getTeacherResponse(
  teacherPrompt: string, 
  history: ChatMessage[],
  userName: string,
  userClass: string,
  userLevel: Level,
  teacherName: string,
  teacherPersonality: string
): Promise<string> {
  const modelName = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are ${teacherName}, a personal AI teacher for ${userName}.
    User's Class: ${userClass}
    User's Proficiency Level: ${userLevel}
    Personality: ${teacherPersonality}
    
    Master Curriculum Context: ${JSON.stringify(MASTER_CURRICULUM)}
    
    Teaching Rules:
    1. Every answer must include:
       - Simple explanation (conceptual clarity)
       - Step-by-step solution (logical breakdown)
       - Real-life example or Storytelling (practical application)
       - Follow-up question (checking for understanding)
    2. TEACHING STYLE ENHANCEMENTS:
       - For Mathematics: Always suggest mental math methods or shortcut tricks where applicable.
       - For Science: Use vivid descriptions of experiments or real-life simulations.
       - For Social Science & History: Use storytelling and character context to make it interesting.
       - For Languages: Focus on natural sentence structure and vocabulary memory tricks.
    3. AUTOMATICALLY detect the user's language (Hindi, English, Hinglish, Urdu, Marathi).
    4. YOU MUST RESPOND IN THE SAME LANGUAGE AS THE USER.
    5. Maintain deep memory of the conversation.
    6. Content auto-adjusts based on Class ${userClass}. A 3rd grader gets simpler words than a 10th grader.
    7. Stay friendly, encouraging, and highly expressive.
    8. Format output with clean Markdown (bolding, lists, headers).
  `;

  return withRetry(async () => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: teacherPrompt,
        history,
        systemInstruction,
        modelName
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Unknown AI error");
    }
    return data.message;
  });
}

export async function solveHomework(imageData: string, userClass: string): Promise<string> {
  const prompt = `
    Analyze this homework image. 
    1. If the image is too blurry to read, inform the student kindly and ask for a clearer photo.
    2. Detect the language of the question and respond in that same language.
    3. Provide a step-by-step solution suitable for Class ${userClass}.
    4. Highlight the core concept or formula used.
    5. Explain "Why" this solution works.
    6. If the student has made a mistake in their own writing in the image, gently correct it.
  `;

  return withRetry(async () => {
    const response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData, userClass, prompt })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Failed to solve homework");
    }
    return data.message;
  });
}

export async function generateStudyPlan(name: string, classRank: string, weakSubjects: Subject[]) {
  const prompt = `Generate a 7-day study plan for ${name} who is in Class ${classRank}. 
  Weak subjects: ${weakSubjects.join(', ')}. 
  Focus on balancing strong and weak subjects.
  Return as a JSON array of objects with keys: id, title, subject, dueDate.`;

  return withRetry(async () => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt, 
        modelName: "gemini-3-flash-preview", 
        jsonMode: true // Backend should handle this if needed, or just let it through
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    try {
      // Find JSON block in response if it's mixed with text
      const text = data.message;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("JSON Parse Error in Study Plan:", e);
      throw new Error("Could not generate valid study plan format");
    }
  });
}

export async function analyzeMistakes(history: ChatMessage[]) {
  const prompt = `Analyze this chat history and identify if the student is making any conceptual mistakes or has weak topics.
  Return a list of 2-3 specific short topic names (e.g. "Quadratic Equations", "Newton's 2nd Law").
  Return as a simple JSON array of strings.`;

  return withRetry(async () => {
    const textHistory = history.map(m => `${m.role}: ${m.text}`).join('\n');
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt + "\n\nChat History:\n" + textHistory,
        modelName: "gemini-3-flash-preview"
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    
    try {
      const text = data.message;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      return [];
    }
  }).catch(() => []);
}
