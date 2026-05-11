/**
 * Cache Buster Utility
 * Tự động dọn dẹp localStorage và sessionStorage khi phát hiện phiên bản ứng dụng mới.
 * Điều này giúp tránh các lỗi runtime do dữ liệu cũ không tương thích.
 */

export const checkAppVersion = (currentVersion: string) => {
    try {
        const STORAGE_KEY = 'APP_BUILD_VERSION';
        const storedVersion = localStorage.getItem(STORAGE_KEY);

        if (storedVersion !== currentVersion) {
            console.warn(`[CacheBuster] New version detected: ${currentVersion} (stored: ${storedVersion}). Performing full cleanup...`);

            // Xóa toàn bộ dữ liệu cũ để đảm bảo tính nhất quán
            localStorage.clear();
            sessionStorage.clear();

            // Lưu lại phiên bản mới nhất
            localStorage.setItem(STORAGE_KEY, currentVersion);

            console.log('[CacheBuster] Cleanup complete. App is now running on fresh state.');
            
            // Nếu có sự thay đổi phiên bản, chúng ta nên reload lại trang một lần nữa
            // để đảm bảo các service worker hoặc cache của trình duyệt được cập nhật hoàn toàn.
            // Tuy nhiên, việc reload ngay lập tức có thể gây loop nếu không cẩn thận.
            // Ở đây chúng ta chỉ reload nếu đã có version cũ (không phải lần đầu cài đặt).
            if (storedVersion) {
                window.location.reload();
            }
        }
    } catch (error) {
        console.error('[CacheBuster] Failed to check version:', error);
    }
};
