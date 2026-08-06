import { useEffect } from 'react';

// --- TOP-LEVEL SHIELD MONKEY-PATCHES ---
// Runs as soon as the JS bundle is loaded, intercepting ad scripts before they attach event listeners.

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

const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

const isGlobalTarget = (target: any): boolean => {
  return target === window || target === document || target === document.body || target === document.documentElement;
};

EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions
) {
  if (!listener) {
    return originalAddEventListener.call(this, type, listener, options);
  }

  // Intercept click/mouse/touch listeners registered on global targets (window, document, body)
  if (isGlobalTarget(this) && adEventTypes.includes(type)) {
    const wrappedFn = function (this: any, event: Event) {
      // Check if Admin Mode is active
      if (document.documentElement.classList.contains('admin-mode-active')) {
        // Block third-party ad click/mouse listeners from executing during Admin mode
        try {
          event.stopImmediatePropagation();
          event.preventDefault();
        } catch {
          // ignore
        }
        return;
      }

      if (typeof listener === 'function') {
        return listener.call(this, event);
      } else if (typeof listener === 'object' && listener.handleEvent) {
        return listener.handleEvent(event);
      }
    };

    try {
      (listener as any).__adminShieldWrapped = wrappedFn;
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

// Intercept window.open
const originalWindowOpen = window.open;
window.open = function (...args: Parameters<typeof window.open>) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    console.warn('[AdminShield] Blocked window.open popunder in Admin mode');
    return {
      focus: () => {},
      blur: () => {},
      close: () => {},
      closed: false,
      postMessage: () => {},
    } as any;
  }
  return originalWindowOpen.apply(this, args);
};

// Intercept HTMLAnchorElement.prototype.click
const originalAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (!this.closest('#root')) {
      console.warn('[AdminShield] Blocked programmatic anchor click in Admin mode');
      return;
    }
  }
  return originalAnchorClick.call(this);
};

// Intercept HTMLFormElement.prototype.submit
const originalFormSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
  if (document.documentElement.classList.contains('admin-mode-active')) {
    if (!this.closest('#root')) {
      console.warn('[AdminShield] Blocked programmatic form submission in Admin mode');
      return;
    }
  }
  return originalFormSubmit.call(this);
};

// --- REACT HOOK FOR ADMIN AD PROTECTION ---

export function useAdminAdProtection(isAdminActive: boolean) {
  useEffect(() => {
    if (!isAdminActive) {
      document.body.classList.remove('admin-mode-active');
      document.documentElement.classList.remove('admin-mode-active');
      return;
    }

    document.body.classList.add('admin-mode-active');
    document.documentElement.classList.add('admin-mode-active');

    // Clear legacy inline click handlers on window/document/body
    window.onclick = null;
    document.onclick = null;
    if (document.body) document.body.onclick = null;

    // Inject high-priority CSS Shield
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
        position: absolute !important;
        top: -99999px !important;
        left: -99999px !important;
        clip: rect(0, 0, 0, 0) !important;
        transform: scale(0) !important;
      }

      /* Hide any floating overlay, banner, iframe, social bar */
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

    // Routine purge for any non-root DOM elements created by ad scripts
    const purgeAdNodes = () => {
      if (!document.documentElement.classList.contains('admin-mode-active')) return;

      // Clear inline onclicks
      window.onclick = null;
      document.onclick = null;
      if (document.body) document.body.onclick = null;

      // Remove ad script tags
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

      // Purge non-root direct body children
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
    const sweepInterval = setInterval(purgeAdNodes, 100);

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
