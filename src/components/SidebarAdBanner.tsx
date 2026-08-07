import React, { useEffect, useRef } from 'react';

export const SidebarAdBanner: React.FC = () => {
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

    // Clear previous contents if re-rendered
    containerRef.current.innerHTML = '';

    // Create container element
    const adDiv = document.createElement('div');
    adDiv.id = 'container-de9dfa89e998cf961230931b407cb15b';
    containerRef.current.appendChild(adDiv);

    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl30724881.effectivecpmnetwork.com/de9dfa89e998cf961230931b407cb15b/invoke.js';

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="bg-white rounded-md border border-zinc-200 p-4 shadow-xs flex flex-col items-center">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
        Publicidade
      </span>
      <div ref={containerRef} className="w-full flex justify-center items-center min-h-[250px] overflow-hidden" />
    </div>
  );
};
