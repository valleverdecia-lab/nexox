export async function compressImage(file, { maxDim = 1280, quality = 0.78, type = 'image/webp' } = {}) {
  if (!file || !file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  let { width: w, height: h } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  w = Math.round(w * scale); h = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise(res => canvas.toBlob(res, type, quality));
  if (!blob) return file;
  // if compression didn't help much, keep original
  if (blob.size > file.size * 0.95) return file;
  const ext = type === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'photo') + '.' + ext, { type });
}
