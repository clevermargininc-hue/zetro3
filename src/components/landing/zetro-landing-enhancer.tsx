"use client";

import { useEffect } from "react";

/**
 * The only client JS on the landing page:
 *  - toggles the navbar's blurred background once the page scrolls
 *  - fades sections up as they enter the viewport (skipped for reduced motion)
 *  - closes the mobile <details> menu after a link is chosen
 */
export function ZetroLandingEnhancer() {
  useEffect(() => {
    let observer: IntersectionObserver | undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("z-in");
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      // Only hide what is below the fold, so nothing visible ever flashes.
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (el.getBoundingClientRect().top > window.innerHeight) {
          el.classList.add("z-pending");
          observer?.observe(el);
        }
      });
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  return null;
}

