import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini API client on server side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "News Portal API" });
  });

  // --- WSJ NewsAPI Rate Limiting & Integration ---
  interface RateLimitTracker {
    date: string;
    count: number;
    lastSyncTime: string | null;
  }

  let rateLimit: RateLimitTracker = {
    date: new Date().toISOString().split("T")[0],
    count: 0,
    lastSyncTime: null,
  };

  function checkAndResetDailyLimit() {
    const today = new Date().toISOString().split("T")[0];
    if (rateLimit.date !== today) {
      rateLimit.date = today;
      rateLimit.count = 0;
    }
  }

  // Get current rate limit status
  app.get("/api/news/wsj/status", (_req, res) => {
    checkAndResetDailyLimit();
    res.json({
      date: rateLimit.date,
      requestsToday: rateLimit.count,
      maxAllowed: 10,
      remainingRequests: Math.max(0, 10 - rateLimit.count),
      lastSyncTime: rateLimit.lastSyncTime,
      wsjUser: {
        id: "user-wsj",
        name: "Correspondente Wall Street Journal",
        email: "wsj.correspondent@tribunabrasil.com.br",
        role: "colunista",
      },
    });
  });

  // Sync WSJ News (Max 10 requests per day)
  app.post("/api/news/wsj/sync", async (req, res) => {
    checkAndResetDailyLimit();

    if (rateLimit.count >= 10) {
      return res.status(429).json({
        success: false,
        rateLimited: true,
        requestsToday: rateLimit.count,
        maxAllowed: 10,
        message: "Limite diário de 10 requisições atingido. A sincronização automática retornará amanhã.",
      });
    }

    rateLimit.count += 1;
    rateLimit.lastSyncTime = new Date().toISOString();

    const apiKey = process.env.NEWS_API_KEY || "dfab3e5273af4a9a97a1aa30c661fc77";
    const url = `https://newsapi.org/v2/everything?domains=wsj.com&apiKey=${apiKey}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "TribunaBrasilPortal/1.0 (NodeJS)",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          success: false,
          error: `Erro ao comunicar com NewsAPI (${response.status})`,
          details: errText,
          requestsToday: rateLimit.count,
        });
      }

      const data = await response.json();
      const articlesList = data.articles || data.artigos || [];

      const mappedArticles = articlesList.map((item: any, index: number) => {
        const rawTitle = item.title || item.título || "Notícia Wall Street Journal";
        const cleanSlug = rawTitle
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const authorName = item.author || item.autor || "Correspondente WSJ";
        const description =
          item.description || item.descrição || item.content || "Reportagem exclusiva publicada pelo The Wall Street Journal.";
        const publishedAt = item.publishedAt || item["publicado em"] || new Date().toISOString();
        const imageUrl =
          item.urlToImage || item.urlParaImagem || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200";

        const articleContent = item.content || item.contente || description;

        return {
          id: `art-wsj-${Date.now()}-${index}`,
          title: rawTitle,
          subtitle: description.length > 180 ? description.slice(0, 177) + "..." : description,
          slug: cleanSlug || `wsj-noticia-${index}`,
          categoryId: "cat-mundo",
          categoryName: "Mundo",
          authorId: "user-wsj",
          authorName: "Correspondente Wall Street Journal",
          authorAvatar: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=200",
          coverImage: imageUrl,
          imageCaption: `Foto/crédito: The Wall Street Journal (${authorName})`,
          imageCredit: "The Wall Street Journal",
          excerpt: description,
          content: `${description}\n\n### Reportagem do The Wall Street Journal\n\n${articleContent}\n\n> Matéria original publicada no portal The Wall Street Journal por ${authorName}.\n\nPara ler a matéria completa em inglês no site do parceiro, [clique aqui para acessar o The Wall Street Journal](${item.url || item.URL || "https://www.wsj.com"}).`,
          publishedAt: publishedAt,
          status: "published",
          isFeatured: false,
          views: Math.floor(Math.random() * 800) + 150,
          shares: Math.floor(Math.random() * 120) + 15,
          tags: ["WSJ", "Wall Street Journal", "Internacional", "Mundo", "Notícias"],
        };
      });

      return res.json({
        success: true,
        requestsToday: rateLimit.count,
        maxAllowed: 10,
        remainingRequests: 10 - rateLimit.count,
        lastSyncTime: rateLimit.lastSyncTime,
        articles: mappedArticles,
        totalResults: mappedArticles.length,
      });
    } catch (err: any) {
      console.error("Erro ao importar notícias da NewsAPI:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Erro interno de conexão com a API de notícias.",
        requestsToday: rateLimit.count,
      });
    }
  });

  // Background Automatic Daily Fetcher (Interval check)
  setInterval(() => {
    checkAndResetDailyLimit();
  }, 60 * 60 * 1000);

  // AI Assistant endpoint for news drafting and editing
  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { action, prompt, title, content, category } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY não configurada no servidor.",
        });
      }

      let systemInstruction =
        "Você é um assistente sênior de redação e jornalismo do portal de notícias Metrópoles. Responda sempre em português do Brasil com estilo jornalístico claro, imparcial e conciso.";

      let fullPrompt = "";

      switch (action) {
        case "generate_title":
          fullPrompt = `Gere 5 opções de títulos jornalísticos impactantes e atraentes para a seguinte notícia (categoria: ${category || "Geral"}):
Texto/Ideia: ${prompt || content}`;
          break;

        case "summarize":
          fullPrompt = `Escreva uma 'linha fina' (subtítulo jornalístico de 1 a 2 frases, máximo 180 caracteres) resumindo os fatos principais desta notícia:
Título: ${title || ""}
Conteúdo: ${content || prompt}`;
          break;

        case "suggest_tags":
          fullPrompt = `Forneça 5 a 8 palavras-chave/tags relevantes separadas por vírgula para a seguinte matéria:
Título: ${title}
Conteúdo: ${content}`;
          break;

        case "proofread":
          fullPrompt = `Revise e aprimore o seguinte texto jornalístico, corrigindo erros gramaticais e ajustando a fluidez da leitura, mantendo a veracidade dos fatos:
${content || prompt}`;
          break;

        case "generate_draft":
          fullPrompt = `Escreva um rascunho de matéria jornalística completa em estilo do portal Metrópoles sobre o tema: "${prompt}".
A matéria deve ter título chamativo, subtítulo explicativo e 3 a 4 parágrafos bem estruturados com informações contextuais relevantes.`;
          break;

        default:
          fullPrompt = prompt || "Analise a matéria atual.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text || "";

      return res.json({ result: text });
    } catch (error: any) {
      console.error("Erro na API do Gemini:", error);
      return res.status(500).json({
        error: error?.message || "Erro ao processar solicitação de IA.",
      });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
