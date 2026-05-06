export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const max = 1080;
        if (width > height && width > max) {
          height *= max / width;
          width = max;
        } else if (height > max) {
          width *= max / height;
          height = max;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', { type: 'image/webp' }) : file);
        }, 'image/webp', 0.8);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const getPostTimestamp = (post: any) => {
  const raw = post?.createdAt || post?.created_at || post?.created || 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const sortNewestFirst = (posts: any[]) =>
  [...posts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
