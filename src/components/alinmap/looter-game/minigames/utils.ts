export const playSound = (soundName: string) => {
  // Sound playback placeholder
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(10);
    if (type === 'medium') navigator.vibrate(20);
    if (type === 'heavy') navigator.vibrate(40);
  }
};
