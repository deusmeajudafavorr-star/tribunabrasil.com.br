import fs from 'fs';
import path from 'path';
import { INITIAL_ARTICLES } from '../src/data/initialData';

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
    const response = await fetch(FIREBASE_DB_URL);
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
    console.error('Error fetching articles from Firebase:', err);
  }
  return [];
}

export default async function handler(req: any, res: any) {
  let slug = (req.query.slug as string) || '';
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

  let html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : '';

  let title = 'Tribuna Brasil - Portal de Notícias';
  let description = 'Acompanhe as últimas notícias do Brasil e do mundo no Tribuna Brasil.';
  let image = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200';
  const host = req.headers.host || 'tribunabrasil-com-br.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  let fullUrl = `${protocol}://${host}/noticia/${slug}`;

  if (article) {
    title = `${article.title} - Tribuna Brasil`;
    description = (article.subtitle || article.excerpt || article.title)
      .replace(/"/g, '&quot;')
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

  if (html) {
    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

    // Remove existing fallback meta tags to avoid duplicate tag conflicts for crawlers
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:)[^"']*["'].*?>/gi, '');

    // Inject rich Open Graph & Twitter Card meta tags for Facebook, WhatsApp, Twitter, Instagram
    const ogTags = `
    <!-- Dynamic Article Open Graph Meta Tags -->
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
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

