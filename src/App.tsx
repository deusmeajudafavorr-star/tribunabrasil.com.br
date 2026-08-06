import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeaderAdBanner } from './components/HeaderAdBanner';
import { NewsHome } from './components/NewsHome';
import { ArticleView } from './components/ArticleView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { Footer } from './components/Footer';
import { FooterAdBanner } from './components/FooterAdBanner';
import { storage } from './services/storage';
import {
  seedInitialDataIfEmpty,
  syncAllLocalArticlesToFirebase,
  subscribeArticles,
  subscribeCategories,
  subscribeUsers,
} from './services/firebase';
import { Article, Category, User, ViewMode } from './types';
import { useAdminAdProtection } from './hooks/useAdminAdProtection';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  // Activate ad shield whenever in admin view mode
  useAdminAdProtection(viewMode === 'admin');
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Data Load & Firebase Subscriptions
  const loadData = () => {
    const loadedArticles = storage.getArticles();
    const loadedCategories = storage.getCategories();
    const loadedUsers = storage.getUsers();

    setArticles(loadedArticles);
    setCategories(loadedCategories);
    setUsers(loadedUsers);
  };

  useEffect(() => {
    // 1. Initial local load
    const loadedArticles = storage.getArticles();
    const loadedCategories = storage.getCategories();
    const loadedUsers = storage.getUsers();

    setArticles(loadedArticles);
    setCategories(loadedCategories);
    setUsers(loadedUsers);

    // 2. Check/Seed and sync all local + initial articles to Firebase RTDB
    seedInitialDataIfEmpty();
    syncAllLocalArticlesToFirebase(loadedArticles);

    // 3. Subscribe to Realtime Firebase Updates
    const unsubscribeArticles = subscribeArticles((remoteArticles) => {
      if (remoteArticles.length > 0) {
        setArticles(remoteArticles);
        storage.updateLocalStorageArticles(remoteArticles);
      }
      setFirebaseConnected(true);
    });

    const unsubscribeCategories = subscribeCategories((remoteCategories) => {
      if (remoteCategories.length > 0) {
        setCategories(remoteCategories);
        storage.updateLocalStorageCategories(remoteCategories);
      }
    });

    const unsubscribeUsers = subscribeUsers((remoteUsers) => {
      if (remoteUsers.length > 0) {
        setUsers(remoteUsers);
        storage.updateLocalStorageUsers(remoteUsers);
      }
    });

    return () => {
      unsubscribeArticles();
      unsubscribeCategories();
      unsubscribeUsers();
    };
  }, []);

  // Route Synchronization from URL Hash / Search Params
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const rawHash = window.location.hash;
      const hash = rawHash.toLowerCase();
      const params = new URLSearchParams(window.location.search);

      // 1. Admin route
      if (
        hash === '#ferias' ||
        hash === '#feiras' ||
        params.get('painel') === 'ferias' ||
        params.get('painel') === 'feiras' ||
        params.get('rota') === 'ferias' ||
        params.get('rota') === 'feiras'
      ) {
        setViewMode('admin');
        return;
      }

      // 2. Article route detection
      let targetSlugOrId = '';

      // Check pathname (e.g. /noticia/slug or /materia/slug)
      const pathname = window.location.pathname;
      if (pathname.startsWith('/noticia/')) {
        targetSlugOrId = pathname.replace(/^\/noticia\//, '');
      } else if (pathname.startsWith('/materia/')) {
        targetSlugOrId = pathname.replace(/^\/materia\//, '');
      } else if (pathname.startsWith('/article/')) {
        targetSlugOrId = pathname.replace(/^\/article\//, '');
      }

      if (!targetSlugOrId) {
        const queryTarget =
          params.get('noticia') ||
          params.get('materia') ||
          params.get('article') ||
          params.get('id') ||
          params.get('slug');

        if (queryTarget) {
          targetSlugOrId = queryTarget.trim();
        } else if (rawHash && rawHash !== '#' && rawHash !== '#home') {
          const cleanHash = rawHash.replace(/^#\/?/, ''); // e.g. "noticia/slug" or "materia/slug" or "slug"
          if (cleanHash.startsWith('noticia/')) {
            targetSlugOrId = cleanHash.replace(/^noticia\//, '');
          } else if (cleanHash.startsWith('materia/')) {
            targetSlugOrId = cleanHash.replace(/^materia\//, '');
          } else if (cleanHash.startsWith('article/')) {
            targetSlugOrId = cleanHash.replace(/^article\//, '');
          } else if (cleanHash !== 'ferias' && cleanHash !== 'feiras') {
            targetSlugOrId = cleanHash;
          }
        }
      }

      if (targetSlugOrId && articles.length > 0) {
        const decodedTarget = decodeURIComponent(targetSlugOrId).toLowerCase().trim();
        const found = articles.find(
          (a) =>
            a.slug?.toLowerCase().trim() === decodedTarget ||
            a.id?.toLowerCase().trim() === decodedTarget ||
            a.slug?.toLowerCase().trim() === decodedTarget.replace(/^noticia-/, '')
        );

        if (found) {
          setSelectedArticle(found);
          setViewMode('article');
          return;
        }
      }

      // Default to home if hash is empty or #home or root path
      if (!rawHash || rawHash === '#' || rawHash === '#home') {
        if (pathname === '/' || pathname === '') {
          setViewMode((prev) => (prev === 'admin' ? 'admin' : 'home'));
          if (viewMode !== 'admin') {
            setSelectedArticle(null);
          }
        }
      }
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
    window.addEventListener('popstate', syncRouteFromUrl);

    return () => {
      window.removeEventListener('hashchange', syncRouteFromUrl);
      window.removeEventListener('popstate', syncRouteFromUrl);
    };
  }, [articles, viewMode]);

  // Dynamic Google Analytics Pageview Tracking (SPA navigation)
  useEffect(() => {
    if (typeof (window as any).gtag === 'function') {
      const pagePath =
        viewMode === 'article' && selectedArticle
          ? `/noticia/${selectedArticle.slug || selectedArticle.id}`
          : viewMode === 'admin'
          ? '/painel'
          : '/';

      const pageTitle =
        viewMode === 'article' && selectedArticle
          ? `${selectedArticle.title} - Tribuna Brasil`
          : 'Tribuna Brasil - Portal de Notícias';

      (window as any).gtag('config', 'G-Y5M37CPB9Z', {
        page_path: pagePath,
        page_title: pageTitle,
      });
    }
  }, [viewMode, selectedArticle]);

  // Handlers
  const handleOpenArticle = (article: Article) => {
    setSelectedArticle(article);
    setViewMode('article');
    const slug = article.slug || article.id;
    const targetPath = `/noticia/${slug}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ articleId: article.id }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    setViewMode('home');
    setSelectedArticle(null);
    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdmin = () => {
    setViewMode('admin');
    window.location.hash = 'ferias';
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('admin_auth', 'true');
  };

  const handleSelectCategory = (catId: string | null) => {
    setActiveCategoryId(catId);
    if (viewMode === 'article') {
      setViewMode('home');
      if (window.location.hash && !window.location.hash.toLowerCase().includes('ferias')) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
      }
    }
  };

  // Breaking articles list
  const breakingArticles = articles.filter((a) => a.status === 'published' && a.isBreaking);

  // Related articles for article view
  const relatedArticles = selectedArticle
    ? articles.filter(
        (a) => a.id !== selectedArticle.id && a.categoryId === selectedArticle.categoryId && a.status === 'published'
      )
    : [];

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col font-sans text-zinc-900 antialiased selection:bg-red-600 selection:text-white">
      {/* Header (Rendered unless in Admin) */}
      {viewMode !== 'admin' && (
        <>
          <Header
            categories={categories}
            activeCategoryId={activeCategoryId}
            onSelectCategory={handleSelectCategory}
            onNavigateHome={handleNavigateHome}
            onOpenAdmin={handleOpenAdmin}
            onOpenArticle={handleOpenArticle}
            breakingArticles={breakingArticles}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <HeaderAdBanner />
        </>
      )}

      {/* Main Content Router */}
      <div className="flex-1">
        {viewMode === 'home' && (
          <NewsHome
            articles={articles}
            categories={categories}
            activeCategoryId={activeCategoryId}
            onOpenArticle={handleOpenArticle}
            onSelectCategory={(id) => handleSelectCategory(id)}
            searchQuery={searchQuery}
          />
        )}

        {viewMode === 'article' && selectedArticle && (
          <ArticleView
            article={selectedArticle}
            relatedArticles={relatedArticles}
            onBackHome={handleNavigateHome}
            onOpenArticle={handleOpenArticle}
          />
        )}

        {viewMode === 'admin' && (
          !isAdminAuthenticated ? (
            <AdminLoginModal
              onSuccess={handleAdminLoginSuccess}
              onCancel={handleNavigateHome}
            />
          ) : (
            <AdminDashboard
              articles={articles}
              categories={categories}
              users={users}
              onRefreshData={loadData}
              onViewLiveSite={handleNavigateHome}
              onOpenArticlePreview={handleOpenArticle}
            />
          )
        )}
      </div>

      {/* Footer & Footer Ad Banner */}
      {viewMode !== 'admin' && (
        <>
          <FooterAdBanner />
          <Footer
            categories={categories}
            onSelectCategory={handleSelectCategory}
            onOpenAdmin={handleOpenAdmin}
          />
        </>
      )}
    </div>
  );
}

