import type { Transition } from 'motion/react';

// Presets de mola inspirados no iOS/macOS: movimento natural com leve "bounce",
// em vez de easing linear. Centralizados para manter a sensação consistente.

// Snappy — respostas rápidas e táteis (toque de botão, chips).
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.8,
};

// Smooth — transições amplas (troca de página).
export const springSmooth: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 30,
};

// Sheet — folhas/modais que sobem com um leve bounce, à la iOS.
export const springSheet: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 34,
  mass: 0.9,
};
