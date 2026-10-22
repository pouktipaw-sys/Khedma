import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Types `text` character by character through `onUpdate`. Resolves when finished. */
export function typeTween(
  text: string,
  onUpdate: (partial: string) => void,
  charsPerSecond = 48,
): gsap.core.Tween {
  const o = { i: 0 };
  return gsap.to(o, {
    i: text.length,
    duration: Math.max(text.length / charsPerSecond, 0.05),
    ease: 'none',
    onUpdate: () => onUpdate(text.slice(0, Math.round(o.i))),
    onComplete: () => onUpdate(text),
  });
}

/** Fires a pulse through the network background (and anything else listening). */
export function pulse(strength = 0.5, x?: number, y?: number): void {
  window.dispatchEvent(new CustomEvent('noa:pulse', { detail: { strength, x, y } }));
}
