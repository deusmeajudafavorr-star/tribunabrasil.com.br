import { useEffect } from 'react';

// --- TOP-LEVEL SHIELD INTERCEPTORS ---
// Runs as soon as JS bundle is loaded, wrapping window/document APIs to prevent ad popunders.

const isGlobalTarget = (target: any): boolean => {
  return target === window || target === document || target === document.body || target === document.documentElement;
};

const adEventTypes = [
  'click',
  'mousedown',
  'mouseup',
  'pointerdown',
  'pointerup',
  'touchstart',
  'touchend',
  'contextmenu',
  'dblclick',
];

// Helper to check if the current execution stack comes from known ad network scripts
function isAdScriptStack(): boolean {
  try {
    const stack = new Error().stack || '';
    if (
      stack.includes('quge5') ||
      stack.includes('nap5k') ||
      stack.includes('al5sm') ||
      stack.includes('effectivecpmnetwork') ||
      stack.includes('highperformanceformat') ||
      stack.includes('tag.min.js') ||
      stack.includes('invoke.js') ||
      stack.includes('75e2883c20559e357e70eabbd2ffbd40')
    ) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// 1. Intercept addEventListener on window/document/body
const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions
) {
  if (!listener) {
    return originalAddEventListener.call(this, type, listener, options);
  }

  const isFromAdScript = isAdScriptStack();

  if (isGlobalTarget(this) && adEventTypes.includes(type)) {
    const wrappedFn = function (this: any, event: Event) {
      if (document.documentElement.classList.contains('admin-mode-active')) {
        // During Admin Mode:
        // Do NOT execute ad script listeners registered on global targets.
        // CRITICAL: DO NOT call e.preventDefault() or e.stopPropagation() here so native clicks & inputs inside #root work 100% normally!
        if (isFromAdScript) {
          return;
        }

        // Also if the target is outside #root or originates from a detached ad element, block execution without cancelling native events
        const targetEl = event.target as HTMLElement | null;
        if (targetEl && !targetEl.closest('#root')) {
          return;
        }
      }

      if (typeof listener === 'function') {
        return listener.call(this, event);
      } else if (typeof listener === 'object' && listener.handleEvent) {
        return listener.handleEvent(event);
      }
    };

    try {
      (listener as any).__adminShieldWrapped = wrappedFn;
      (listener as any).__isFromAdScript = isFromAdScript;
    } catch {
      // ignore
    }

    return originalAddEventListener.call(this, type, wrappedFn, options);
  }

  return originalAddEventListener.call(this, type, listener, options);
};

EventTarget.prototype.removeEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions
) {
  if (listener && (listener as any).__adminShieldWrapped) {
    return originalRemoveEventListener.call(this, type, (listener as any).__adminShieldWrapped, options);
  }
  return originalRemoveEventListener.call(this, type, listener, options);
};

// 2. Intercept window.open to block popunder redirects in Admin mode
const originalWindowOpen = window.open;
window.open = function (...args: Parameters<typeof window.open>) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    console.warn('[AdminShield] Blocked window.open popunder during Admin session');
    return {
      focus: () => {},
      blur: () => {},
      close: () => {},
      closed: true,
      postMessage: () => {},
    } as any;
  }
  return originalWindowOpen.apply(this, args);
};

// 3. Intercept HTMLAnchorElement.prototype.click to prevent programmatic popunder link triggers outside #root
const originalAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (!this.closest('#root')) {
      console.warn('[AdminShield] Blocked ad anchor click outside #root');
      return;
    }
  }
  return originalAnchorClick.call(this);
};

// 4. Intercept HTMLFormElement.prototype.submit to prevent programmatic form submission ads outside #root
const originalFormSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (!this.closest('#root')) {
      console.warn('[AdminShield] Blocked ad form submission outside #root');
      return;
    }
  }
  return originalFormSubmit.call(this);
};

// 5. Intercept Node.prototype.appendChild to prevent ad script tag injection while in Admin mode
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function <T extends Node>(node: T): T {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (this === document.body || this === document.documentElement || this === document.head) {
      if (node instanceof HTMLElement) {
        const src = (node as any).src || '';
        const id = node.id || '';
        const className = node.className || '';
        if (
          src.includes('quge5') ||
          src.includes('nap5k') ||
          src.includes('al5sm') ||
          src.includes('effectivecpmnetwork') ||
          src.includes('highperformanceformat') ||
          id.includes('container-') ||
          id.includes('pl30724813') ||
          className.includes('social-bar')
        ) {
          console.warn('[AdminShield] Prevented ad element injection in Admin mode');
          const dummy = document.createElement('div') as any;
          return dummy as T;
        }
      }
    }
  }
  return originalAppendChild.call(this, node) as T;
};

// --- REACT HOOK FOR ADMIN AD PROTECTION ---

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

    // Clear legacy inline click triggers set on document/window/body by ad scripts
    window.onclick = null;
    document.onclick = null;
    if (document.body) document.body.onclick = null;

    // Inject high-priority CSS Shield that isolates #root and suppresses non-#root overlays
    const styleId = 'admin-ad-shield-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      /* Ensure #root is fully interactive, above all non-#root elements */
      html.admin-mode-active #root {
        position: relative !important;
        z-index: 99999 !important;
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

    // Routine purge function for ad elements outside #root
    const purgeAdNodes = () => {
      if (!document.documentElement.classList.contains('admin-mode-active')) return;

      // Clear inline onclick handlers attached by ad scripts
      if (window.onclick) window.onclick = null;
      if (document.onclick) document.onclick = null;
      if (document.body && document.body.onclick) document.body.onclick = null;

      // Remove third-party ad script tags from head/body
      const scripts = document.querySelectorAll('script');
      scripts.forEach((s) => {
        const src = s.src || '';
        if (
          src.includes('quge5') ||
          src.includes('nap5k') ||
          src.includes('al5sm') ||
          src.includes('effectivecpmnetwork') ||
          src.includes('highperformanceformat')
        ) {
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
    const sweepInterval = setInterval(purgeAdNodes, 150);

    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('admin-mode-active')) {
        purgeAdNodes();
      }
    });

    observer.observe(document.body, { childList: true });
    observer.observe(document.documentElement, { childList: true });

    return () => {
      document.body.classList.remove('admin-mode-active');
      document.documentElement.classList.remove('admin-mode-active');
      clearInterval(sweepInterval);
      observer.disconnect();
    };
  }, [isAdminActive]);
}
