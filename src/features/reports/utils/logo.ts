/**
 * Logo utility — loads the company logo as a base64 data URL for PDF embedding.
 * The logo is loaded from /logo.png (public folder).
 */

let cachedLogoDataUrl: string | null = null;

/**
 * Fetches the logo from the public folder and returns it as a base64 data URL.
 * Caches the result to avoid repeated network calls.
 */
export async function getLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUrl = reader.result as string;
        resolve(cachedLogoDataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Return empty string if logo can't be loaded
    return '';
  }
}
