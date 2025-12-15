/**
 * Smooth theme transition utility
 * Adds a brief fade overlay to make theme transitions easier on the eyes
 */

let transitionOverlay: HTMLDivElement | null = null;

/**
 * Apply smooth theme transition with fade overlay
 */
export function applySmoothThemeTransition(
  applyTheme: () => void,
  duration: number = 300
): void {
  // Create overlay if it doesn't exist
  if (!transitionOverlay) {
    transitionOverlay = document.createElement('div');
    transitionOverlay.id = 'theme-transition-overlay';
    transitionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      opacity: 0;
      transition: opacity ${duration}ms ease-in-out;
      background: var(--transition-bg, rgba(0, 0, 0, 0.1));
    `;
    document.body.appendChild(transitionOverlay);
  }

  // Get current theme to determine overlay color
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const overlayColor = isCurrentlyDark 
    ? 'rgba(255, 255, 255, 0.15)' // Light overlay for dark->light
    : 'rgba(0, 0, 0, 0.2)'; // Dark overlay for light->dark

  transitionOverlay.style.background = overlayColor;

  // Fade in overlay
  requestAnimationFrame(() => {
    if (transitionOverlay) {
      transitionOverlay.style.opacity = '1';
    }
  });

  // Apply theme change after a brief delay
  setTimeout(() => {
    applyTheme();
    
    // Fade out overlay
    if (transitionOverlay) {
      transitionOverlay.style.opacity = '0';
      
      // Remove overlay after transition completes
      setTimeout(() => {
        if (transitionOverlay && transitionOverlay.parentNode) {
          transitionOverlay.parentNode.removeChild(transitionOverlay);
          transitionOverlay = null;
        }
      }, duration);
    }
  }, duration / 2); // Apply theme change halfway through fade
}

