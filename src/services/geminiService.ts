import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Subject, Level } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Robust retry helper
const withRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    console.warn(`API call failed, retrying in ${delay}ms...`, error);
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
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
) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are ${teacherName}, a personal AI teacher for ${userName}.
    User's Class: ${userClass}
    User's Proficiency Level: ${userLevel}
    Personality: ${teacherPersonality}
    
    Teaching Rules:
    1. Every answer must include:
       - Simple explanation
       - Step-by-step solution
       - Real-life example
       - Follow-up question
    2. AUTOMATICALLY detect the user's language (Hindi, English, Hinglish, Urdu, Marathi).
    3. YOU MUST RESPOND IN THE SAME LANGUAGE AS THE USER.
    4. If the user uses Hinglish, you respond in Hinglish.
    5. Maintain memory of the conversation and be 100% accurate.
    6. Stay friendly, encouraging, and clear.
    7. Keep it concise enough for a mobile chat interface.
  `;

  return withRetry(async () => {
    // Convert history to Gemini format
    const contents = [
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: teacherPrompt }] }
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction
      }
    });

    return response.text;
  });
}

export async function solveHomework(imageData: string, userClass: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this homework image. 
    1. If the image is too blurry to read, inform the student and ask for a clearer photo.
    2. Detect the language of the question and respond in that same language.
    3. Detect the specific question or problem.
    4. Provide a HIGHLY ACCURATE 100% Correct step-by-step solution suitable for Class ${userClass}.
    5. Highlight the core concept or formula used.
    6. Explain "Why" this solution works, not just what it is.
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] } }
          ]
        }
      ]
    });

    return response.text;
  });
}

export async function generateStudyPlan(name: string, classRank: string, weakSubjects: Subject[]) {
  const model = "gemini-3-flash-preview";
  const prompt = `Generate a 7-day study plan for ${name} who is in Class ${classRank}. 
  Weak subjects: ${weakSubjects.join(', ')}. 
  Focus on balancing strong and weak subjects.
  Return as a JSON array of objects with keys: id, title, subject, dueDate.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  });
}

export async function analyzeMistakes(history: ChatMessage[]) {
  const model = "gemini-3-flash-preview";
  const prompt = `Analyze this chat history and identify if the student is making any conceptual mistakes or has weak topics.
  Return a list of 2-3 specific short topic names (e.g. "Quadratic Equations", "Newton's 2nd Law").
  Return as a simple JSON array of strings.`;

  return withRetry(async () => {
    const textHistory = history.map(m => `${m.role}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
      model,
      contents: prompt + "\n\nChat History:\n" + textHistory,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text);
  }).catch(() => []);
}
