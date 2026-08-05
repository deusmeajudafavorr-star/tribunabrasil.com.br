import React, { useState, useEffect } from 'react';
import { Unlock, ExternalLink, LockKeyhole, ShieldCheck } from 'lucide-react';

export const UnlockNoticeOverlay: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('notice_unlocked') === 'true';
  });
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isUnlocked) return;

    const handleScroll = () => {
      if (sessionStorage.getItem('notice_unlocked') === 'true') {
        setIsUnlocked(true);
        setShowOverlay(false);
        return;
      }
      if (window.scrollY > 30 || window.pageYOffset > 30) {
        setShowOverlay(true);
      }
    };

    const handleFocus = () => {
      if (sessionStorage.getItem('notice_unlocked') === 'true') {
        setIsUnlocked(true);
        setShowOverlay(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isUnlocked]);

  const handleUnlockClick = () => {
    sessionStorage.setItem('notice_unlocked', 'true');
    setIsUnlocked(true);
    setShowOverlay(false);
  };

  if (isUnlocked || !showOverlay) return null;

  const redirectUrl = 'https://meli.la/2v8GpLn';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 sm:p-8 text-center text-white shadow-2xl space-y-5 relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Icon & Badge */}
        <div className="flex justify-center pt-2">
          <div className="relative">
            <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/40 flex items-center justify-center shadow-lg shadow-red-950/50">
              <LockKeyhole className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-zinc-950 p-1 rounded-full shadow-md">
              <Unlock className="w-3.5 h-3.5 font-black" />
            </div>
          </div>
        </div>

        {/* Title and Message */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800/50 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            Acesso ao Conteúdo
          </span>
          <h3 className="text-2xl font-black tracking-tight text-white uppercase leading-snug">
            Liberar Notícia
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
            Para continuar lendo a matéria completa e acompanhar a cobertura ao vivo do <strong className="text-white">Tribuna Brasil</strong>, clique no botão abaixo para liberar o acesso.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleUnlockClick}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-base py-4 px-6 rounded-xl uppercase tracking-wider transition-all duration-200 shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 group cursor-pointer active:scale-98 border border-red-500/40"
          >
            <span>Liberar Notícia</span>
            <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        {/* Security / Verification footer text */}
        <p className="text-[10px] text-zinc-500 font-medium">
          Verificação de segurança rápida • Portal Oficial Tribuna Brasil
        </p>
      </div>
    </div>
  );
};
