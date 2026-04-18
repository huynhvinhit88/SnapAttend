class ImageService {
  /**
   * Nén và resize ảnh chân dung học sinh về kích thước tối ưu
   * @param file File ảnh gốc từ input hoặc camera
   * @param maxWidth Chiều rộng tối đa (mặc định 300px)
   * @param quality Chất lượng nén 0-1 (mặc định 0.8)
   */
  async compressImage(file: File | string, maxWidth = 300, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Giữ tỷ lệ khung hình
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Không thể tạo context canvas');

        ctx.drawImage(img, 0, 0, width, height);
        
        // Xuất ra format WebP để tối ưu nhất, nén nếu là JPEG
        const dataUrl = canvas.toDataURL('image/webp', quality);
        resolve(dataUrl);
      };

      img.onerror = () => reject('Lỗi load ảnh');
    });
  }
}

export const imageService = new ImageService();
