import * as ImagePicker from 'expo-image-picker';

/**
 * Picks a photo and returns it as a self-contained data: URI (compressed JPEG, base64).
 * A file:// path only exists on the phone that picked it; a data URI can be saved in the database
 * and shown on every device — so the admin can review a business's documents from another phone
 * or the website, and tourists everywhere see the business's cover photo.
 */

/** ~1.4 MB of base64 ≈ 1 MB image. Keeps each database row small enough to load quickly. */
export const MAX_DATA_URI_LENGTH = 1_400_000;

export interface PickedImage { uri: string; mimeType: string }

export async function pickImageAsDataUri(opts: { aspect?: [number, number]; allowsEditing?: boolean; quality?: number } = {}):
  Promise<PickedImage | 'too_large' | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: opts.allowsEditing ?? false,
    aspect: opts.aspect,
    quality: opts.quality ?? 0.4,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';
  // On the web the picker may already return a data: URI; on phones we build it from base64.
  const uri = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
  if (uri.startsWith('data:') && uri.length > MAX_DATA_URI_LENGTH) return 'too_large';
  return { uri, mimeType };
}
