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

async function fetchFirebaseArticles(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for serverless
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

    // Clean and decode slug
    try {
      slug = decodeURIComponent(slug).toLowerCase().trim();
    } catch {
      slug = slug.toLowerCase().trim();
    }

    // Strip prefixes
    slug = slug.replace(/^(noticia|materia|article)\//i, '');
    const cleanSlug = normalizeSlug(slug);

    // Fetch live articles from Firebase RTDB + static initial data fallback
    const fbArticles = await fetchFirebaseArticles();
    const allArticles = [...fbArticles, ...INITIAL_ARTICLES];

    let article = allArticles.find((a) => {
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

    let title = 'Tribuna Brasil - Portal de Notícias';
    let description = 'Acompanhe as últimas notícias do Brasil e do mundo no Tribuna Brasil.';
    let image = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200';
    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'tribunabrasil-com-br.vercel.app';
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';
    let fullUrl = `${protocol}://${host}/noticia/${slug}`;

    if (article) {
      title = `${article.title} - Tribuna Brasil`;
      description = (article.subtitle || article.excerpt || article.title || '')
        .replace(/"/g, '&quot;')
        .replace(/<[^>]*>?/gm, '') // Strip any HTML tags from excerpt
        .replace(/\s+/g, ' ')
        .trim();
      if (article.coverImage) {
        image = article.coverImage;
      }
      fullUrl = `${protocol}://${host}/noticia/${article.slug || article.id}`;
    } else if (slug && slug !== 'home') {
      // Generate clean title from slug if article not found in DB
      const formattedTitle = slug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      title = `${formattedTitle} - Tribuna Brasil`;
    }

    // Ensure image URL is absolute and starts with https
    if (image.startsWith('/')) {
      image = `${protocol}://${host}${image}`;
    } else if (image.startsWith('http://')) {
      image = image.replace('http://', 'https://');
    }

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

    // Remove existing fallback meta tags to avoid duplicate tag conflicts for crawlers
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:|description|title)[^"']*["'].*?>/gi, '');

    // Inject rich Open Graph & Twitter Card meta tags for Facebook, WhatsApp, Twitter, Instagram
    const ogTags = `
    <!-- Dynamic Article Meta Tags for Facebook, WhatsApp & Twitter -->
    <meta name="title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="description" content="${description}" />

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


