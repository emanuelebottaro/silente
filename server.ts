import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialization of Gemini
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY non configurata. Configura la chiave API nelle impostazioni del Workspace.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Route for Spellcheck & Syntax Correction using Gemini
  app.post("/api/spellcheck", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim() === "") {
        return res.json({ issues: [] });
      }

      let ai;
      try {
        ai = getAIClient();
      } catch (err: any) {
        return res.status(400).json({ error: err.message, noApiKey: true });
      }

      const systemInstruction = `Sei un correttore ortografico, grammaticale e sintattico avanzato per la lingua italiana (pensa agli strumenti di correzione automatica intelligenti presenti in Google Docs, Drive o Gmail).
Analizza il testo fornito dall'utente e identifica errori di:
1. Ortografia (es. "eccezzione" -> "eccezione", "ha scritto" con acca, "anno scorso" senza acca).
2. Grammatica e Sintassi (es. accordo soggetto-verbo, tempi verbali scorretti, uso improprio di pronomi o preposizioni).
3. Punteggiatura e Spaziatura (es. spazi prima dei segni di punteggiatura, mancanza di spazio dopo).
4. Accenti e Apostrofi (es. "perchè" -> "perché", "qual'è" -> "qual è", "un pò" -> "un po'").
5. Stile ed espressioni palesemente cacofoniche o errate.

Per ogni errore identificato, fornisci:
- 'original': la parola o la brevissima frase esatta errata (fornisci un contesto di 1-2 parole prima/dopo se necessario a renderla univoca nel testo).
- 'replacement': la correzione suggerita.
- 'message': una spiegazione chiara, breve ed amichevole in italiano della regola grammaticale violata o del perché è un errore.
- 'type': il tipo di errore tra: 'accent', 'apostrophe', 'punctuation', 'spacing', 'common_error', 'grammar', 'style'.

Sii estremamente preciso. Non inventare errori dove non ci sono. Mantieni lo stile originale dell'autore, correggendo solo ciò che è oggettivamente errato o grammaticalmente scorretto.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analizza il seguente testo ed estrai tutti gli errori riscontrati:\n\n${text}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: {
                      type: Type.STRING,
                      description: "The exact misspelled or grammatically incorrect word or brief phrase from the user's text. Must match exactly a substring in the user's text."
                    },
                    replacement: {
                      type: Type.STRING,
                      description: "The corrected word or phrase."
                    },
                    message: {
                      type: Type.STRING,
                      description: "A clear, concise explanation in Italian of why it is incorrect and what the rule is."
                    },
                    type: {
                      type: Type.STRING,
                      description: "The type of issue: 'accent', 'apostrophe', 'punctuation', 'spacing', 'common_error', 'grammar', 'style'."
                    }
                  },
                  required: ["original", "replacement", "message", "type"]
                }
              }
            },
            required: ["issues"]
          }
        }
      });

      const resultText = response.text || "{}";
      const parsed = JSON.parse(resultText);
      const issues = parsed.issues || [];

      // Calculate dynamic index in the string to prevent index shifting/mismatches
      const issuesWithIndices = issues.map((issue: any, idx: number) => {
        const index = text.indexOf(issue.original);
        if (index === -1) return null;

        // Context preview
        const start = Math.max(0, index - 25);
        const end = Math.min(text.length, index + issue.original.length + 25);
        let context = text.substring(start, end);
        if (start > 0) context = "..." + context;
        if (end < text.length) context = context + "...";

        return {
          id: `gemini-${idx}-${index}`,
          type: issue.type,
          original: issue.original,
          replacement: issue.replacement,
          message: issue.message,
          context,
          index
        };
      }).filter(Boolean);

      res.json({ issues: issuesWithIndices });
    } catch (error: any) {
      console.error("Gemini spellcheck error:", error);
      res.status(500).json({ error: error.message || "Errore durante l'analisi del testo" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
