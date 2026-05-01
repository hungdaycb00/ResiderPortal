export const playSound = (soundName: string) => {
  // Mock function, real implementation can be added later
  console.log('Play sound:', soundName);
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(10);
    if (type === 'medium') navigator.vibrate(20);
    if (type === 'heavy') navigator.vibrate(40);
  }
};
