import React from 'react';
import {
  TrendingUp,
  Clock,
  Eye,
  MessageSquare,
  ChevronRight,
  Zap,
  Bookmark,
  Share2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Article, Category } from '../types';
import { SidebarAdBanner } from './SidebarAdBanner';

interface NewsHomeProps {
  articles: Article[];
  categories: Category[];
  activeCategoryId: string | null;
  onOpenArticle: (article: Article) => void;
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
}

export const NewsHome: React.FC<NewsHomeProps> = ({
  articles,
  categories,
  activeCategoryId,
  onOpenArticle,
  onSelectCategory,
  searchQuery,
}) => {
  // Filter by category if selected
  const filteredArticles = articles.filter((art) => {
    if (art.status !== 'published') return false;
    if (activeCategoryId && art.categoryId !== activeCategoryId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        art.subtitle.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        art.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Highlighted articles logic
  const featuredArticle = filteredArticles.find((a) => a.isFeatured) || filteredArticles[0];
  const secondaryArticles = filteredArticles.filter((a) => a.id !== featuredArticle?.id && (a.isSecondary || a.isFeatured)).slice(0, 2);
  const remainingArticles = filteredArticles.filter(
    (a) => a.id !== featuredArticle?.id && !secondaryArticles.some((s) => s.id === a.id)
  );

  // Top 5 Most Read / Mais Lidas
  const topReadArticles = [...articles]
    .filter((a) => a.status === 'published')
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h';
    } catch {
      return '';
    }
  };

  if (filteredArticles.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex p-4 rounded-full bg-zinc-100 text-zinc-400 mb-4">
          <Sparkles className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-xl font-bold text-zinc-800 mb-2">Nenhuma notícia encontrada</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
          Não encontramos resultados correspondentes ao seu filtro de busca ou categoria.
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-10">
      {/* Search Header Banner if filtering */}
      {searchQuery && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md flex items-center justify-between">
          <p className="text-sm font-medium text-red-900">
            Exibindo resultados para: <strong className="font-bold">"{searchQuery}"</strong> ({filteredArticles.length} matérias encontradas)
          </p>
        </div>
      )}

      {/* Main Grid Layout: Primary News Hero + Top Trending Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center Main Editorial Block */}
        <div className="lg:col-span-8 space-y-8">
          {/* Featured Primary Lead Article (Destaque Principal) */}
          {featuredArticle && (
            <article
              onClick={() => onOpenArticle(featuredArticle)}
              className="group cursor-pointer bg-white rounded-md overflow-hidden border border-zinc-200 shadow-xs hover:shadow-md transition-all duration-200"
            >
              {/* Image Container */}
              <div className="relative aspect-16/9 sm:aspect-21/9 overflow-hidden bg-zinc-900">
                <img
                  src={featuredArticle.coverImage}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95 group-hover:opacity-100"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <span className="bg-red-600 text-white font-black text-xs px-3 py-1 uppercase rounded-xs tracking-wider shadow-md">
                    {featuredArticle.categoryName}
                  </span>
                  {featuredArticle.isBreaking && (
                    <span className="bg-amber-500 text-zinc-950 font-black text-xs px-2.5 py-1 uppercase rounded-xs tracking-wider shadow-md flex items-center gap-1 animate-pulse">
                      <Zap className="w-3 h-3 fill-zinc-950" /> URGENTE
                    </span>
                  )}
                </div>
              </div>

              {/* Text Body */}
              <div className="p-6 sm:p-8 space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 group-hover:text-red-600 transition-colors leading-tight">
                  {featuredArticle.title}
                </h1>
                <p className="text-sm sm:text-base font-medium text-zinc-600 leading-relaxed border-l-3 border-red-600 pl-3">
                  {featuredArticle.subtitle}
                </p>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-zinc-500 border-t border-zinc-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredArticle.authorAvatar}
                      alt={featuredArticle.authorName}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-200"
                    />
                    <span>Por <strong className="text-zinc-800">{featuredArticle.authorName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {formatDate(featuredArticle.publishedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {featuredArticle.views.toLocaleString('pt-BR')} leituras
                    </span>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Secondary Featured News (2-Column Grid) */}
          {secondaryArticles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {secondaryArticles.map((art) => (
                <article
                  key={art.id}
                  onClick={() => onOpenArticle(art)}
                  className="group cursor-pointer bg-white rounded-md border border-zinc-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-16/10 overflow-hidden bg-zinc-900">
                      <img
                        src={art.coverImage}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-3 left-3 bg-zinc-900/90 text-white text-[10px] font-bold px-2.5 py-1 uppercase rounded-xs tracking-wider">
                        {art.categoryName}
                      </span>
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-lg font-extrabold text-zinc-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-3">
                        {art.title}
                      </h3>
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {art.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between text-[11px] font-semibold text-zinc-400 border-t border-zinc-50">
                    <span>{art.authorName}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(art.publishedAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Banner Ad + "Mais Lidas" Ranking + Special Box */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Sidebar Banner Ad */}
          <SidebarAdBanner />

          {/* "Mais Lidas" Card */}
          <div className="bg-white rounded-md border border-zinc-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-red-600">
              <h2 className="text-base font-black uppercase text-zinc-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <span>Mais Lidas</span>
              </h2>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">
                Ranking Hoje
              </span>
            </div>

            <div className="divide-y divide-zinc-100 space-y-3">
              {topReadArticles.map((art, idx) => (
                <div
                  key={art.id}
                  onClick={() => onOpenArticle(art)}
                  className="pt-3 group cursor-pointer flex items-start gap-4 hover:bg-zinc-50 p-2 rounded-md transition-colors"
                >
                  <span className="font-black text-3xl text-red-600/30 group-hover:text-red-600 transition-colors w-8 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-red-600 tracking-wider">
                      {art.categoryName}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2">
                      {art.title}
                    </h4>
                    <span className="text-[10px] text-zinc-400 block pt-0.5">
                      {art.views.toLocaleString('pt-BR')} visualizações
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Newsletter / Opinião Box */}
          <div className="bg-zinc-900 text-white rounded-md p-6 space-y-4 shadow-sm border-l-4 border-red-600">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Boletim Metrópoles</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Receba diariamente as análises exclusivas do Congresso, STF e Mercado Financeiro diretamente no seu e-mail.
            </p>
            <div className="space-y-2 pt-1">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="w-full px-3 py-2 bg-zinc-800 text-xs text-white rounded-sm border border-zinc-700 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => alert('Obrigado por se inscrever na nossa newsletter!')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-sm text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Inscrever-se Grátis
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Category Feed Blocks */}
      {remainingArticles.length > 0 && (
        <section className="pt-8 border-t border-zinc-200 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-900">
            <h2 className="text-xl font-black uppercase text-zinc-900 tracking-tight flex items-center gap-2">
              <span>Últimas Publicações</span>
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              Acompanhe a cobertura ao vivo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingArticles.map((art) => (
              <article
                key={art.id}
                onClick={() => onOpenArticle(art)}
                className="group cursor-pointer bg-white rounded-md border border-zinc-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-16/10 overflow-hidden bg-zinc-900">
                    <img
                      src={art.coverImage}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 uppercase rounded-xs shadow-xs">
                      {art.categoryName}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-extrabold text-zinc-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                      {art.excerpt || art.subtitle}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between text-[11px] font-semibold text-zinc-400 border-t border-zinc-50">
                  <span className="truncate max-w-[140px]">{art.authorName}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDate(art.publishedAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
