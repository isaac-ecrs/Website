/**
 * Scroll Reveal Animation
 *
 * Adds animations to elements when they scroll into view.
 * Also animates elements that are already visible on page load.
 *
 * Usage:
 * Add `data-reveal="direction"` to any element you want to animate.
 * Directions: "bottom", "top", "left", "right", "fade"
 *
 * Example: <div data-reveal="bottom">Content</div>
 */

const observerOptions = {
  threshold: 0.1, // Trigger when 10% of element is visible
  rootMargin: '0px 0px -50px 0px', // Trigger slightly before element enters viewport
};

const animateElement = (element: Element) => {
  const direction = element.getAttribute('data-reveal') || 'bottom';
  const animationClass = `animate-fade-${direction}`;

  // Add the animation class
  element.classList.add(animationClass);

  // Remove data-reveal attribute to prevent re-animation
  element.removeAttribute('data-reveal');
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateElement(entry.target);
      observer.unobserve(entry.target); // Stop observing once animated
    }
  });
}, observerOptions);

// Initialize on DOM ready
const initScrollReveal = () => {
  const elements = document.querySelectorAll('[data-reveal]');

  elements.forEach((element) => {
    observer.observe(element);
  });
};

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollReveal);
} else {
  initScrollReveal();
}

// Re-run on Astro page transitions (if view transitions are enabled)
document.addEventListener('astro:page-load', initScrollReveal);
