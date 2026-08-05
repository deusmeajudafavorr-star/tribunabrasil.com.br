import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NewsHome } from './components/NewsHome';
import { ArticleView } from './components/ArticleView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { UnlockNoticeOverlay } from './components/UnlockNoticeOverlay';
import { Footer } from './components/Footer';
import { storage } from './services/storage';
import {
  seedInitialDataIfEmpty,
  subscribeArticles,
  subscribeCategories,
  subscribeUsers,
} from './services/firebase';
import { Article, Category, User, ViewMode } from './types';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
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

  useEffect(() => {
    // Check URL query parameter or hash for hidden route disguise (e.g. #ferias or #feiras or ?painel=ferias)
    const checkHiddenRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (
        hash === '#ferias' ||
        hash === '#feiras' ||
        params.get('painel') === 'ferias' ||
        params.get('painel') === 'feiras' ||
        params.get('rota') === 'ferias' ||
        params.get('rota') === 'feiras'
      ) {
        setViewMode('admin');
      }
    };

    checkHiddenRoute();
    window.addEventListener('hashchange', checkHiddenRoute);
    return () => window.removeEventListener('hashchange', checkHiddenRoute);
  }, []);

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
    loadData();

    // 2. Check/Seed Firebase RTDB
    seedInitialDataIfEmpty();

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

  // Handlers
  const handleOpenArticle = (article: Article) => {
    setSelectedArticle(article);
    setViewMode('article');
  };

  const handleNavigateHome = () => {
    setViewMode('home');
    setSelectedArticle(null);
  };

  const handleOpenAdmin = () => {
    setViewMode('admin');
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('admin_auth', 'true');
  };

  const handleSelectCategory = (catId: string | null) => {
    setActiveCategoryId(catId);
    if (viewMode === 'article') {
      setViewMode('home');
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

      {/* Footer */}
      {viewMode !== 'admin' && (
        <>
          <Footer
            categories={categories}
            onSelectCategory={handleSelectCategory}
            onOpenAdmin={handleOpenAdmin}
          />
          <UnlockNoticeOverlay />
        </>
      )}
    </div>
  );
}

