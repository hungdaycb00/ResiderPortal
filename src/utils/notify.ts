type NotifyFn = (msg: string, type: 'success' | 'error' | 'info') => void;

let _notify: NotifyFn | null = null;

export function setNotify(fn: NotifyFn) {
    _notify = fn;
}

export function notify(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    if (_notify) {
        _notify(msg, type);
    } else {
        // Fallback khi notify chưa được khởi tạo
        console.warn('[notify] Chưa khởi tạo, fallback alert:', msg);
        alert(msg);
    }
}
