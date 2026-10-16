// Generated brand-matched photography, bundled with the site for reliable delivery.
export const STOCK = {
  curbBins: "/images/hero-bin-cleaning.webp",
  pressureWash: "/images/service-bin-cleaning.webp",
  about: "/images/about-curbside-service.webp",
  surfaceWash: "/images/service-power-soft-washing.webp",
  windowCleaning: "/images/service-window-cleaning.webp",
  driveway: "/images/service-driveway-sealing.webp",
  recyclingBins: "/images/hero-bin-cleaning.webp",
} as const;

// Replace only the original seeded stock images. Preserve admin-uploaded/custom images.
const LEGACY_STOCK: Record<string, string> = {
  "1729462467174-0d1cbb2014b7": STOCK.curbBins,
  "1677956787377-a0f32c0974af": STOCK.pressureWash,
  "1718152521364-b9655b8a7926": STOCK.surfaceWash,
  "1763026227930-ec2c91d4e7f2": STOCK.windowCleaning,
  "1781637202423-33ec5b47e52e": STOCK.driveway,
  "1683516435482-f3cea544ee95": STOCK.recyclingBins,
};

export function resolveSiteImage(src: string, legacyAbout = false): string {
  for (const [id, replacement] of Object.entries(LEGACY_STOCK)) {
    const original = "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&q=80&w=1600";
    if (src === original) return legacyAbout && id === "1677956787377-a0f32c0974af" ? STOCK.about : replacement;
  }
  return src;
}
