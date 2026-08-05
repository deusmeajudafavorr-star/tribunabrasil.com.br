import React, { useState, useEffect } from 'react';
import {
  Clock,
  Eye,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Pause,
  Sun,
  Moon,
  MessageSquare,
  ThumbsUp,
  ChevronLeft,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';
import { Article, Comment } from '../types';
import { storage } from '../services/storage';
import { subscribeComments } from '../services/firebase';

interface ArticleViewProps {
  article: Article;
  relatedArticles: Article[];
  onBackHome: () => void;
  onOpenArticle: (article: Article) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  relatedArticles,
  onBackHome,
  onOpenArticle,
}) => {
  // Reading Preferences State
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Audio Speech Synthesizer State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    // Increment view counter on load
    storage.incrementViews(article.id);
    
    // Initial load comments
    setComments(storage.getComments(article.id));

    // Subscribe to Firebase comments in real time
    const unsubscribe = subscribeComments(article.id, (remoteComments) => {
      if (remoteComments && remoteComments.length > 0) {
        setComments(remoteComments);
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Speech synth cleanup
    return () => {
      unsubscribe();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [article.id]);


  // Audio Player Handler
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('O seu navegador não suporta a função de reprodução de áudio.');
      return;
    }

    if (isPlayingAudio && !isPausedAudio) {
      window.speechSynthesis.pause();
      setIsPausedAudio(true);
      return;
    }

    if (isPausedAudio) {
      window.speechSynthesis.resume();
      setIsPausedAudio(false);
      return;
    }

    // Start fresh speech
    window.speechSynthesis.cancel();
    const textToRead = `${article.title}. ${article.subtitle}. ${article.content.replace(/<[^>]*>?/gm, '')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
    setIsPausedAudio(false);
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    storage.incrementShares(article.id);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Share WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`*${article.title}*\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    storage.incrementShares(article.id);
  };

  // Submit Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    const created = storage.addComment(article.id, newAuthorName || 'Leitor Metrópoles', newCommentText);
    setComments([created, ...comments]);
    setNewCommentText('');
    setSubmittingComment(false);
  };

  // Like Comment
  const handleLikeComment = (commentId: string) => {
    storage.likeComment(commentId);
    setComments(
      comments.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  // Theme Styling Map
  const themeClasses = {
    light: 'bg-white text-zinc-900 border-zinc-200',
    sepia: 'bg-[#fbf0d9] text-[#3d2f21] border-[#e8d2b0]',
    dark: 'bg-zinc-950 text-zinc-100 border-zinc-800',
  };

  const fontClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed',
  };

  const formatDateFull = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <article className="min-h-screen bg-zinc-50 pb-16">
      {/* Top Breadcrumb Navigation */}
      <div className="bg-white border-b border-zinc-200 py-3 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs text-zinc-500 font-semibold truncate">
          <button
            onClick={onBackHome}
            className="flex items-center gap-1 text-red-600 hover:underline font-bold shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Início
          </button>
          <span>/</span>
          <span className="text-zinc-700 font-bold uppercase">{article.categoryName}</span>
          <span>/</span>
          <span className="truncate text-zinc-400">{article.title}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        {/* Category Badge & Article Headline */}
        <header className="space-y-4">
          <span className="inline-block bg-red-600 text-white font-black text-xs px-3 py-1 uppercase tracking-wider rounded-xs shadow-xs">
            {article.categoryName}
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-lg sm:text-xl font-medium text-zinc-600 border-l-4 border-red-600 pl-4 leading-relaxed">
            {article.subtitle}
          </p>

          {/* Author Bar */}
          <div className="pt-4 border-y border-zinc-200 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={article.authorAvatar}
                alt={article.authorName}
                className="w-12 h-12 rounded-full object-cover border-2 border-red-600 shadow-xs"
              />
              <div>
                <span className="text-sm font-bold text-zinc-900 block">
                  Por <span className="text-red-600">{article.authorName}</span>
                </span>
                <span className="text-xs text-zinc-500 font-medium block">
                  Publicado em {formatDateFull(article.publishedAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-semibold">
              <span className="flex items-center gap-1 bg-zinc-100 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5 text-zinc-400" /> ~4 min de leitura
              </span>
              <span className="flex items-center gap-1 bg-zinc-100 px-3 py-1.5 rounded-full">
                <Eye className="w-3.5 h-3.5 text-zinc-400" /> {article.views.toLocaleString('pt-BR')} lidas
              </span>
            </div>
          </div>
        </header>

        {/* Reader Utility Toolbar (Audio Player + Typography & Share) */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30">
          {/* Audio Player Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAudio}
              className={`flex items-center gap-2 font-bold text-xs px-4 py-2 rounded-md transition-all shadow-xs cursor-pointer ${
                isPlayingAudio && !isPausedAudio
                  ? 'bg-amber-500 text-zinc-950 animate-pulse'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isPlayingAudio && !isPausedAudio ? (
                <>
                  <Pause className="w-4 h-4 fill-zinc-950" />
                  <span>Pausar Áudio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Ouvir Notícia</span>
                </>
              )}
            </button>

            {isPlayingAudio && (
              <button
                onClick={handleStopAudio}
                className="p-2 text-zinc-500 hover:text-red-600 rounded-md hover:bg-zinc-100"
                title="Parar áudio"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Reader Preferences Controls */}
          <div className="flex items-center gap-4">
            {/* Font Resizer */}
            <div className="flex items-center bg-zinc-100 rounded-md p-1 space-x-1">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 text-xs font-bold rounded-sm ${fontSize === 'sm' ? 'bg-white shadow-xs text-red-600' : 'text-zinc-600'}`}
                title="Fonte pequena"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-2 py-1 text-xs font-bold rounded-sm ${fontSize === 'base' ? 'bg-white shadow-xs text-red-600' : 'text-zinc-600'}`}
                title="Fonte normal"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 text-xs font-bold rounded-sm ${fontSize === 'lg' ? 'bg-white shadow-xs text-red-600' : 'text-zinc-600'}`}
                title="Fonte grande"
              >
                A+
              </button>
            </div>

            {/* Reading Mode Theme */}
            <div className="flex items-center bg-zinc-100 rounded-md p-1 space-x-1">
              <button
                onClick={() => setReadingTheme('light')}
                className={`p-1.5 rounded-sm ${readingTheme === 'light' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'}`}
                title="Modo Claro"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReadingTheme('sepia')}
                className={`px-2 py-0.5 text-xs font-bold rounded-sm ${readingTheme === 'sepia' ? 'bg-[#fbf0d9] text-[#3d2f21] shadow-xs' : 'text-zinc-500'}`}
                title="Modo Sépia"
              >
                Sépia
              </button>
              <button
                onClick={() => setReadingTheme('dark')}
                className={`p-1.5 rounded-sm ${readingTheme === 'dark' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-500'}`}
                title="Modo Escuro"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bookmark & Share */}
            <div className="flex items-center gap-2 border-l border-zinc-200 pl-4">
              <button
                onClick={handleCopyLink}
                className={`p-2 rounded-md transition-colors ${
                  copiedLink ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
                title="Copiar Link da Matéria"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                title="Compartilhar no WhatsApp"
              >
                <Send className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-2 rounded-md transition-colors ${
                  isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
                title="Salvar Matéria"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Cover Photo */}
        <figure className="space-y-2 rounded-lg overflow-hidden border border-zinc-200 bg-black">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-auto max-h-[500px] object-cover"
          />
          {(article.imageCaption || article.imageCredit) && (
            <figcaption className="p-3 bg-zinc-900 text-zinc-400 text-xs flex justify-between gap-4 italic">
              <span>{article.imageCaption}</span>
              {article.imageCredit && <strong className="text-zinc-300 shrink-0">{article.imageCredit}</strong>}
            </figcaption>
          )}
        </figure>

        {/* Main Article Text Body */}
        <div
          className={`p-6 sm:p-10 rounded-xl border shadow-xs transition-colors duration-200 space-y-6 ${themeClasses[readingTheme]}`}
        >
          {article.content.split('\n\n').map((paragraph, index) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3
                  key={index}
                  className="text-xl sm:text-2xl font-black pt-4 pb-1 border-b-2 border-red-600 uppercase tracking-tight text-red-600"
                >
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            if (paragraph.startsWith('> ')) {
              return (
                <blockquote
                  key={index}
                  className="p-4 my-4 bg-red-50 border-l-4 border-red-600 text-zinc-900 italic font-medium rounded-r-md"
                >
                  {paragraph.replace('> ', '')}
                </blockquote>
              );
            }
            if (paragraph.startsWith('1. ') || paragraph.startsWith('- ')) {
              return (
                <div key={index} className="pl-4 border-l-2 border-zinc-300 my-2 space-y-1 font-medium">
                  <p className={fontClasses[fontSize]}>{paragraph}</p>
                </div>
              );
            }
            return (
              <p key={index} className={`${fontClasses[fontSize]} font-normal leading-relaxed`}>
                {paragraph}
              </p>
            );
          })}

          {/* Article Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-6 border-t border-zinc-200/60 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Tópicos Relacionados:
              </span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-zinc-200/70 hover:bg-red-600 hover:text-white transition-colors text-zinc-800 font-bold text-[11px] px-2.5 py-1 rounded-sm uppercase cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reader Comments Section */}
        <section className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-xl font-black text-zinc-900 uppercase flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              <span>Comentários ({comments.length})</span>
            </h3>
            <span className="text-xs text-zinc-500">Espaço aberto para debate respeitoso</span>
          </div>

          {/* New Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-4 bg-zinc-50 p-4 rounded-md border border-zinc-200">
            <h4 className="text-xs font-bold uppercase text-zinc-700">Deixe sua opinião</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Seu Nome completo (opcional)"
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <textarea
              rows={3}
              placeholder="O que você achou dessa notícia? Escreva aqui seu comentário..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar Comentário</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 divide-y divide-zinc-100">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4 text-center">
                Seja o primeiro a comentar esta matéria.
              </p>
            ) : (
              comments.map((comm) => (
                <div key={comm.id} className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs">
                        {comm.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block">{comm.authorName}</span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(comm.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLikeComment(comm.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600 bg-zinc-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comm.likes}</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed pl-10">{comm.content}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* "Leia Também" Related Articles Grid */}
        {relatedArticles.length > 0 && (
          <section className="pt-8 border-t border-zinc-200 space-y-6">
            <h3 className="text-xl font-black uppercase text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-600" />
              <span>Leia Também</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedArticles.slice(0, 3).map((rel) => (
                <article
                  key={rel.id}
                  onClick={() => onOpenArticle(rel)}
                  className="group cursor-pointer bg-white rounded-md border border-zinc-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="aspect-16/10 overflow-hidden bg-zinc-900">
                    <img
                      src={rel.coverImage}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <span className="text-[10px] font-bold text-red-600 uppercase">
                      {rel.categoryName}
                    </span>
                    <h4 className="text-xs font-extrabold text-zinc-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
};
