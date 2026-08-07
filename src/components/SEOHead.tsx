import React, { useEffect } from 'react';
import { Article } from '../types';

interface SEOHeadProps {
  article?: Article | null;
  categoryName?: string | null;
  viewMode?: 'home' | 'article' | 'admin' | string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  article,
  categoryName,
  viewMode = 'home',
}) => {
  useEffect(() => {
    const DOMAIN = 'https://tribunabrasil.online';

    let title = 'Tribuna Brasil - Portal de Notícias';
    let description =
      'Acompanhe as últimas notícias do Brasil e do mundo sobre Política, Economia, Tecnologia, Esportes e Entretenimento no Tribuna Brasil.';
    let canonicalUrl = DOMAIN + '/';
    let ogType = 'website';
    let ogImage =
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?fm=jpg&fit=crop&w=1200&h=630&q=80';
    let schemaJson: any = null;

    if (viewMode === 'article' && article) {
      const slug = article.slug || article.id;
      title = `${article.title} - Tribuna Brasil`;
      description =
        article.subtitle ||
        article.excerpt ||
        article.title;
      canonicalUrl = `${DOMAIN}/noticia/${slug}`;
      ogType = 'article';
      let rawImg = article.coverImage || ogImage;
      if (rawImg.includes('images.unsplash.com')) {
        rawImg = rawImg.split('?')[0] + '?fm=jpg&fit=crop&w=1200&h=630&q=80';
      }
      ogImage = rawImg;

      // Schema.org NewsArticle for Google News
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        'headline': article.title,
        'description': article.subtitle || article.excerpt || article.title,
        'image': [article.coverImage],
        'datePublished': article.publishedAt
          ? new Date(article.publishedAt).toISOString()
          : new Date().toISOString(),
        'dateModified': article.publishedAt
          ? new Date(article.publishedAt).toISOString()
          : new Date().toISOString(),
        'author': {
          '@type': 'Person',
          'name': article.authorName || 'Redação Tribuna Brasil',
          'url': DOMAIN,
        },
        'publisher': {
          '@type': 'NewsMediaOrganization',
          'name': 'Tribuna Brasil',
          'url': DOMAIN,
          'logo': {
            '@type': 'ImageObject',
            'url': `${DOMAIN}/favicon.svg`,
            'width': 600,
            'height': 60,
          },
        },
        'articleSection': article.categoryName || 'Notícias',
        'keywords': (article.tags || []).join(', '),
        'inLanguage': 'pt-BR',
      };
    } else if (categoryName) {
      const cleanCatSlug = categoryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      title = `${categoryName} - Notícias e Cobertura Completa | Tribuna Brasil`;
      description = `Acompanhe todas as notícias, reportagens e análises sobre ${categoryName} no portal Tribuna Brasil.`;
      canonicalUrl = `${DOMAIN}/categoria/${cleanCatSlug}`;

      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': title,
        'description': description,
        'url': canonicalUrl,
        'publisher': {
          '@type': 'NewsMediaOrganization',
          'name': 'Tribuna Brasil',
          'url': DOMAIN,
        },
      };
    } else {
      // Home / General page
      title = 'Tribuna Brasil - Portal de Notícias do Brasil e do Mundo';
      description =
        'Principais manchetes, jornalismo independente, política, economia, tecnologia, esportes e análises em tempo real no portal Tribuna Brasil.';
      canonicalUrl = DOMAIN + '/';

      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'Tribuna Brasil',
        'url': DOMAIN,
        'description': description,
        'publisher': {
          '@type': 'NewsMediaOrganization',
          'name': 'Tribuna Brasil',
          'url': DOMAIN,
          'logo': {
            '@type': 'ImageObject',
            'url': `${DOMAIN}/favicon.svg`,
          },
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${DOMAIN}/?s={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      };
    }

    // Clean up html string
    const cleanDesc = description
      .replace(/<[^>]*>?/gm, '')
      .replace(/"/g, '&quot;')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const setMetaTag = (attrName: 'property' | 'name', attrValue: string, contentValue: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentValue);
    };

    // Helper for canonical link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Meta Robots Index Follow
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('name', 'description', cleanDesc);

    // Open Graph
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'Tribuna Brasil');
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', cleanDesc);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:image:url', ogImage);
    setMetaTag('property', 'og:image:secure_url', ogImage);
    setMetaTag('property', 'og:image:type', ogImage.includes('.png') ? 'image/png' : 'image/jpeg');
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:locale', 'pt_BR');

    if (ogType === 'article' && article) {
      setMetaTag('property', 'article:published_time', article.publishedAt || new Date().toISOString());
      setMetaTag('property', 'article:author', article.authorName || 'Tribuna Brasil');
      setMetaTag('property', 'article:section', article.categoryName || 'Notícias');
    }

    // Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:site', '@tribunabrasil');
    setMetaTag('name', 'twitter:creator', '@tribunabrasil');
    setMetaTag('name', 'twitter:domain', 'tribunabrasil.online');
    setMetaTag('name', 'twitter:url', canonicalUrl);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', cleanDesc);
    setMetaTag('name', 'twitter:image', ogImage);
    setMetaTag('name', 'twitter:image:src', ogImage);
    setMetaTag('name', 'twitter:image:alt', title);

    // Schema.org JSON-LD
    let scriptEl = document.getElementById('schema-org-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'schema-org-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schemaJson);

    // Preload hero image for article performance
    if (viewMode === 'article' && article && article.coverImage) {
      let preloadEl = document.querySelector('link[rel="preload"][as="image"]') as HTMLLinkElement | null;
      if (!preloadEl) {
        preloadEl = document.createElement('link');
        preloadEl.rel = 'preload';
        preloadEl.as = 'image';
        document.head.appendChild(preloadEl);
      }
      preloadEl.href = article.coverImage;
      preloadEl.setAttribute('fetchpriority', 'high');
    }
  }, [article, categoryName, viewMode]);

  return null;
};
