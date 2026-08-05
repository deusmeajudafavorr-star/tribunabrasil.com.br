import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Save,
  X,
  Zap,
  TrendingUp,
  Image as ImageIcon,
  Wand2,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Globe,
  Bot,
  Activity,
} from 'lucide-react';
import { Article, Category, User } from '../../types';
import { storage } from '../../services/storage';
import { callAIAssistant } from '../../services/aiService';

interface AdminDashboardProps {
  articles: Article[];
  categories: Category[];
  users: User[];
  onRefreshData: () => void;
  onViewLiveSite: () => void;
  onOpenArticlePreview: (article: Article) => void;
}

type TabType = 'overview' | 'articles' | 'categories' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  articles,
  categories,
  users,
  onRefreshData,
  onViewLiveSite,
  onOpenArticlePreview,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search & Filter state for Articles
  const [articleSearch, setArticleSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Article Modal State
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);

  // WSJ NewsAPI Integration State
  const [wsjSyncing, setWsjSyncing] = useState(false);
  const [wsjStatus, setWsjStatus] = useState<{
    requestsToday: number;
    maxAllowed: number;
    remainingRequests: number;
    lastSyncTime: string | null;
  } | null>(null);

  const fetchWsjStatus = async () => {
    try {
      const res = await fetch('/api/news/wsj/status');
      if (res.ok) {
        const data = await res.json();
        setWsjStatus(data);
      }
    } catch (e) {
      console.error('Error fetching WSJ status:', e);
    }
  };

  useEffect(() => {
    fetchWsjStatus();
  }, []);

  const handleSyncWsjNews = async () => {
    setWsjSyncing(true);
    try {
      const res = await fetch('/api/news/wsj/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.rateLimited || res.status === 429) {
          alert('⚠️ ' + (data.message || 'Limite diário de 10 requisições atingido para hoje.'));
        } else {
          alert('Erro ao buscar notícias: ' + (data.error || 'Falha de comunicação com o servidor.'));
        }
        await fetchWsjStatus();
        return;
      }

      // Save articles locally and to Firebase
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        data.articles.forEach((art: Article) => {
          storage.saveArticle(art);
        });
        onRefreshData();
      }

      await fetchWsjStatus();
      alert(
        `✅ Sucesso! ${data.articles?.length || 0} matérias do Wall Street Journal foram importadas e publicadas sob o perfil "Correspondente Wall Street Journal".\n\nRequisições hoje: ${data.requestsToday}/10`
      );
    } catch (err: any) {
      alert('Erro de conexão ao sincronizar WSJ: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setWsjSyncing(false);
    }
  };

  // Quick Preset Stock Images
  const PRESET_IMAGES = [
    { name: 'Palácio do Planalto / Brasília', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Mercado Financeiro / Bolsa', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Tecnologia & 5G', url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Futebol & Estádio', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Saúde & Ciência', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1200' },
    { name: 'Cultura & Festival', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200' },
  ];

  // Article Filter Logic
  const filteredArticles = articles.filter((art) => {
    if (statusFilter !== 'all' && art.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && art.categoryId !== categoryFilter) return false;
    if (articleSearch.trim()) {
      const q = articleSearch.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        art.subtitle.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Overview Metrics
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalShares = articles.reduce((sum, a) => sum + (a.shares || 0), 0);
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;

  // Handlers for Articles
  const handleOpenNewArticle = () => {
    const defaultAuthor = users[0] || { id: 'user-1', name: 'Editor Metrópoles' };
    const defaultCat = categories[0] || { id: 'cat-brasil', name: 'Brasil' };

    setEditingArticle({
      id: 'art-' + Date.now(),
      title: '',
      subtitle: '',
      slug: '',
      categoryId: defaultCat.id,
      categoryName: defaultCat.name,
      authorId: defaultAuthor.id,
      authorName: defaultAuthor.name,
      authorAvatar: defaultAuthor.avatar || '',
      coverImage: PRESET_IMAGES[0].url,
      imageCaption: 'Foto ilustrativa.',
      imageCredit: 'Agência Metrópoles',
      content: '',
      excerpt: '',
      publishedAt: new Date().toISOString(),
      status: 'published',
      isFeatured: false,
      isSecondary: false,
      isBreaking: false,
      views: 0,
      shares: 0,
      tags: ['Brasil', 'Política'],
    });
    setAiSuggestions(null);
    setIsArticleModalOpen(true);
  };

  const handleEditArticle = (art: Article) => {
    setEditingArticle({ ...art });
    setAiSuggestions(null);
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle?.title || !editingArticle?.content) {
      alert('Por favor, preencha o título e o conteúdo da matéria.');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === editingArticle.categoryId);
    const selectedAuthor = users.find((u) => u.id === editingArticle.authorId);

    const slugToSave =
      editingArticle.slug ||
      editingArticle
        .title!.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const completeArticle: Article = {
      id: editingArticle.id || 'art-' + Date.now(),
      title: editingArticle.title!,
      subtitle: editingArticle.subtitle || '',
      slug: slugToSave,
      categoryId: selectedCategory?.id || editingArticle.categoryId || 'cat-brasil',
      categoryName: selectedCategory?.name || editingArticle.categoryName || 'Brasil',
      authorId: selectedAuthor?.id || editingArticle.authorId || 'user-1',
      authorName: selectedAuthor?.name || editingArticle.authorName || 'Autor',
      authorAvatar: selectedAuthor?.avatar || editingArticle.authorAvatar || '',
      coverImage: editingArticle.coverImage || PRESET_IMAGES[0].url,
      imageCaption: editingArticle.imageCaption || '',
      imageCredit: editingArticle.imageCredit || '',
      content: editingArticle.content!,
      excerpt: editingArticle.subtitle || editingArticle.excerpt || '',
      publishedAt: editingArticle.publishedAt || new Date().toISOString(),
      status: editingArticle.status || 'published',
      isFeatured: !!editingArticle.isFeatured,
      isSecondary: !!editingArticle.isSecondary,
      isBreaking: !!editingArticle.isBreaking,
      views: editingArticle.views || 0,
      shares: editingArticle.shares || 0,
      tags: Array.isArray(editingArticle.tags)
        ? editingArticle.tags
        : typeof editingArticle.tags === 'string'
        ? (editingArticle.tags as string).split(',').map((t) => t.trim())
        : [],
    };

    storage.saveArticle(completeArticle);
    setIsArticleModalOpen(false);
    onRefreshData();
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente esta matéria?')) {
      storage.deleteArticle(id);
      onRefreshData();
    }
  };

  const handleToggleFeatured = (art: Article) => {
    const updated = { ...art, isFeatured: !art.isFeatured };
    storage.saveArticle(updated);
    onRefreshData();
  };

  // Handlers for Categories
  const handleOpenNewCategory = () => {
    setEditingCategory({
      id: 'cat-' + Date.now(),
      name: '',
      slug: '',
      color: '#DC2626',
      description: '',
      order: categories.length + 1,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    const slug =
      editingCategory.slug ||
      editingCategory.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-');

    const cat: Category = {
      id: editingCategory.id || 'cat-' + Date.now(),
      name: editingCategory.name,
      slug,
      color: editingCategory.color || '#DC2626',
      description: editingCategory.description || '',
      order: editingCategory.order || 1,
    };

    storage.saveCategory(cat);
    setIsCategoryModalOpen(false);
    onRefreshData();
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta categoria?')) {
      storage.deleteCategory(id);
      onRefreshData();
    }
  };

  // Handlers for Users
  const handleOpenNewUser = () => {
    setEditingUser({
      id: 'user-' + Date.now(),
      name: '',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      role: 'reporter',
      bio: '',
      active: true,
      createdAt: new Date().toISOString(),
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.name || !editingUser?.email) return;

    const userObj: User = {
      id: editingUser.id || 'user-' + Date.now(),
      name: editingUser.name,
      email: editingUser.email,
      avatar: editingUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      role: editingUser.role || 'reporter',
      bio: editingUser.bio || '',
      active: editingUser.active !== undefined ? editingUser.active : true,
      createdAt: editingUser.createdAt || new Date().toISOString(),
    };

    storage.saveUser(userObj);
    setIsUserModalOpen(false);
    onRefreshData();
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário da equipe?')) {
      storage.deleteUser(id);
      onRefreshData();
    }
  };

  // AI Call Handlers
  const handleCallAI = async (action: 'generate_title' | 'summarize' | 'suggest_tags' | 'proofread' | 'generate_draft') => {
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const res = await callAIAssistant({
        action,
        prompt: aiPrompt,
        title: editingArticle?.title,
        content: editingArticle?.content,
        category: categories.find((c) => c.id === editingArticle?.categoryId)?.name,
      });

      setAiSuggestions(res);

      if (action === 'summarize' && res && editingArticle) {
        setEditingArticle({ ...editingArticle, subtitle: res.replace(/^["']|["']$/g, '').trim() });
      } else if (action === 'generate_draft' && res && editingArticle) {
        setEditingArticle({ ...editingArticle, content: res });
      }
    } catch (err: any) {
      alert('Erro ao conectar com assistente de IA Gemini: ' + (err.message || 'Verifique sua chave.'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col font-sans">
      {/* Top Admin Header Bar */}
      <header className="bg-zinc-900 text-white border-b border-zinc-800 sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white font-black text-xl px-2.5 py-0.5 rounded-xs uppercase">
            T
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight uppercase flex items-center gap-2">
              <span>Tribuna Brasil CMS</span>
              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-xs">
                SISTEMA AUTÔNOMO
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400">Gerenciamento completo de conteúdos e equipe</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewLiveSite}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-3.5 py-2 rounded-md transition-all border border-zinc-700 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-red-500" />
            <span>Ver Portal ao Vivo</span>
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_auth');
              window.location.hash = '';
              onViewLiveSite();
            }}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-md transition-all cursor-pointer shadow-xs"
            title="Sair do Painel Admin"
          >
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Sidebar Menu */}
        <aside className="md:col-span-3 space-y-2">
          <div className="bg-white rounded-lg border border-zinc-200 p-2 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'articles'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Publicações</span>
              </div>
              <span className="bg-zinc-200/60 text-zinc-800 px-2 py-0.5 rounded-full text-[10px]">
                {articles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderTree className="w-4 h-4" />
                <span>Categorias</span>
              </div>
              <span className="bg-zinc-200/60 text-zinc-800 px-2 py-0.5 rounded-full text-[10px]">
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Autores & Equipe</span>
              </div>
              <span className="bg-zinc-200/60 text-zinc-800 px-2 py-0.5 rounded-full text-[10px]">
                {users.length}
              </span>
            </button>
          </div>

          {/* AI Helper Banner Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-5 rounded-lg border border-zinc-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-red-500 font-extrabold text-xs uppercase">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Assistente Gemini AI</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Utilize Inteligência Artificial para gerar títulos chamativos, criar resumos automáticos e revisar matérias em segundos.
            </p>
            <button
              onClick={handleOpenNewArticle}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-md text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Criar Notícia com IA</span>
            </button>
          </div>
        </aside>

        {/* Right Tab Content View */}
        <div className="md:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-zinc-400 block">Total Matérias</span>
                    <strong className="text-2xl font-black text-zinc-900">{articles.length}</strong>
                    <span className="text-[10px] text-emerald-600 font-bold block pt-1">
                      {publishedCount} publicadas
                    </span>
                  </div>
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-zinc-400 block">Leituras Totais</span>
                    <strong className="text-2xl font-black text-zinc-900">{totalViews.toLocaleString('pt-BR')}</strong>
                    <span className="text-[10px] text-zinc-500 block pt-1">Visualizações acumuladas</span>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Eye className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-zinc-400 block">Categorias</span>
                    <strong className="text-2xl font-black text-zinc-900">{categories.length}</strong>
                    <span className="text-[10px] text-zinc-500 block pt-1">Seções ativas</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                    <FolderTree className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-zinc-400 block">Jornalistas</span>
                    <strong className="text-2xl font-black text-zinc-900">{users.length}</strong>
                    <span className="text-[10px] text-zinc-500 block pt-1">Autores no portal</span>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* WSJ NewsAPI Integration Control Card */}
              <div className="bg-zinc-950 text-white p-6 rounded-xl border border-zinc-800 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/20 text-red-500 rounded-lg border border-red-500/30 shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold uppercase tracking-tight text-white">
                          Integração Wall Street Journal (NewsAPI)
                        </h3>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                          Limite 10/dia
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Busca automática de notícias do The Wall Street Journal e publicação instantânea no perfil do correspondente internacional.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSyncWsjNews}
                    disabled={wsjSyncing || wsjStatus?.remainingRequests === 0}
                    className={`px-4 py-2.5 rounded-lg font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      wsjSyncing || wsjStatus?.remainingRequests === 0
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${wsjSyncing ? 'animate-spin' : ''}`} />
                    <span>{wsjSyncing ? 'Sincronizando WSJ...' : 'Sincronizar Notícias WSJ'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Profile Card */}
                  <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800 flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=200"
                      alt="WSJ Correspondent"
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">Perfil Autor</span>
                      <strong className="text-xs font-bold text-zinc-200 block truncate">Correspondente WSJ</strong>
                      <span className="text-[10px] text-red-400 font-semibold block truncate">wsj.correspondent@tribunabrasil.com.br</span>
                    </div>
                  </div>

                  {/* Daily Rate Limit Gauge */}
                  <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-zinc-400 text-[10px] uppercase">Requisições Hoje</span>
                      <span className="text-red-400 font-mono">
                        {wsjStatus ? `${wsjStatus.requestsToday} / ${wsjStatus.maxAllowed}` : '0 / 10'}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (wsjStatus?.requestsToday || 0) >= 10
                            ? 'bg-red-500'
                            : (wsjStatus?.requestsToday || 0) > 6
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, ((wsjStatus?.requestsToday || 0) / 10) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      {wsjStatus?.remainingRequests !== undefined
                        ? `${wsjStatus.remainingRequests} chamada(s) restante(s) hoje`
                        : 'Máximo de 10 chamadas por dia'}
                    </span>
                  </div>

                  {/* Last Sync Time */}
                  <div className="bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block">Última Atualização</span>
                      <strong className="text-xs font-bold text-zinc-200 block">
                        {wsjStatus?.lastSyncTime
                          ? new Date(wsjStatus.lastSyncTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : 'Pressione sincronizar'}
                      </strong>
                      <span className="text-[10px] text-emerald-400 block pt-0.5">Ativo em tempo real</span>
                    </div>
                    <Activity className="w-5 h-5 text-zinc-600" />
                  </div>
                </div>
              </div>

              {/* Quick Action Bar & Recent Articles */}
              <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-lg font-black uppercase text-zinc-900">Publicações Recentes</h3>
                    <p className="text-xs text-zinc-500">Últimas notícias cadastradas no portal</p>
                  </div>
                  <button
                    onClick={handleOpenNewArticle}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Nova Matéria
                  </button>
                </div>

                <div className="divide-y divide-zinc-100">
                  {articles.slice(0, 5).map((art) => (
                    <div key={art.id} className="py-3 flex items-center justify-between gap-4 hover:bg-zinc-50 p-2 rounded-md">
                      <div className="flex items-center gap-3">
                        <img
                          src={art.coverImage}
                          alt={art.title}
                          className="w-12 h-12 rounded-md object-cover bg-zinc-200 shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-bold uppercase text-red-600 block">
                            {art.categoryName} {art.isFeatured && '• [DESTAQUE CAPA]'}
                          </span>
                          <h4
                            onClick={() => onOpenArticlePreview(art)}
                            className="text-xs font-bold text-zinc-900 hover:text-red-600 cursor-pointer line-clamp-1"
                          >
                            {art.title}
                          </h4>
                          <span className="text-[10px] text-zinc-400">
                            Por {art.authorName} • {art.views.toLocaleString('pt-BR')} leituras
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditArticle(art)}
                          className="p-1.5 text-zinc-600 hover:text-red-600 hover:bg-zinc-100 rounded-md cursor-pointer"
                          title="Editar Matéria"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARTICLES / PUBLICAÇÕES */}
          {activeTab === 'articles' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-xs space-y-6">
              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase text-zinc-900">Gerenciador de Publicações</h3>
                  <p className="text-xs text-zinc-500">Crie, edite e organize notícias do portal Metrópoles</p>
                </div>
                <button
                  onClick={handleOpenNewArticle}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-md uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Escrever Nova Matéria</span>
                </button>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-3 rounded-md border border-zinc-200">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por título ou autor..."
                    value={articleSearch}
                    onChange={(e) => setArticleSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="published">Publicados</option>
                  <option value="draft">Rascunhos</option>
                </select>
              </div>

              {/* Articles Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-zinc-600 uppercase font-black tracking-wider border-y border-zinc-200">
                    <tr>
                      <th className="py-3 px-3">Capa</th>
                      <th className="py-3 px-3">Título & Categoria</th>
                      <th className="py-3 px-3">Autor</th>
                      <th className="py-3 px-3">Destaque</th>
                      <th className="py-3 px-3">Leituras</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredArticles.map((art) => (
                      <tr key={art.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-3">
                          <img
                            src={art.coverImage}
                            alt=""
                            className="w-12 h-10 object-cover rounded-md bg-zinc-200"
                          />
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <span className="text-[10px] font-bold text-red-600 uppercase block">
                            {art.categoryName}
                          </span>
                          <span
                            onClick={() => onOpenArticlePreview(art)}
                            className="font-bold text-zinc-900 hover:text-red-600 cursor-pointer line-clamp-2"
                          >
                            {art.title}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-700 font-medium">
                          {art.authorName}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleFeatured(art)}
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase cursor-pointer ${
                              art.isFeatured
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                            }`}
                          >
                            {art.isFeatured ? 'Destaque Capa' : 'Normal'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-zinc-600 font-semibold">
                          {art.views.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => onOpenArticlePreview(art)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                            title="Visualizar Matéria"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditArticle(art)}
                            className="p-1.5 text-zinc-700 hover:text-red-600 hover:bg-zinc-100 rounded-md cursor-pointer"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase text-zinc-900">Gerenciar Categorias</h3>
                  <p className="text-xs text-zinc-500">Crie e edite as seções do portal de notícias</p>
                </div>
                <button
                  onClick={handleOpenNewCategory}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-md uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Categoria</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const count = articles.filter((a) => a.categoryId === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="p-4 rounded-lg border border-zinc-200 flex items-center justify-between hover:border-zinc-300 transition-all bg-zinc-50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <h4 className="font-bold text-sm text-zinc-900 uppercase">{cat.name}</h4>
                          <span className="text-[10px] font-bold bg-zinc-200 px-2 py-0.5 rounded-full text-zinc-700">
                            {count} notícias
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-1">{cat.description || 'Sem descrição.'}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory({ ...cat });
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-600 hover:text-red-600 hover:bg-white rounded-md cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: USERS / AUTHORS */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase text-zinc-900">Equipe de Jornalismo</h3>
                  <p className="text-xs text-zinc-500">Cadastre repórteres, editores e colunistas do portal</p>
                </div>
                <button
                  onClick={handleOpenNewUser}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-md uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Membro</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((u) => {
                  const authorArticles = articles.filter((a) => a.authorId === u.id).length;
                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-lg border border-zinc-200 flex items-start gap-4 bg-zinc-50 hover:bg-white transition-all"
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-red-600 shrink-0"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm text-zinc-900">{u.name}</h4>
                          <span className="text-[10px] uppercase font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-xs">
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                        <p className="text-xs text-zinc-600 line-clamp-2 italic">{u.bio || 'Sem biografia.'}</p>
                        <span className="text-[10px] font-bold text-zinc-400 block pt-1">
                          {authorArticles} matérias publicadas
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            setEditingUser({ ...u });
                            setIsUserModalOpen(true);
                          }}
                          className="p-1 text-zinc-600 hover:text-red-600 rounded-md cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT ARTICLE WITH GEMINI AI ASSISTANT */}
      {isArticleModalOpen && editingArticle && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black uppercase text-zinc-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <span>{editingArticle.title ? 'Editar Publicação' : 'Nova Publicação'}</span>
              </h3>
              <button
                onClick={() => setIsArticleModalOpen(false)}
                className="text-zinc-400 hover:text-black p-1 rounded-md"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* AI Assistant Banner Helper inside Modal */}
            <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-zinc-950 text-white p-4 rounded-lg border border-red-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Assistente de IA Gemini para Jornalismo
                </span>
                {aiLoading && <span className="text-xs text-amber-300 font-bold animate-pulse">Gerando resposta com IA...</span>}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCallAI('generate_title')}
                  disabled={aiLoading}
                  className="bg-zinc-800 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-amber-400" /> Sugerir Títulos
                </button>
                <button
                  type="button"
                  onClick={() => handleCallAI('summarize')}
                  disabled={aiLoading}
                  className="bg-zinc-800 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-amber-400" /> Gerar Linha Fina
                </button>
                <button
                  type="button"
                  onClick={() => handleCallAI('proofread')}
                  disabled={aiLoading}
                  className="bg-zinc-800 hover:bg-red-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-amber-400" /> Revisar e Corrigir
                </button>
              </div>

              {/* AI Output Display box */}
              {aiSuggestions && (
                <div className="bg-zinc-900/90 border border-zinc-700 p-3 rounded-md text-xs text-zinc-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  <strong className="text-amber-400 block mb-1">Resultado do Gemini:</strong>
                  {aiSuggestions}
                </div>
              )}
            </div>

            {/* Article Form */}
            <form onSubmit={handleSaveArticle} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Título da Notícia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lula sanciona lei que cria filtro de relevância no STJ"
                  value={editingArticle.title || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Linha Fina (Subtítulo / Resumo) *</label>
                <textarea
                  rows={2}
                  placeholder="Resumo de 1 a 2 frases para a capa da matéria..."
                  value={editingArticle.subtitle || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-zinc-800 uppercase block mb-1">Categoria *</label>
                  <select
                    value={editingArticle.categoryId || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-800 uppercase block mb-1">Autor / Jornalista *</label>
                  <select
                    value={editingArticle.authorId || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, authorId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cover Image URL & Stock Selector */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-800 uppercase block">Imagem de Capa (URL)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingArticle.coverImage || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, coverImage: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Imagens Rápidas:
                  </span>
                  {PRESET_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditingArticle({ ...editingArticle, coverImage: img.url })}
                      className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold px-2 py-0.5 rounded-sm border"
                    >
                      {img.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption & Credit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-zinc-800 uppercase block mb-1">Legenda da Imagem</label>
                  <input
                    type="text"
                    value={editingArticle.imageCaption || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, imageCaption: e.target.value })}
                    placeholder="Ex: Fachada do prédio ministerial em Brasília"
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 uppercase block mb-1">Créditos da Foto</label>
                  <input
                    type="text"
                    value={editingArticle.imageCredit || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, imageCredit: e.target.value })}
                    placeholder="Ex: Fotos/Agência Brasil"
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md"
                  />
                </div>
              </div>

              {/* Content Field */}
              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Conteúdo da Matéria *</label>
                <textarea
                  rows={10}
                  required
                  placeholder="Escreva a matéria em parágrafos. Use '### Título' para sub-cabeçalhos e '> citação' para destaques de aspas..."
                  value={editingArticle.content || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full px-3 py-2 font-mono text-xs bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Article Options Switches */}
              <div className="flex flex-wrap items-center gap-6 bg-zinc-50 p-3 rounded-md border border-zinc-200 font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingArticle.isFeatured}
                    onChange={(e) => setEditingArticle({ ...editingArticle, isFeatured: e.target.checked })}
                    className="accent-red-600 w-4 h-4"
                  />
                  <span>Destaque Principal na Capa</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingArticle.isBreaking}
                    onChange={(e) => setEditingArticle({ ...editingArticle, isBreaking: e.target.checked })}
                    className="accent-red-600 w-4 h-4"
                  />
                  <span>Plantão Urgente</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold uppercase rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Matéria</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATEGORY MODAL */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black uppercase text-zinc-900 border-b pb-2">
              {editingCategory.name ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Economia, Esportes, Cultura"
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Cor Badge (HEX)</label>
                <input
                  type="color"
                  value={editingCategory.color || '#DC2626'}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                  className="w-full h-9 p-1 border rounded-md cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-200 text-zinc-800 font-bold uppercase rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold uppercase rounded-md"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: USER MODAL */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black uppercase text-zinc-900 border-b pb-2">
              {editingUser.name ? 'Editar Membro' : 'Novo Jornalista'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Função / Cargo *</label>
                <select
                  value={editingUser.role || 'reporter'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="admin">Admin / Editor-Chefe</option>
                  <option value="editor">Editor</option>
                  <option value="reporter">Repórter Especial</option>
                  <option value="colunista">Colunista</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-800 uppercase block mb-1">Biografia curta</label>
                <textarea
                  rows={2}
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-200 text-zinc-800 font-bold uppercase rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold uppercase rounded-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
