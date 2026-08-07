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
  const DEFAULT_IMG = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?fm=jpg&fit=crop&w=1200&h=630&q=80';
  if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('data:') || url.startsWith('blob:')) {
    return DEFAULT_IMG;
  }

  let img = url.trim();
  if (img.startsWith('//')) {
    img = `https:${img}`;
  } else if (img.startsWith('/')) {
    img = `https://${host}${img}`;
  } else if (img.startsWith('http://')) {
    img = img.replace('http://', 'https://');
  }

  if (img.includes('images.unsplash.com')) {
    const baseUrl = img.split('?')[0];
    return `${baseUrl}?fm=jpg&fit=crop&w=1200&h=630&q=80`;
  }

  if (img.includes('ik.imagekit.io')) {
    const baseUrl = img.split('?')[0];
    return `${baseUrl}?tr=f-jpg,w-1200,h-630,q-80`;
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

    const rawHost = req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.tribunabrasil.online';
    const host = rawHost === 'tribunabrasil.online' ? 'www.tribunabrasil.online' : rawHost;
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    let title = 'Tribuna Brasil - Portal de Notícias do Brasil e do Mundo';
    let rawDesc = 'Acompanhe as últimas notícias em tempo real sobre Política, Economia, Tecnologia, Esportes e Entretenimento no portal Tribuna Brasil.';
    let rawImg = '';
    let fullUrl = `${baseUrl}/`;
    let ogType = 'website';

    if (article) {
      ogType = 'article';
      title = `${article.title} - Tribuna Brasil`;
      rawDesc = article.subtitle || article.excerpt || article.title || rawDesc;
      rawImg = article.coverImage || '';
      fullUrl = `${baseUrl}/noticia/${article.slug || article.id || cleanSlug}`;
    } else if (cleanSlug && cleanSlug !== 'home') {
      ogType = 'article';
      const formattedTitle = cleanSlug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      title = `${formattedTitle} - Tribuna Brasil`;
      fullUrl = `${baseUrl}/noticia/${cleanSlug}`;
    }

    const description = rawDesc
      .replace(/<[^>]*>?/gm, '')
      .replace(/"/g, '&quot;')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    const image = formatSocialImage(rawImg, protocol, host);
    let imageType = 'image/jpeg';
    if (image.includes('tr=f-jpg') || image.includes('fm=jpg') || image.includes('.jpg') || image.includes('.jpeg')) {
      imageType = 'image/jpeg';
    } else if (image.includes('tr=f-png') || image.includes('fm=png') || image.includes('.png')) {
      imageType = 'image/png';
    } else if (image.includes('tr=f-webp') || image.includes('fm=webp') || image.includes('.webp')) {
      imageType = 'image/webp';
    }

    const escapedTitle = title.replace(/"/g, '&quot;');
    const escapedDesc = description.replace(/"/g, '&quot;');

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${escapedTitle}</title>`);

    // Clean up any default fallback meta tags
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:|description|title)[^"']*["'].*?>/gi, '');
    html = html.replace(/<link\s+rel=["']canonical["'].*?>/gi, '');

    const pubTime = article?.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString();
    const category = article?.category || article?.categoryName || 'Notícias';

    const ogTags = `
    <!-- Dynamic Article Meta Tags for Facebook, WhatsApp & Twitter -->
    <link rel="canonical" href="${fullUrl}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="title" content="${escapedTitle}" />
    <meta name="description" content="${escapedDesc}" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="Tribuna Brasil" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDesc}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:url" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapedTitle}" />
    <meta property="og:locale" content="pt_BR" />
    ${ogType === 'article' ? `<meta property="article:published_time" content="${pubTime}" />` : ''}
    ${ogType === 'article' ? `<meta property="article:section" content="${category}" />` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@tribunabrasil" />
    <meta name="twitter:creator" content="@tribunabrasil" />
    <meta name="twitter:domain" content="${host.replace(/^www\./, '')}" />
    <meta name="twitter:url" content="${fullUrl}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDesc}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:src" content="${image}" />
    <meta name="twitter:image:alt" content="${escapedTitle}" />
    <meta property="twitter:image" content="${image}" />
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


