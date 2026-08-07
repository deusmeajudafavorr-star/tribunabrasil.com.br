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

  // Service Worker for Monetag Monetization Verification
  app.get(["/sw.js", "/service-worker.js"], (_req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.send(`self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11519015
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')`);
  });

  // --- TECHNICAL SEO ENDPOINTS: robots.txt & dynamic sitemap.xml ---
  app.get("/robots.txt", (_req, res) => {
    res.header("Content-Type", "text/plain");
    res.header("Cache-Control", "public, max-age=86400");
    res.send(`User-agent: *
Allow: /

Sitemap: https://tribunabrasil.online/sitemap.xml`);
  });

  app.get("/sitemap.xml", async (_req, res) => {
    generateSitemap(res);
  });

  app.get("/sitemap", async (_req, res) => {
    generateSitemap(res);
  });

  async function generateSitemap(res: any) {
    const DOMAIN = "https://tribunabrasil.online";

    const safeIsoDate = (dateVal: any) => {
      try {
        if (!dateVal) return new Date().toISOString();
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return new Date().toISOString();
        return d.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const escapeXml = (unsafe: string) => {
      if (!unsafe) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    };

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
      console.error('Erro ao carregar matérias do Firebase para o Sitemap:', err);
    }

    try {
      const allArticles = [...fbArticles, ...INITIAL_ARTICLES];
      const articleMap = new Map();
      for (const a of allArticles) {
        if (!a) continue;
        const key = a.slug || a.id;
        if (key && !articleMap.has(key)) {
          articleMap.set(key, a);
        }
      }

      const categories = [
        'brasil', 'politica', 'economia', 'tecnologia', 'esportes', 'entretenimento', 'mundo'
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${safeIsoDate(new Date())}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>`;

      for (const cat of categories) {
        xml += `
  <url>
    <loc>${DOMAIN}/categoria/${cat}</loc>
    <lastmod>${safeIsoDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      }

      for (const article of articleMap.values()) {
        if (article.status && article.status !== 'published') continue;
        const slug = article.slug || article.id;
        if (!slug) continue;

        const url = `${DOMAIN}/noticia/${escapeXml(slug)}`;
        const pubDate = safeIsoDate(article.publishedAt);
        const title = escapeXml(article.title || 'Notícia');
        const imgUrl = article.coverImage ? escapeXml(article.coverImage) : '';

        xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${pubDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <news:news>
      <news:publication>
        <news:name>Tribuna Brasil</news:name>
        <news:language>pt</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>`;

        if (imgUrl) {
          xml += `
    <image:image>
      <image:loc>${imgUrl}</image:loc>
      <image:title>${title}</image:title>
    </image:image>`;
        }

        xml += `
  </url>`;
      }

      xml += `
</urlset>`;

      res.header("Content-Type", "application/xml; charset=utf-8");
      res.header("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (error) {
      console.error('Erro na geração do Sitemap:', error);
      res.header("Content-Type", "application/xml; charset=utf-8");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`);
    }
  }

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
    const urlPath = req.path || '';
    const query = req.query || {};

    let targetSlug = "";
    const cleanPath = urlPath.split('?')[0].replace(/\/+$/, '');

    if (cleanPath.startsWith("/noticia/")) {
      targetSlug = cleanPath.replace("/noticia/", "").trim();
    } else if (cleanPath.startsWith("/materia/")) {
      targetSlug = cleanPath.replace("/materia/", "").trim();
    } else if (cleanPath.startsWith("/article/")) {
      targetSlug = cleanPath.replace("/article/", "").trim();
    } else if (query.noticia) {
      targetSlug = String(query.noticia).trim();
    } else if (query.materia) {
      targetSlug = String(query.materia).trim();
    } else if (query.slug) {
      targetSlug = String(query.slug).trim();
    } else if (cleanPath.length > 1 && !cleanPath.startsWith('/admin') && !cleanPath.startsWith('/api') && !cleanPath.startsWith('/categoria')) {
      targetSlug = cleanPath.replace(/^\//, '').trim();
    }

    try {
      if (targetSlug) {
        targetSlug = decodeURIComponent(targetSlug).toLowerCase().trim();
      }
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

    const STOP_WORDS = new Set([
      'de', 'da', 'do', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
      'a', 'o', 'as', 'os', 'e', 'ou', 'com', 'por', 'para', 'que',
      'se', 'um', 'uma', 'uns', 'umas', 'mais', 'como', 'sua', 'seu',
      'sobre', 'entre', 'ate', 'ao', 'aos', 'noticia', 'materia', 'article'
    ]);

    const getWords = (str: string): string[] => {
      return normalizeSlug(str)
        .split('-')
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    };

    const findBestMatchingArticle = (allArticles: any[], targetSlug: string): any | null => {
      if (!allArticles || allArticles.length === 0 || !targetSlug) return null;
      const cleanSlug = normalizeSlug(targetSlug);
      if (!cleanSlug) return null;

      for (const a of allArticles) {
        if (!a) continue;
        const aSlug = normalizeSlug(a.slug || '');
        const aId = normalizeSlug(a.id || '');
        const aTitleSlug = normalizeSlug(a.title || '');

        if (aSlug === cleanSlug || aId === cleanSlug || aTitleSlug === cleanSlug) {
          return a;
        }
      }

      const targetWords = getWords(targetSlug);
      if (targetWords.length === 0) return null;

      let bestArticle = null;
      let bestScore = 0;

      for (const a of allArticles) {
        if (!a) continue;
        const candidateWords = new Set([
          ...getWords(a.slug || ''),
          ...getWords(a.id || ''),
          ...getWords(a.title || ''),
        ]);

        if (candidateWords.size === 0) continue;

        let matchCount = 0;
        for (const tw of targetWords) {
          if (candidateWords.has(tw)) {
            matchCount++;
          }
        }

        const score = matchCount / targetWords.length;
        if (score > bestScore) {
          bestScore = score;
          bestArticle = a;
        }
      }

      if (bestScore >= 0.4) {
        return bestArticle;
      }

      return null;
    };

    const DEFAULT_IMG = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?fm=jpg&fit=crop&w=1200&h=630&q=80';

    const formatSocialImage = (url: string): string => {
      if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('data:') || url.startsWith('blob:')) {
        return DEFAULT_IMG;
      }

      let img = url.trim();
      if (img.startsWith('//')) {
        img = `https:${img}`;
      } else if (img.startsWith('/')) {
        img = `https://www.tribunabrasil.online${img}`;
      } else if (img.startsWith('http://')) {
        img = img.replace('http://', 'https://');
      }

      if (img.includes('images.unsplash.com')) {
        const baseUrl = img.split('?')[0];
        return `${baseUrl}?fm=jpg&fit=crop&w=1200&h=630&q=80`;
      }

      if (img.includes('ik.imagekit.io')) {
        const parts = img.split('?')[0].split('ik.imagekit.io/');
        if (parts.length === 2) {
          const subparts = parts[1].split('/');
          const accountId = subparts[0];
          const imagePath = subparts.slice(1).filter((p) => !p.startsWith('tr:')).join('/');
          return `https://ik.imagekit.io/${accountId}/tr:w-1200,h-630,f-jpg/${imagePath}`;
        }
      }

      return img;
    };

    const cleanSlug = targetSlug ? normalizeSlug(targetSlug) : '';

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
    const matchedArticle = cleanSlug ? findBestMatchingArticle(allArticles, cleanSlug) : null;

    let title = 'Tribuna Brasil - Portal de Notícias do Brasil e do Mundo';
    let rawDesc = 'Acompanhe as últimas notícias em tempo real sobre Política, Economia, Tecnologia, Esportes e Entretenimento no portal Tribuna Brasil.';
    let rawImg = DEFAULT_IMG;
    let canonicalUrl = 'https://www.tribunabrasil.online/';
    let ogType = 'website';

    if (matchedArticle) {
      title = `${matchedArticle.title} - Tribuna Brasil`;
      rawDesc = matchedArticle.subtitle || matchedArticle.excerpt || matchedArticle.title || rawDesc;
      rawImg = matchedArticle.coverImage || DEFAULT_IMG;
      canonicalUrl = `https://www.tribunabrasil.online/noticia/${matchedArticle.slug || matchedArticle.id || cleanSlug}`;
      ogType = 'article';
    } else if (cleanSlug && cleanSlug !== 'home') {
      const formattedTitle = targetSlug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      title = `${formattedTitle} - Tribuna Brasil`;
      canonicalUrl = `https://www.tribunabrasil.online/noticia/${cleanSlug}`;
      ogType = 'article';
    }

    const description = rawDesc
      .replace(/<[^>]*>?/gm, '')
      .replace(/"/g, '&quot;')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    const image = formatSocialImage(rawImg);
    let imageType = 'image/jpeg';
    if (image.includes('tr=f-jpg') || image.includes('fm=jpg') || image.includes('.jpg') || image.includes('.jpeg')) {
      imageType = 'image/jpeg';
    } else if (image.includes('tr=f-png') || image.includes('fm=png') || image.includes('.png')) {
      imageType = 'image/png';
    } else if (image.includes('tr=f-webp') || image.includes('fm=webp') || image.includes('.webp')) {
      imageType = 'image/webp';
    }

    let html = rawHtml;

    // Remove existing meta tags from head to prevent duplication
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:|description|title)[^"']*["'].*?>/gi, '');
    html = html.replace(/<link\s+rel=["']canonical["'].*?>/gi, '');

    const pubTime = matchedArticle?.publishedAt ? new Date(matchedArticle.publishedAt).toISOString() : new Date().toISOString();
    const categoryName = matchedArticle?.categoryName || matchedArticle?.category || 'Notícias';
    const authorName = matchedArticle?.authorName || 'Redação Tribuna Brasil';

    // Schema.org NewsArticle JSON-LD
    const newsArticleSchema = matchedArticle
      ? {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          'mainEntityOfPage': {
            '@type': 'WebPage',
            '@id': canonicalUrl,
          },
          'headline': matchedArticle.title,
          'description': description,
          'image': [image],
          'datePublished': pubTime,
          'dateModified': pubTime,
          'author': {
            '@type': 'Person',
            'name': authorName,
            'url': 'https://tribunabrasil.online',
          },
          'publisher': {
            '@type': 'NewsMediaOrganization',
            'name': 'Tribuna Brasil',
            'url': 'https://tribunabrasil.online',
            'logo': {
              '@type': 'ImageObject',
              'url': 'https://tribunabrasil.online/favicon.svg',
              'width': 600,
              'height': 60,
            },
          },
          'articleSection': categoryName,
          'keywords': (matchedArticle.tags || []).join(', '),
          'inLanguage': 'pt-BR',
        }
      : null;

    // Inject complete Open Graph, Twitter Card & Meta Tags
    const ogTags = `
    <title>${title}</title>
    <!-- Technical SEO & Meta Tags -->
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="description" content="${description}" />

    <!-- Open Graph Meta Tags for Facebook, WhatsApp & Social Sharing -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="Tribuna Brasil" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:url" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:locale" content="pt_BR" />
    ${ogType === 'article' ? `<meta property="article:published_time" content="${pubTime}" />` : ''}
    ${ogType === 'article' ? `<meta property="article:section" content="${categoryName}" />` : ''}
    ${ogType === 'article' ? `<meta property="article:author" content="${authorName}" />` : ''}

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@tribunabrasil" />
    <meta name="twitter:creator" content="@tribunabrasil" />
    <meta name="twitter:domain" content="tribunabrasil.online" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:src" content="${image}" />
    <meta name="twitter:image:alt" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="twitter:image" content="${image}" />

    ${
      newsArticleSchema
        ? `<script type="application/ld+json" id="schema-org-newsarticle">${JSON.stringify(newsArticleSchema)}</script>`
        : ''
    }
    `;

    if (html.includes('<meta charset="UTF-8" />')) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${ogTags}`);
    } else if (html.includes('<meta charset="utf-8">')) {
      return html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n${ogTags}`);
    }
    return html.replace('<head>', `<head>\n${ogTags}`);
  }

  // Intercept HTML requests in Express to ensure Open Graph tags are injected for crawlers & users
  const handleHtmlRequest = async (req: express.Request, res: express.Response, rawHtmlSupplier: () => string) => {
    try {
      const rawHtml = rawHtmlSupplier();
      if (!rawHtml) {
        return res.status(404).send('Not Found');
      }
      const finalHtml = await renderHtmlWithMeta(req, rawHtml);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(finalHtml);
    } catch (err) {
      console.error('Error rendering HTML with meta:', err);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(rawHtmlSupplier());
    }
  };

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      plugins: [
        {
          name: "html-meta-transform",
          transformIndexHtml: {
            order: "post",
            handler: async (html, ctx: any) => {
              try {
                if (ctx.req) {
                  return await renderHtmlWithMeta(ctx.req, html);
                }
              } catch (e) {
                console.error("Error in dev html meta transform:", e);
              }
              return html;
            },
          },
        },
      ],
    });

    app.get(['/noticia/*', '/materia/*', '/article/*'], async (req, res, next) => {
      try {
        const indexHtmlPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          let rawHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
          rawHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          const finalHtml = await renderHtmlWithMeta(req, rawHtml);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(finalHtml);
        }
      } catch (err) {
        console.error("Error serving article in dev mode:", err);
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Static files (JS, CSS, images) served without automatic index.html fallback
    app.use(express.static(distPath, { index: false }));

    // SPA fallback with dynamic Open Graph & Meta tags injection
    app.get("*", async (req, res, next) => {
      if (
        req.path.startsWith("/api") ||
        req.path === "/sitemap.xml" ||
        req.path === "/sitemap" ||
        req.path === "/robots.txt"
      ) {
        return next();
      }

      const distIndexPath = path.join(distPath, "index.html");
      if (fs.existsSync(distIndexPath)) {
        try {
          const rawHtml = fs.readFileSync(distIndexPath, "utf-8");
          const finalHtml = await renderHtmlWithMeta(req, rawHtml);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(finalHtml);
        } catch (err) {
          console.error("Error serving HTML:", err);
        }
      }
      return res.status(404).send("Not found");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
