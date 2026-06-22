export type FileKind = 'image' | 'pdf' | 'video' | 'audio' | 'other';

export function getFileKind(url: string | null | undefined): FileKind {
  if (!url) return 'other';
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  const ext = clean.slice(clean.lastIndexOf('.') + 1);
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  return 'other';
}
