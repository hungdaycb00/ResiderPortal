import { useRef, useCallback, useState } from 'react';

/**
 * Hook quản lý hàng chờ thực thi các hành động API tuần tự (Serial Queue)
 */
export function useLooterQueue() {
  const actionQueueRef = useRef<Promise<any>>(Promise.resolve());
  const activeRequestsCount = useRef(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const runInQueue = useCallback(<T>(fn: () => Promise<T>): Promise<T> => {
    activeRequestsCount.current++;
    setIsSyncing(true);

    const nextPromise = actionQueueRef.current.then(async () => {
      try {
        return await fn();
      } finally {
        activeRequestsCount.current--;
        if (activeRequestsCount.current <= 0) {
          setIsSyncing(false);
        }
      }
    }).catch(err => {
      activeRequestsCount.current--;
      if (activeRequestsCount.current <= 0) {
        setIsSyncing(false);
      }
      console.error('[LooterQueue] Error:', err);
      throw err; // Re-throw to allow handler catch
    });

    actionQueueRef.current = nextPromise;
    return nextPromise as Promise<T>;
  }, []);

  return { runInQueue, isSyncing };
}
