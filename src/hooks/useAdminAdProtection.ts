import { useEffect } from 'react';

function isAdUrlOrElement(str: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase();
  return (
    lower.includes('quge5') ||
    lower.includes('nap5k') ||
    lower.includes('al5sm') ||
    lower.includes('effectivecpmnetwork') ||
    lower.includes('highperformanceformat') ||
    lower.includes('pl30724813') ||
    lower.includes('pl30724881') ||
    lower.includes('f92de4113d9a521b82597653b3117039') ||
    lower.includes('9b6bfab5b05a7b6f867eab4bdf85399b') ||
    lower.includes('container-de9dfa')
  );
}

// 1. Block window.open popunders globally during Admin & Login sessions
const originalWindowOpen = window.open;
window.open = function (...args: Parameters<typeof window.open>) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    console.warn('[AdminShield] Blocked window.open popunder during Admin/Login session');
    return null;
  }
  return originalWindowOpen.apply(this, args);
};

// 2. Monkey-patch DOM insertion methods to prevent ad scripts/iframes from attaching during Admin/Login
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function <T extends Node>(node: T): T {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (node instanceof HTMLElement) {
      const src = (node as any).src || '';
      const id = node.id || '';
      const html = node.outerHTML || '';
      if (isAdUrlOrElement(src) || isAdUrlOrElement(id) || isAdUrlOrElement(html)) {
        console.warn('[AdminShield] Blocked appendChild of ad script/element:', src || id);
        return node;
      }
    }
  }
  return originalAppendChild.call(this, node) as T;
};

const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function <T extends Node>(node: T, child: Node | null): T {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (node instanceof HTMLElement) {
      const src = (node as any).src || '';
      const id = node.id || '';
      const html = node.outerHTML || '';
      if (isAdUrlOrElement(src) || isAdUrlOrElement(id) || isAdUrlOrElement(html)) {
        console.warn('[AdminShield] Blocked insertBefore of ad script/element:', src || id);
        return node;
      }
    }
  }
  return originalInsertBefore.call(this, node, child) as T;
};

export function useAdminAdProtection(isAdminActive: boolean) {
  useEffect(() => {
    if (!isAdminActive) {
      document.body.classList.remove('admin-mode-active');
      document.documentElement.classList.remove('admin-mode-active');
      return;
    }

    // Activate Admin Shield classes
    document.body.classList.add('admin-mode-active');
    document.documentElement.classList.add('admin-mode-active');

    // Clear legacy inline click triggers set on document/window/body by ad network scripts
    const clearInlineListeners = () => {
      if (window.onclick) window.onclick = null;
      if (document.onclick) document.onclick = null;
      if (document.body && document.body.onclick) document.body.onclick = null;
      if ((window as any).onmousedown) (window as any).onmousedown = null;
      if ((document as any).onmousedown) (document as any).onmousedown = null;
      if (document.body && (document.body as any).onmousedown) (document.body as any).onmousedown = null;
    };

    clearInlineListeners();

    // Inject high-priority CSS Shield that isolates #root and suppresses non-#root overlays/ad elements
    const styleId = 'admin-ad-shield-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      /* Ensure #root and all admin modals/forms are fully interactive and on top */
      html.admin-mode-active #root {
        position: relative !important;
        z-index: 999999 !important;
        pointer-events: auto !important;
      }

      /* Completely hide all direct children of body except #root, script, style */
      html.admin-mode-active body > :not(#root):not(script):not(style),
      html.admin-mode-active > :not(body):not(head) {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: -999999 !important;
        width: 0 !important;
        height: 0 !important;
        position: absolute !important;
        top: -99999px !important;
        left: -99999px !important;
      }

      /* Hide any floating ad overlay, iframe, social bar */
      html.admin-mode-active [id*="container-"],
      html.admin-mode-active [id*="pl30724813"],
      html.admin-mode-active [id*="pl30724881"],
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

    // Intercept clicks/interactions on non-#root elements (ad overlays) without interfering with #root
    const handleCaptureInteraction = (e: Event) => {
      clearInlineListeners();
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('#root')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn('[AdminShield] Blocked interaction on ad element outside #root');
      }
    };

    window.addEventListener('click', handleCaptureInteraction, true);
    window.addEventListener('mousedown', handleCaptureInteraction, true);
    window.addEventListener('pointerdown', handleCaptureInteraction, true);
    window.addEventListener('touchstart', handleCaptureInteraction, true);

    // Routine purge function for ad elements and scripts outside #root
    const purgeAdNodes = () => {
      if (!document.documentElement.classList.contains('admin-mode-active')) return;

      clearInlineListeners();

      // Remove third-party ad script tags from head/body
      const scripts = document.querySelectorAll('script');
      scripts.forEach((s) => {
        const src = s.src || '';
        const id = s.id || '';
        if (isAdUrlOrElement(src) || isAdUrlOrElement(id)) {
          try {
            s.remove();
          } catch {
            // ignore
          }
        }
      });

      // Purge non-root direct body children created dynamically by ad network scripts
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach((node) => {
        if (node.id !== 'root' && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          try {
            (node as HTMLElement).style.setProperty('display', 'none', 'important');
            (node as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
            node.remove();
          } catch {
            // ignore
          }
        }
      });
    };

    purgeAdNodes();
    const sweepInterval = setInterval(purgeAdNodes, 200);

    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('admin-mode-active')) {
        purgeAdNodes();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      document.body.classList.remove('admin-mode-active');
      document.documentElement.classList.remove('admin-mode-active');
      window.removeEventListener('click', handleCaptureInteraction, true);
      window.removeEventListener('mousedown', handleCaptureInteraction, true);
      window.removeEventListener('pointerdown', handleCaptureInteraction, true);
      window.removeEventListener('touchstart', handleCaptureInteraction, true);
      clearInterval(sweepInterval);
      observer.disconnect();
    };
  }, [isAdminActive]);
}

