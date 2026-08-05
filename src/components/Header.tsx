import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sun,
  Calendar,
  X,
  Menu,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Category, Article } from '../types';

interface HeaderProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onNavigateHome: () => void;
  onOpenAdmin: () => void;
  onOpenArticle: (article: Article) => void;
  breakingArticles: Article[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  onNavigateHome,
  onOpenAdmin,
  onOpenArticle,
  breakingArticles,
  searchQuery,
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    setCurrentDateStr(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
  }, []);

  return (
    <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-xs">
      {/* Top Utility Bar */}
      <div className="bg-zinc-900 text-zinc-300 text-xs py-1.5 px-4 sm:px-8 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Date & Weather */}
          <div className="flex items-center gap-4 text-zinc-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              {currentDateStr || 'Terça-feira, 4 de Agosto de 2026'}
            </span>
            <span className="hidden sm:inline-block text-zinc-600">•</span>
            <span className="hidden sm:flex items-center gap-1.5 text-zinc-300">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Brasília <strong className="text-white">28°C</strong> Ensolarado
            </span>
          </div>

          {/* Plantão / Breaking News Ticker */}
          {breakingArticles.length > 0 && (
            <div className="flex items-center gap-2 overflow-hidden max-w-xl w-full text-zinc-200">
              <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-xs tracking-wider uppercase flex items-center gap-1 shrink-0 animate-pulse">
                <Zap className="w-3 h-3 fill-white" /> Plantão
              </span>
              <div className="truncate cursor-pointer hover:text-red-400 transition-colors" onClick={() => onOpenArticle(breakingArticles[0])}>
                <span className="font-semibold">{breakingArticles[0].title}</span>
              </div>
            </div>
          )}

          {/* Live Journalism Tag */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
              Edição Brasília & Nacional
            </span>
          </div>
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-md"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Logo Tribuna Brasil style */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onNavigateHome}>
          <div className="bg-red-600 text-white font-black text-2xl sm:text-3xl tracking-tighter px-3 py-1 rounded-xs shadow-sm group-hover:bg-red-700 transition-colors uppercase">
            T
          </div>
          <div>
            <span className="font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight block uppercase leading-none">
              TRIBUNA BRASIL
            </span>
            <span className="text-[10px] font-bold tracking-widest text-red-600 uppercase block mt-0.5">
              Jornalismo Indagador & Notícias ao Vivo
            </span>
          </div>
        </div>

        {/* Search Bar / Action Trigger */}
        <div className="hidden md:flex items-center gap-3">
          <div className="relative w-64 lg:w-80">
            <input
              type="text"
              placeholder="Buscar notícias, políticos, temas..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-100 text-zinc-800 text-xs font-medium rounded-full border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <nav className="bg-zinc-900 text-white shadow-md border-t border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1 sm:space-x-2 py-1 text-sm font-bold tracking-wide">
            {/* All News button */}
            <button
              onClick={() => {
                onSelectCategory(null);
                onNavigateHome();
              }}
              className={`px-3 py-2.5 rounded-sm transition-colors uppercase text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeCategoryId === null
                  ? 'bg-red-600 text-white font-extrabold'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Início</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                  }}
                  className={`px-3 py-2.5 rounded-sm transition-colors uppercase text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-red-600 text-white font-black'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 py-1 pl-4 shrink-0 text-xs font-semibold text-zinc-400">
            <span className="text-red-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Brasília em Foco
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 text-white p-4 border-b border-zinc-800 animate-in slide-in-from-top duration-200">
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar notícias..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-800 text-white text-xs rounded-md border border-zinc-700"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                onSelectCategory(null);
                onNavigateHome();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm font-bold uppercase rounded-md text-zinc-200 hover:bg-zinc-800"
            >
              Página Inicial
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm font-bold uppercase rounded-md text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            ))}

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => {
                  onOpenAdmin();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-md text-xs uppercase flex items-center justify-center gap-2 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Painel de Administração</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
