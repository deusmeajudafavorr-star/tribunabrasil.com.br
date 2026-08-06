import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INITIAL_ARTICLES } from "./src/data/initialData";

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

  // Helper function to translate article from English to pt-BR using Gemini AI
  async function translateArticleToPortuguese(
    rawTitle: string,
    description: string,
    content: string
  ): Promise<{ title: string; subtitle: string; content: string }> {
    if (!process.env.GEMINI_API_KEY) {
      return { title: rawTitle, subtitle: description, content };
    }

    try {
      const prompt = `Traduza a seguinte notícia jornalística do inglês para o português do Brasil com linguagem jornalística elegante, clara e profissional para o portal Tribuna Brasil:

TÍTULO ORIGINAL EM INGLÊS:
${rawTitle}

RESUMO/SUBTÍTULO ORIGINAL EM INGLÊS:
${description}

CONTEÚDO ORIGINAL EM INGLÊS:
${content}

Responda ESTRITAMENTE em formato JSON VÁLIDO sem marcações markdown extra com o seguinte formato:
{
  "title": "Título traduzido e adaptado em Português do Brasil",
  "subtitle": "Subtítulo de 1 a 2 frases traduzido em Português do Brasil",
  "content": "Texto do artigo traduzido e bem estruturado em parágrafos em Português do Brasil"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const jsonStr = response.text || "";
      const parsed = JSON.parse(jsonStr);

      return {
        title: parsed.title || rawTitle,
        subtitle: parsed.subtitle || description,
        content: parsed.content || content,
      };
    } catch (e) {
      console.error("Erro ao traduzir notícia com Gemini:", e);
      return { title: rawTitle, subtitle: description, content };
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

      // Automatically translate all articles to Brazilian Portuguese
      const mappedArticles = await Promise.all(
        articlesList.map(async (item: any, index: number) => {
          const rawTitle = item.title || item.título || "Notícia Wall Street Journal";
          const authorName = item.author || item.autor || "Correspondente WSJ";
          const description =
            item.description || item.descrição || item.content || "Reportagem exclusiva publicada pelo The Wall Street Journal.";
          const publishedAt = item.publishedAt || item["publicado em"] || new Date().toISOString();
          const imageUrl =
            item.urlToImage || item.urlParaImagem || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200";

          const articleContent = item.content || item.contente || description;

          // Auto-translate using Gemini 3.6 Flash
          const translated = await translateArticleToPortuguese(rawTitle, description, articleContent);

          const finalTitle = translated.title;
          const finalSubtitle = translated.subtitle;
          const finalContent = translated.content;

          const cleanSlug = finalTitle
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

          return {
            id: `art-wsj-${Date.now()}-${index}`,
            title: finalTitle,
            subtitle: finalSubtitle.length > 180 ? finalSubtitle.slice(0, 177) + "..." : finalSubtitle,
            slug: cleanSlug || `wsj-noticia-${index}`,
            categoryId: "cat-mundo",
            categoryName: "Mundo",
            authorId: "user-wsj",
            authorName: "Correspondente Wall Street Journal",
            authorAvatar: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=200",
            coverImage: imageUrl,
            imageCaption: `Foto/crédito: The Wall Street Journal (${authorName})`,
            imageCredit: "The Wall Street Journal",
            excerpt: finalSubtitle,
            content: `${finalSubtitle}\n\n### Reportagem do The Wall Street Journal\n\n${finalContent}\n\n> Matéria original do The Wall Street Journal (por ${authorName}), traduzida e adaptada para o Português pela redação do Tribuna Brasil.\n\nPara ler a publicação original em inglês no site do parceiro, [clique aqui para acessar o The Wall Street Journal](${item.url || item.URL || "https://www.wsj.com"}).`,
            publishedAt: publishedAt,
            status: "published",
            isFeatured: false,
            views: Math.floor(Math.random() * 800) + 150,
            shares: Math.floor(Math.random() * 120) + 15,
            tags: ["WSJ", "Wall Street Journal", "Internacional", "Mundo", "Notícias"],
          };
        })
      );

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
          fullPrompt = `Escreva um rascunho de matéria jornalística completa em estilo do portal Tribuna Brasil sobre o tema: "${prompt}".
A matéria deve ter título chamativo, subtítulo explicativo e 3 a 4 parágrafos bem estruturados com informações contextuais relevantes.`;
          break;

        case "translate":
          fullPrompt = `Traduza e reescreva o seguinte artigo/notícia do Inglês para o Português do Brasil com linguagem jornalística impecável, elegante e concisa do portal Tribuna Brasil:
Título: ${title || ""}
Conteúdo: ${content || prompt}`;
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

  // Helper to inject dynamic Open Graph meta tags into index.html for social media crawlers
  async function renderHtmlWithMeta(req: express.Request, rawHtml: string): Promise<string> {
    const urlPath = req.path;
    const query = req.query;

    let targetSlug = "";
    if (urlPath.startsWith("/noticia/")) {
      targetSlug = urlPath.replace("/noticia/", "").trim();
    } else if (urlPath.startsWith("/materia/")) {
      targetSlug = urlPath.replace("/materia/", "").trim();
    } else if (urlPath.startsWith("/article/")) {
      targetSlug = urlPath.replace("/article/", "").trim();
    } else if (query.noticia) {
      targetSlug = String(query.noticia).trim();
    } else if (query.materia) {
      targetSlug = String(query.materia).trim();
    } else if (query.slug) {
      targetSlug = String(query.slug).trim();
    }

    if (!targetSlug || targetSlug === 'home') {
      return rawHtml;
    }

    try {
      targetSlug = decodeURIComponent(targetSlug).toLowerCase().trim();
    } catch {
      targetSlug = targetSlug.toLowerCase().trim();
    }

    const normalizeSlug = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const cleanSlug = normalizeSlug(targetSlug);

    // Fetch live articles from Firebase RTDB
    let fbArticles: any[] = [];
    try {
      const fbRes = await fetch('https://notaziavoz-default-rtdb.firebaseio.com/articles.json');
      if (fbRes.ok) {
        const data = await fbRes.json();
        if (data) {
          fbArticles = Array.isArray(data) ? data.filter(Boolean) : Object.values(data).filter(Boolean);
        }
      }
    } catch (err) {
      console.error('Error fetching Firebase articles in server.ts:', err);
    }

    const allArticles = [...fbArticles, ...INITIAL_ARTICLES];

    const matchedArticle = allArticles.find((a) => {
      if (!a) return false;
      const aSlug = normalizeSlug(a.slug || '');
      const aId = normalizeSlug(a.id || '');
      const aTitleSlug = normalizeSlug(a.title || '');

      return (
        aSlug === cleanSlug ||
        aId === cleanSlug ||
        aTitleSlug === cleanSlug ||
        (aSlug && cleanSlug && (cleanSlug.includes(aSlug) || aSlug.includes(cleanSlug)))
      );
    });

    let title = 'Tribuna Brasil - Portal de Notícias';
    let description = 'Acompanhe as últimas notícias do Brasil e do mundo no Tribuna Brasil.';
    let image = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200';
    const host = req.get('host') || 'tribunabrasil-com-br.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    let fullUrl = `${protocol}://${host}/noticia/${cleanSlug}`;

    if (matchedArticle) {
      title = `${matchedArticle.title} - Tribuna Brasil`;
      description = (matchedArticle.subtitle || matchedArticle.excerpt || matchedArticle.title)
        .replace(/"/g, '&quot;')
        .replace(/\s+/g, ' ')
        .trim();
      if (matchedArticle.coverImage) {
        image = matchedArticle.coverImage;
      }
      fullUrl = `${protocol}://${host}/noticia/${matchedArticle.slug || matchedArticle.id}`;
    } else {
      const formattedTitle = targetSlug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      title = `${formattedTitle} - Tribuna Brasil`;
    }

    let html = rawHtml;

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

    // Remove existing default og and twitter tags to prevent duplicate meta tag conflicts
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:)[^"']*["'].*?>/gi, '');

    // Inject complete Open Graph & Twitter Card Meta Tags for large social cards (Facebook, WhatsApp, Twitter, LinkedIn)
    const ogTags = `
    <!-- Dynamic Article Open Graph Meta Tags for Social Media Crawlers -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Tribuna Brasil" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:locale" content="pt_BR" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@tribunabrasil" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    `;

    return html.replace('</head>', `${ogTags}\n  </head>`);
  }

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
    app.get("*", async (req, res) => {
      const distIndexPath = path.join(distPath, "index.html");
      const rawHtml = fs.existsSync(distIndexPath) ? fs.readFileSync(distIndexPath, "utf-8") : "";
      const finalHtml = await renderHtmlWithMeta(req, rawHtml);
      res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml || rawHtml);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
