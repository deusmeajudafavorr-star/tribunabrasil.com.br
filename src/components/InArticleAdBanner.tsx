import React, { useEffect, useRef } from 'react';

export const InArticleAdBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isAdminMode =
      window.__ADMIN_MODE_ACTIVE ||
      document.documentElement.classList.contains('admin-mode-active') ||
      window.location.hash.toLowerCase().includes('ferias') ||
      window.location.hash.toLowerCase().includes('feiras') ||
      window.location.hash.toLowerCase().includes('admin') ||
      window.location.hash.toLowerCase().includes('painel') ||
      window.location.search.toLowerCase().includes('ferias') ||
      window.location.search.toLowerCase().includes('feiras') ||
      window.location.search.toLowerCase().includes('admin') ||
      window.location.search.toLowerCase().includes('painel') ||
      window.location.pathname.toLowerCase().includes('admin') ||
      window.location.pathname.toLowerCase().includes('painel');

    if (isAdminMode) return;

    containerRef.current.innerHTML = '';

    const script1 = document.createElement('script');
    script1.type = 'text/javascript';
    script1.text = `
      atOptions = {
        'key' : '0afc82b1c94fb596842397560bb9511c',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    `;

    const script2 = document.createElement('script');
    script2.type = 'text/javascript';
    script2.src = 'https://www.highperformanceformat.com/0afc82b1c94fb596842397560bb9511c/invoke.js';

    containerRef.current.appendChild(script1);
    containerRef.current.appendChild(script2);
  }, []);

  return (
    <div className="my-6 flex flex-col items-center justify-center overflow-hidden py-2 min-h-[70px] bg-zinc-50/50 rounded-lg border border-zinc-100/80">
      <span className="text-[9px] text-zinc-400 uppercase font-semibold mb-1 tracking-widest">PUBLICIDADE</span>
      <div ref={containerRef} className="flex justify-center items-center max-w-full overflow-x-auto min-h-[60px]" />
    </div>
  );
};
