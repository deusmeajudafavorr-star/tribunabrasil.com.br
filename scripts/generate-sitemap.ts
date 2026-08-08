import fs from 'fs';
import path from 'path';
import { INITIAL_ARTICLES } from '../src/data/initialData';

async function generateStaticSitemap() {
  const DOMAIN = 'https://tribunabrasil.online';

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
    console.error('Erro ao buscar matérias do Firebase para o Sitemap estático:', err);
  }

  const allArticles = [...fbArticles, ...INITIAL_ARTICLES];
  const articleMap = new Map();
  for (const a of allArticles) {
    if (!a) continue;
    const key = a.slug || a.id;
    if (key && !articleMap.has(key)) {
      articleMap.set(key, a);
    }
  }

  const categories = ['brasil', 'politica', 'economia', 'tecnologia', 'esportes', 'entretenimento', 'mundo'];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
  xml += '  <url>\n';
  xml += '    <loc>' + DOMAIN + '/</loc>\n';
  xml += '    <lastmod>' + safeIsoDate(new Date()) + '</lastmod>\n';
  xml += '    <changefreq>always</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  for (const cat of categories) {
    xml += '  <url>\n';
    xml += '    <loc>' + DOMAIN + '/categoria/' + cat + '</loc>\n';
    xml += '    <lastmod>' + safeIsoDate(new Date()) + '</lastmod>\n';
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  for (const article of articleMap.values()) {
    if (article.status && article.status !== 'published') continue;
    const slug = article.slug || article.id;
    if (!slug) continue;

    const url = DOMAIN + '/noticia/' + escapeXml(slug);
    const pubDate = safeIsoDate(article.publishedAt);
    const title = escapeXml(article.title || 'Notícia');
    const imgUrl = article.coverImage ? escapeXml(article.coverImage) : '';

    xml += '  <url>\n';
    xml += '    <loc>' + url + '</loc>\n';
    xml += '    <lastmod>' + pubDate + '</lastmod>\n';
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '    <news:news>\n';
    xml += '      <news:publication>\n';
    xml += '        <news:name>Tribuna Brasil</news:name>\n';
    xml += '        <news:language>pt</news:language>\n';
    xml += '      </news:publication>\n';
    xml += '      <news:publication_date>' + pubDate + '</news:publication_date>\n';
    xml += '      <news:title>' + title + '</news:title>\n';
    xml += '    </news:news>\n';

    if (imgUrl) {
      xml += '    <image:image>\n';
      xml += '      <image:loc>' + imgUrl + '</image:loc>\n';
      xml += '      <image:title>' + title + '</image:title>\n';
      xml += '    </image:image>\n';
    }

    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf-8');
  console.log('✅ Sitemap estático gerado com sucesso em public/sitemap.xml. Total de URLs:', 1 + categories.length + articleMap.size);

  // Generate sitemap-news.xml for Google News (last 48 hours)
  const now = Date.now();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const articlesList = Array.from(articleMap.values()).filter((art: any) => !art.status || art.status === 'published');
  
  let newsArticles = articlesList.filter((art: any) => {
    const pubTime = new Date(art.publishedAt).getTime();
    return !isNaN(pubTime) && (now - pubTime) <= fortyEightHoursMs;
  });

  if (newsArticles.length === 0) {
    newsArticles = [...articlesList]
      .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 10);
  }

  let newsXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  newsXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  newsXml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
  newsXml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const article of newsArticles) {
    const slug = article.slug || article.id;
    if (!slug) continue;

    const url = DOMAIN + '/noticia/' + escapeXml(slug);
    const pubDate = safeIsoDate(article.publishedAt);
    const title = escapeXml(article.title || 'Notícia');
    const imgUrl = article.coverImage ? escapeXml(article.coverImage) : '';

    newsXml += '  <url>\n';
    newsXml += '    <loc>' + url + '</loc>\n';
    newsXml += '    <lastmod>' + pubDate + '</lastmod>\n';
    newsXml += '    <news:news>\n';
    newsXml += '      <news:publication>\n';
    newsXml += '        <news:name>Tribuna Brasil</news:name>\n';
    newsXml += '        <news:language>pt</news:language>\n';
    newsXml += '      </news:publication>\n';
    newsXml += '      <news:publication_date>' + pubDate + '</news:publication_date>\n';
    newsXml += '      <news:title>' + title + '</news:title>\n';
    newsXml += '    </news:news>\n';

    if (imgUrl) {
      newsXml += '    <image:image>\n';
      newsXml += '      <image:loc>' + imgUrl + '</image:loc>\n';
      newsXml += '      <image:title>' + title + '</image:title>\n';
      newsXml += '    </image:image>\n';
    }

    newsXml += '  </url>\n';
  }

  newsXml += '</urlset>\n';

  fs.writeFileSync(path.join(publicDir, 'sitemap-news.xml'), newsXml, 'utf-8');
  console.log('✅ Sitemap Google News gerado com sucesso em public/sitemap-news.xml. Total de matérias recentes:', newsArticles.length);
}

generateStaticSitemap();
