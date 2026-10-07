import grillSandwichGif from './grill_sandwich.svg';
import iceCreamGif from './ice_cream.svg';
import maggiGif from './maggi.svg';
import noodlesGif from './noodles.svg';

export const categoryGifs = {
  sandwich: grillSandwichGif,
  iceCream: iceCreamGif,
  maggi: maggiGif,
  noodles: noodlesGif,
};

/**
 * Returns the matching animated gif for Cafe Corner's 4 core categories:
 * 1. Grill Sandwich
 * 2. Ice Cream
 * 3. Maggi
 * 4. Noodles
 */
export function getCategoryGif(categoryName?: string | null, index = 0): string {
  const name = (categoryName || '').toLowerCase();

  if (name.includes('sandwich') || name.includes('grill') || name.includes('toast') || name.includes('bread')) {
    return grillSandwichGif;
  }
  if (name.includes('ice') || name.includes('cream') || name.includes('sundae') || name.includes('dessert')) {
    return iceCreamGif;
  }
  if (name.includes('maggi') || name.includes('maggie')) {
    return maggiGif;
  }
  if (name.includes('noodle') || name.includes('chow') || name.includes('hakka') || name.includes('ramen')) {
    return noodlesGif;
  }

  // Fallback map by index for the 4 categories
  const fallbackList = [grillSandwichGif, iceCreamGif, maggiGif, noodlesGif];
  return fallbackList[Math.abs(index) % fallbackList.length];
}
