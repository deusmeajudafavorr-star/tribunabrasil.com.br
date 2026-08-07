import React, { useEffect } from 'react';

export const PublicAdScripts: React.FC = () => {
  useEffect(() => {
    // Never inject ad scripts if Admin mode is active or hash is ferias/feiras
    const isAdminMode =
      document.documentElement.classList.contains('admin-mode-active') ||
      window.location.hash.toLowerCase().includes('ferias') ||
      window.location.hash.toLowerCase().includes('feiras');

    if (isAdminMode) {
      return;
    }

    const scriptsToInject: Array<{ id: string; setup: () => HTMLScriptElement }> = [
      {
        id: 'ad-script-quge5',
        setup: () => {
          const s = document.createElement('script');
          s.id = 'ad-script-quge5';
          s.src = 'https://quge5.com/88/tag.min.js';
          s.dataset.zone = '267606';
          s.async = true;
          s.setAttribute('data-cfasync', 'false');
          return s;
        },
      },
      {
        id: 'ad-script-nap5k',
        setup: () => {
          const s = document.createElement('script');
          s.id = 'ad-script-nap5k';
          s.dataset.zone = '11519059';
          s.src = 'https://nap5k.com/tag.min.js';
          return s;
        },
      },
      {
        id: 'ad-script-al5sm',
        setup: () => {
          const s = document.createElement('script');
          s.id = 'ad-script-al5sm';
          s.dataset.zone = '11519140';
          s.src = 'https://al5sm.com/tag.min.js';
          return s;
        },
      },
      {
        id: 'ad-script-socialbar',
        setup: () => {
          const s = document.createElement('script');
          s.id = 'ad-script-socialbar';
          s.src = 'https://pl30724813.effectivecpmnetwork.com/75/e2/88/75e2883c20559e357e70eabbd2ffbd40.js';
          return s;
        },
      },
    ];

    const addedScripts: HTMLScriptElement[] = [];

    scriptsToInject.forEach(({ id, setup }) => {
      if (!document.getElementById(id)) {
        const script = setup();
        document.body.appendChild(script);
        addedScripts.push(script);
      }
    });

    return () => {
      // Cleanup: when unmounting (entering admin mode), remove all injected script elements
      addedScripts.forEach((s) => {
        try {
          s.remove();
        } catch {
          // ignore
        }
      });

      // Purge any dynamically appended floating ad containers, social bars, popups, or iframes
      const elementsToPurge = document.querySelectorAll(
        '[id*="container-"], [id*="pl30724813"], [id*="pl30724881"], [class*="social-bar"], iframe:not(#root iframe)'
      );
      elementsToPurge.forEach((el) => {
        try {
          el.remove();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  return null;
};

