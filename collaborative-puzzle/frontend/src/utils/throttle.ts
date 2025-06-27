export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      // Enough time has passed, call immediately
      lastCall = now;
      func(...args);
    } else if (!timeout) {
      // Schedule a call for later
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
        timeout = null;
      }, delay - timeSinceLastCall);
    }
  }) as T;
}