import React, { useEffect, useRef } from 'react';

export const HeaderAdBanner: React.FC = () => {
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

    // Clear previous elements to avoid duplication on re-render
    containerRef.current.innerHTML = '';

    const confScript = document.createElement('script');
    confScript.type = 'text/javascript';
    confScript.text = `
      atOptions = {
        'key' : '9b6bfab5b05a7b6f867eab4bdf85399b',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://www.highperformanceformat.com/9b6bfab5b05a7b6f867eab4bdf85399b/invoke.js';

    containerRef.current.appendChild(confScript);
    containerRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="w-full bg-zinc-100 border-b border-zinc-200 py-3 px-4 flex justify-center items-center overflow-hidden min-h-[106px]">
      <div className="flex flex-col items-center max-w-full">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
          Publicidade
        </span>
        <div
          ref={containerRef}
          className="w-full max-w-[728px] min-h-[90px] flex justify-center items-center overflow-x-auto"
        />
      </div>
    </div>
  );
};
