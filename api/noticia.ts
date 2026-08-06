import fs from 'fs';
import path from 'path';
import { INITIAL_ARTICLES } from '../src/data/initialData';

export default function handler(req: any, res: any) {
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

  // Find article matching slug or id
  const article = INITIAL_ARTICLES.find(
    (a) =>
      a.slug?.toLowerCase() === slug ||
      a.id?.toLowerCase() === slug ||
      a.slug?.toLowerCase() === slug.replace(/^noticia-/, '')
  );

  let indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(process.cwd(), 'index.html');
  }

  let html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : '';

  if (article && html) {
    const title = `${article.title} - Tribuna Brasil`;
    const description = (article.subtitle || article.excerpt || article.title)
      .replace(/"/g, '&quot;')
      .replace(/\n/g, ' ');
    const image = article.coverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200';
    const host = req.headers.host || 'tribunabrasil-com-br.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const fullUrl = `${protocol}://${host}/noticia/${article.slug || article.id}`;

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

    // Remove fallback meta tags to avoid duplication
    html = html.replace(/<meta\s+(property|name)=["'](og:|twitter:)[^"']*["'].*?>/gi, '');

    // Inject rich Open Graph & Twitter Card meta tags for Facebook / WhatsApp / Twitter
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
