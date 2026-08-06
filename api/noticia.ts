import fs from 'fs';
import path from 'path';

let INITIAL_ARTICLES: any[] = [];
try {
  // Try importing static initial data if available at runtime
  const initialDataModule = require('../src/data/initialData');
  if (initialDataModule && initialDataModule.INITIAL_ARTICLES) {
    INITIAL_ARTICLES = initialDataModule.INITIAL_ARTICLES;
  }
} catch (e) {
  console.warn('Could not load initialData in serverless function, falling back to Firebase only:', e);
}

const FIREBASE_DB_URL = 'https://notaziavoz-default-rtdb.firebaseio.com/articles.json';

function normalizeSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'a', 'o', 'as', 'os', 'e', 'ou', 'com', 'por', 'para', 'que',
  'se', 'um', 'uma', 'uns', 'umas', 'mais', 'como', 'sua', 'seu',
  'sobre', 'entre', 'ate', 'ao', 'aos', 'noticia', 'materia', 'article'
]);

function getWords(str: string): string[] {
  return normalizeSlug(str)
    .split('-')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function findBestMatchingArticle(allArticles: any[], targetSlug: string): any | null {
  if (!allArticles || allArticles.length === 0 || !targetSlug) return null;

  const cleanSlug = normalizeSlug(targetSlug);
  if (!cleanSlug) return null;

  // 1. Exact match
  for (const a of allArticles) {
    if (!a) continue;
    const aSlug = normalizeSlug(a.slug || '');
    const aId = normalizeSlug(a.id || '');
    const aTitleSlug = normalizeSlug(a.title || '');

    if (aSlug === cleanSlug || aId === cleanSlug || aTitleSlug === cleanSlug) {
      return a;
    }
  }

  // 2. High word-overlap matching
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

  if (bestScore >= 0.45) {
    return bestArticle;
  }

  return null;
}

function formatSocialImage(url: string, protocol: string, host: string): string {
  const DEFAULT_IMG = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&h=630&q=80';
  if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:')) {
    return DEFAULT_IMG;
  }

  let img = url.trim();
  if (img.startsWith('/')) {
    img = `${protocol}://${host}${img}`;
  } else if (img.startsWith('http://')) {
    img = img.replace('http://', 'https://');
  }

  if (img.includes('images.unsplash.com')) {
    const baseUrl = img.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&w=1200&h=630&q=80`;
  }

  return img;
}

async function fetchFirebaseArticles(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(FIREBASE_DB_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data) {
        if (Array.isArray(data)) {
          return data.filter(Boolean);
        }
        return Object.values(data).filter(Boolean);
      }
    }
  } catch (err) {
    console.error('Error fetching articles from Firebase in serverless function:', err);
  }
  return [];
}

export default async function handler(req: any, res: any) {
  const DEFAULT_HTML_TEMPLATE = `<!doctype html>
<html lang="pt-BR" prefix="og: http://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Tribuna Brasil - Portal de Notícias</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  try {
    let slug = (req.query?.slug as string) || '';
    if (Array.isArray(slug)) {
      slug = (slug as string[]).join('/');
    }

    try {
      slug = decodeURIComponent(slug).toLowerCase().trim();
    } catch {
      slug = slug.toLowerCase().trim();
    }

    slug = slug.replace(/^(noticia|materia|article)\//i, '');
    const cleanSlug = normalizeSlug(slug);

    const fbArticles = await fetchFirebaseArticles();
    const allArticles = [...fbArticles, ...INITIAL_ARTICLES];

    const article = findBestMatchingArticle(allArticles, cleanSlug);

    let indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(process.cwd(), 'index.html');
    }

    let rawHtml = '';
    try {
      if (fs.existsSync(indexPath)) {
        rawHtml = fs.readFileSync(indexPath, 'utf-8');
      }
    } catch (e) {
      console.error('Error reading index.html:', e);
    }

    let html = rawHtml && rawHtml.includes('</head>') ? rawHtml : DEFAULT_HTML_TEMPLATE;

    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'tribunabrasil-com-br.vercel.app';
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';

    let title = 'Tribuna Brasil - Portal de Notícias';
    let rawDesc = 'Acompanhe as últimas notícias do Brasil e do mundo no Tribuna Brasil.';
    let rawImg = '';
    let fullUrl = `${protocol}://${host}/noticia/${cleanSlug || 'home'}`;

    if (article) {
      title = `${article.title} | Tribuna Brasil`;
      rawDesc = article.subtitle || article.excerpt || article.title || rawDesc;
      rawImg = article.coverImage || '';
      fullUrl = `${protocol}://${host}/noticia/${article.slug || article.id || cleanSlug}`;
    } else if (cleanSlug && cleanSlug !== 'home') {
      const formattedTitle = cleanSlug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      title = `${formattedTitle} | Tribuna Brasil`;
    }

    const description = rawDesc
      .replace(/<[^>]*>?/gm, '')
      .replace(/"/g, '&quot;')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);

    const image = formatSocialImage(rawImg, protocol, host);

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

    // Clean up any default fallback meta tags
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:|description|title)[^"']*["'].*?>/gi, '');

    const pubTime = article?.publishedAt || new Date().toISOString();
    const category = article?.category || 'Notícias';

    const ogTags = `
    <!-- Dynamic Article Meta Tags for Facebook, WhatsApp & Twitter -->
    <link rel="canonical" href="${fullUrl}" />
    <meta name="title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="description" content="${description}" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Tribuna Brasil" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="article:published_time" content="${pubTime}" />
    <meta property="article:section" content="${category}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${fullUrl}" />
    <meta name="twitter:site" content="@tribunabrasil" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  `;

    html = html.replace('</head>', `${ogTags}\n  </head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.status(200).send(html);
  } catch (globalError) {
    console.error('Fatal error in /api/noticia serverless function:', globalError);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(DEFAULT_HTML_TEMPLATE);
  }
}


