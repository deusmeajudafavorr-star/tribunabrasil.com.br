import { useEffect } from 'react';

export function useAdminAdProtection(isAdminActive: boolean) {
  useEffect(() => {
    if (!isAdminActive) {
      document.body.classList.remove('admin-mode-active');
      document.documentElement.classList.remove('admin-mode-active');
      return;
    }

    document.body.classList.add('admin-mode-active');
    document.documentElement.classList.add('admin-mode-active');

    // 1. Inject comprehensive CSS Shield
    const styleId = 'admin-ad-shield-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      /* Hide all direct children of body except #root, script, style */
      html.admin-mode-active body > :not(#root):not(script):not(style),
      html.admin-mode-active > :not(body):not(head) {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: -999999 !important;
        width: 0 !important;
        height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
        top: -99999px !important;
        left: -9999px !important;
        clip: rect(0, 0, 0, 0) !important;
        transform: scale(0) !important;
      }

      /* Hide any floating overlay/dialog/banner/iframe injected anywhere in the DOM */
      html.admin-mode-active [id*="container-"],
      html.admin-mode-active [id*="pl30724813"],
      html.admin-mode-active [class*="social-bar"],
      html.admin-mode-active [src*="effectivecpmnetwork"],
      html.admin-mode-active [src*="highperformanceformat"],
      html.admin-mode-active [src*="nap5k"],
      html.admin-mode-active [src*="quge5"],
      html.admin-mode-active [src*="al5sm"],
      html.admin-mode-active iframe:not(#root iframe) {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: -999999 !important;
      }
    `;

    // 2. Override window.open to prevent popunders during admin session
    const originalWindowOpen = window.open;
    window.open = function (...args: Parameters<typeof window.open>) {
      if (document.documentElement.classList.contains('admin-mode-active')) {
        console.warn('[AdminShield] Popunder blocked during Admin session');
        return null;
      }
      return originalWindowOpen.apply(this, args);
    };

    // 3. Purge function to remove non-root DOM elements created by ad scripts
    const purgeAdNodes = () => {
      if (!document.documentElement.classList.contains('admin-mode-active')) return;

      // Purge direct body children
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach((node) => {
        if (node.id !== 'root' && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          try {
            (node as HTMLElement).style.setProperty('display', 'none', 'important');
            (node as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
            (node as HTMLElement).style.setProperty('opacity', '0', 'important');
            (node as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
            node.remove();
          } catch {
            // ignore if element cannot be removed
          }
        }
      });

      // Purge direct html children that are not head or body
      const htmlChildren = Array.from(document.documentElement.children);
      htmlChildren.forEach((node) => {
        if (node.tagName !== 'HEAD' && node.tagName !== 'BODY') {
          try {
            node.remove();
          } catch {
            // ignore
          }
        }
      });
    };

    // Run purge immediately and set continuous fast interval sweep
    purgeAdNodes();
    const sweepInterval = setInterval(purgeAdNodes, 150);

    // 4. MutationObserver to instantly kill any ad elements injected dynamically
    const observer = new MutationObserver((mutations) => {
      if (!document.documentElement.classList.contains('admin-mode-active')) return;
      let shouldPurge = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node instanceof HTMLElement && node.id !== 'root' && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
              shouldPurge = true;
              break;
            }
          }
        }
      }
      if (shouldPurge) {
        purgeAdNodes();
      }
    });

    observer.observe(document.body, { childList: true });
    observer.observe(document.documentElement, { childList: true });

    // 5. Intercept click/mousedown events on window to prevent third-party popunder triggers
    const interceptAdClicks = (e: Event) => {
      if (!document.documentElement.classList.contains('admin-mode-active')) return;

      const target = e.target as HTMLElement | null;
      // If the click is inside #root (e.g. typing login info, clicking buttons), stop it from reaching window/document ad handlers
      if (target && document.getElementById('root')?.contains(target)) {
        // Stop propagation to window/document capturing listeners that trigger popunders
        e.stopPropagation();
      }
    };

    const eventTypes = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
    eventTypes.forEach((evt) => {
      window.addEventListener(evt, interceptAdClicks, true);
    });

    // Cleanup when leaving admin mode
    return () => {
      document.body.classList.remove('admin-mode-active');
      document.documentElement.classList.remove('admin-mode-active');
      window.open = originalWindowOpen;
      clearInterval(sweepInterval);
      observer.disconnect();
      eventTypes.forEach((evt) => {
        window.removeEventListener(evt, interceptAdClicks, true);
      });
    };
  }, [isAdminActive]);
}
