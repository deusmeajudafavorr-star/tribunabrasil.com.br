import React, { useEffect, useRef } from 'react';

export const AdBanner160x300: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous elements
    containerRef.current.innerHTML = '';

    const confScript = document.createElement('script');
    confScript.type = 'text/javascript';
    confScript.text = `
      atOptions = {
        'key' : 'f92de4113d9a521b82597653b3117039',
        'format' : 'iframe',
        'height' : 300,
        'width' : 160,
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://www.highperformanceformat.com/f92de4113d9a521b82597653b3117039/invoke.js';

    containerRef.current.appendChild(confScript);
    containerRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="bg-white rounded-md border border-zinc-200 p-3 shadow-xs flex flex-col items-center">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
        Publicidade
      </span>
      <div
        ref={containerRef}
        className="w-[160px] min-h-[300px] flex justify-center items-center overflow-hidden"
      />
    </div>
  );
};
