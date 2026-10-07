import cafeHeroInterior from './cafe_hero_interior_1791369142075.jpg';
import artisanLatteSpecialty from './artisan_latte_specialty_1791369310013.jpg';
import gourmetBrunchToast from './gourmet_brunch_toast_1791369356153.jpg';
import freshCroissantBakery from './fresh_croissant_bakery_1791369371612.jpg';
import icedMatchaCooler from './iced_matcha_cooler_1791369391891.jpg';

export const localImages = {
  hero: cafeHeroInterior,
  latte: artisanLatteSpecialty,
  brunch: gourmetBrunchToast,
  croissant: freshCroissantBakery,
  matcha: icedMatchaCooler,
};

// Distinct images for the 4 categories
export const categoryImages = [
  artisanLatteSpecialty,
  freshCroissantBakery,
  gourmetBrunchToast,
  icedMatchaCooler,
];

export function getCategoryImage(categoryName?: string | null, index = 0, explicitImageUrl?: string | null): string {
  if (explicitImageUrl && explicitImageUrl.trim() !== '') {
    return explicitImageUrl;
  }

  const name = (categoryName || '').toLowerCase();
  if (name.includes('sandwich') || name.includes('grill') || name.includes('toast') || name.includes('bread')) {
    return gourmetBrunchToast;
  }
  if (name.includes('ice') || name.includes('cream') || name.includes('sundae') || name.includes('dessert') || name.includes('sweet')) {
    return icedMatchaCooler;
  }
  if (name.includes('maggi') || name.includes('maggie')) {
    return artisanLatteSpecialty;
  }
  if (name.includes('noodle') || name.includes('chow') || name.includes('hakka') || name.includes('pasta')) {
    return freshCroissantBakery;
  }

  return categoryImages[Math.abs(index) % categoryImages.length];
}

// Fallback pool for single item details
export const fallbackImages = [
  artisanLatteSpecialty,
  gourmetBrunchToast,
  freshCroissantBakery,
  icedMatchaCooler,
  cafeHeroInterior,
];

export const getFallbackImage = (indexOrId: string | number) => {
  if (typeof indexOrId === 'number') {
    return fallbackImages[Math.abs(indexOrId) % fallbackImages.length];
  }
  let hash = 0;
  for (let i = 0; i < indexOrId.length; i++) {
    hash = (hash << 5) - hash + indexOrId.charCodeAt(i);
    hash |= 0;
  }
  return fallbackImages[Math.abs(hash) % fallbackImages.length];
};
