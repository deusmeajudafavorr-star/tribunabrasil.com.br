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

  // Share handlers
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`*${article.title}*\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    storage.incrementShares(article.id);
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    storage.incrementShares(article.id);
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(article.title);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    storage.incrementShares(article.id);
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(article.title);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    storage.incrementShares(article.id);
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
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

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-3">
              <button
                onClick={handleShareWhatsApp}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                title="Compartilhar no WhatsApp"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.237a9.994 9.994 0 004.779 1.217h.004c5.505 0 9.988-4.478 9.989-9.985A9.962 9.962 0 0012.012 2zm5.83 14.284c-.244.686-1.42 1.309-1.96 1.365-.498.052-1.15.074-3.308-.781-2.759-1.092-4.528-3.873-4.664-4.053-.136-.182-1.112-1.482-1.112-2.827 0-1.346.702-2.008.952-2.28.249-.272.543-.34.724-.34.181 0 .362.002.521.01.168.008.396-.064.62.474.226.543.769 1.88.837 2.016.068.136.113.295.023.475-.09.181-.136.294-.271.452-.136.158-.286.353-.408.475-.136.136-.278.284-.12.556.158.272.702 1.158 1.507 1.874 1.034.921 1.905 1.206 2.176 1.342.271.136.43.113.588-.068.158-.181.678-.792.859-1.063.181-.272.362-.226.61-.136.249.09 1.583.746 1.854.882.271.136.452.203.52.317.068.113.068.656-.176 1.342z"/>
                </svg>
              </button>

              <button
                onClick={handleShareFacebook}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Compartilhar no Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </button>

              <button
                onClick={handleShareTwitter}
                className="p-2 text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                title="Compartilhar no X (Twitter)"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

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

          {/* Prominent Social Media Sharing Section */}
          <div className="pt-6 border-t border-zinc-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-extrabold uppercase text-zinc-800 tracking-wider">
                Compartilhe esta notícia nas redes sociais
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                title="Compartilhar no WhatsApp"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.237a9.994 9.994 0 004.779 1.217h.004c5.505 0 9.988-4.478 9.989-9.985A9.962 9.962 0 0012.012 2zm5.83 14.284c-.244.686-1.42 1.309-1.96 1.365-.498.052-1.15.074-3.308-.781-2.759-1.092-4.528-3.873-4.664-4.053-.136-.182-1.112-1.482-1.112-2.827 0-1.346.702-2.008.952-2.28.249-.272.543-.34.724-.34.181 0 .362.002.521.01.168.008.396-.064.62.474.226.543.769 1.88.837 2.016.068.136.113.295.023.475-.09.181-.136.294-.271.452-.136.158-.286.353-.408.475-.136.136-.278.284-.12.556.158.272.702 1.158 1.507 1.874 1.034.921 1.905 1.206 2.176 1.342.271.136.43.113.588-.068.158-.181.678-.792.859-1.063.181-.272.362-.226.61-.136.249.09 1.583.746 1.854.882.271.136.452.203.52.317.068.113.068.656-.176 1.342z"/>
                </svg>
                <span>WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleShareFacebook}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                title="Compartilhar no Facebook"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
                <span>Facebook</span>
              </button>

              {/* X / Twitter */}
              <button
                onClick={handleShareTwitter}
                className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                title="Compartilhar no X"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X / Twitter</span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleShareTelegram}
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                title="Compartilhar no Telegram"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span>Telegram</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={handleShareLinkedIn}
                className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                title="Compartilhar no LinkedIn"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                <span>LinkedIn</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 ${
                  copiedLink
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                }`}
                title="Copiar link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-zinc-700 shrink-0" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
