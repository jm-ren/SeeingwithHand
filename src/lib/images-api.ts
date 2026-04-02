import { supabase } from './supabase';
import { ImageInfo } from './images';

export interface ImageUploadInput {
  file: File;
  title: string;
  caption: string;
  source_url: string;
  uploaded_by: string;
}

export async function fetchImagesFromSupabase(): Promise<ImageInfo[] | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching images from Supabase:', error);
      return null;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching images from Supabase:', error);
    return null;
  }
}

export async function uploadImage(input: ImageUploadInput): Promise<ImageInfo | null> {
  if (!supabase) {
    console.error('Supabase not configured — cannot upload images.');
    return null;
  }

  try {
    const ext = input.file.name.split('.').pop() || 'png';
    const storagePath = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('gallery-images')
      .upload(storagePath, input.file, {
        contentType: input.file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image file:', uploadError);
      return null;
    }

    const { data: maxOrderRow } = await supabase
      .from('images')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderRow?.display_order ?? 0) + 1;

    const filenameBase = input.file.name.replace(/\.[^/.]+$/, '');

    const { data, error } = await supabase
      .from('images')
      .insert({
        filename: filenameBase,
        title: input.title,
        caption: input.caption,
        source_url: input.source_url,
        uploaded_by: input.uploaded_by,
        upload_date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }).replace(/\//g, '-'),
        display_order: nextOrder,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting image row:', error);
      await supabase.storage.from('gallery-images').remove([storagePath]);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

export async function deleteImage(id: string, storagePath: string | null): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase not configured — cannot delete images.');
    return false;
  }

  try {
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting image row:', error);
      return false;
    }

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('gallery-images')
        .remove([storagePath]);

      if (storageError) {
        console.warn('Image row deleted but storage file removal failed:', storageError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

export async function reorderImages(orderedIds: string[]): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase not configured — cannot reorder images.');
    return false;
  }

  try {
    const updates = orderedIds.map((id, index) =>
      supabase!
        .from('images')
        .update({ display_order: index + 1 })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);

    if (failed?.error) {
      console.error('Error reordering images:', failed.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error reordering images:', error);
    return false;
  }
}

export function getSupabaseImageUrl(storagePath: string): string | null {
  if (!supabase) return null;

  const { data } = supabase.storage
    .from('gallery-images')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
