import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Route
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, systemInstruction, modelName, jsonMode } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Backend Error: GEMINI_API_KEY is missing");
        return res.status(500).json({ 
          success: false, 
          message: "The AI service is not configured correctly (missing API key)." 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = modelName || "gemini-3-flash-preview";

      const contents = [
        ...(history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const config: any = {
        systemInstruction
      };

      if (jsonMode) {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });

      if (!response.text) {
        throw new Error("Empty response from AI model");
      }

      res.json({ 
        success: true, 
        message: response.text 
      });
    } catch (error: any) {
      console.error("Gemini API Error details:", error);
      
      let clientMessage = "I encountered an error while processing your request.";
      if (error.message?.includes("API_KEY_INVALID")) {
        clientMessage = "Invalid API Key. Please check your environment variables.";
      } else if (error.message?.includes("quota")) {
        clientMessage = "API rate limit exceeded. Please try again in a minute.";
      }

      res.status(500).json({ 
        success: false, 
        message: clientMessage,
        error: error.message 
      });
    }
  });

  // Homework Solver Proxy
  app.post("/api/solve", async (req, res) => {
    try {
      const { imageData, userClass, prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey! });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] } }
            ]
          }
        ]
      });

      res.json({ success: true, message: response.text });
    } catch (error: any) {
      console.error("Homework Solver Error:", error);
      res.status(500).json({ success: false, message: "Could not solve homework. Error: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
