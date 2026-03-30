export interface ImageInfo {
  id: string;
  filename: string;
  title: string;
  caption: string;
  uploaded_by: string;
  upload_date: string;
  source_url: string;
  display_order: number;
}

let cachedImages: ImageInfo[] | null = null;

export async function getImages(): Promise<ImageInfo[]> {
  if (cachedImages) return cachedImages;

  const res = await fetch('/images/images.json');
  const data: ImageInfo[] = await res.json();
  data.sort((a, b) => a.display_order - b.display_order);
  cachedImages = data;
  return data;
}

export function getImageThumbnail(image: ImageInfo): string {
  return `/images/${image.filename}.png`;
}

export function getImageThumbnailById(id: string, images: ImageInfo[]): string {
  const image = images.find(img => img.id === id);
  return image ? getImageThumbnail(image) : '';
}
