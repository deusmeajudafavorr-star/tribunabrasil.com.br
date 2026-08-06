import { useEffect } from 'react';

export function useAdminAdProtection(isAdminActive: boolean) {
  useEffect(() => {
    if (!isAdminActive) {
      document.body.classList.remove('admin-mode-active');
      return;
    }

    document.body.classList.add('admin-mode-active');

    // 1. Inject shield CSS
    const styleId = 'admin-ad-shield-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        body.admin-mode-active > :not(#root):not(script):not(style) {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          z-index: -99999 !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
        }

        body.admin-mode-active [id*="container-"],
        body.admin-mode-active [id*="pl30724813"],
        body.admin-mode-active [class*="social-bar"],
        body.admin-mode-active [src*="effectivecpmnetwork"],
        body.admin-mode-active [src*="highperformanceformat"],
        body.admin-mode-active [src*="nap5k"],
        body.admin-mode-active [src*="quge5"],
        body.admin-mode-active [src*="al5sm"] {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // 2. Override window.open to block popunder redirects in admin mode
    const originalWindowOpen = window.open;
    window.open = function (...args: Parameters<typeof window.open>) {
      if (document.body.classList.contains('admin-mode-active')) {
        console.warn('[AdminShield] Blocked popunder window.open in Admin mode');
        return null;
      }
      return originalWindowOpen.apply(this, args);
    };

    // 3. Stop click events from bubbling up to ad script listeners on document/window
    const eventsToIntercept = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];

    const stopBubble = (e: Event) => {
      // Stop event from bubbling up to window/document where third-party ad network listeners reside
      e.stopPropagation();
    };

    const rootEl = document.getElementById('root');
    if (rootEl) {
      eventsToIntercept.forEach((evt) => {
        rootEl.addEventListener(evt, stopBubble, false);
      });
    }

    // 4. Hide/remove any floating ad elements appended to document.body
    const purgeAdElements = () => {
      if (!document.body.classList.contains('admin-mode-active')) return;
      const children = Array.from(document.body.children);
      children.forEach((child) => {
        if (child.id !== 'root' && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
          (child as HTMLElement).style.display = 'none';
          (child as HTMLElement).style.pointerEvents = 'none';
          (child as HTMLElement).style.opacity = '0';
          (child as HTMLElement).style.visibility = 'hidden';
        }
      });
    };

    purgeAdElements();
    const intervalId = setInterval(purgeAdElements, 300);

    // Cleanup when exiting admin mode
    return () => {
      document.body.classList.remove('admin-mode-active');
      window.open = originalWindowOpen;
      clearInterval(intervalId);
      if (rootEl) {
        eventsToIntercept.forEach((evt) => {
          rootEl.removeEventListener(evt, stopBubble, false);
        });
      }
    };
  }, [isAdminActive]);
}
