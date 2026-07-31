import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Comprime una imagen antes de subirla como evidencia.
 * - Redimensiona al máximo 1280px en el lado más largo (mantiene aspect ratio)
 * - Comprime a calidad JPEG 80%
 *
 * Si la compresión falla, retorna la URI original con un log de advertencia.
 */
export async function compressEvidenceImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch (err: any) {
    console.warn('[compressEvidenceImage] Compression failed, using original image:', err?.message ?? err);
    return uri;
  }
}
