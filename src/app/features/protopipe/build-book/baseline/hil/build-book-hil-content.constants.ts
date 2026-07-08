/** Verified Blackstone assets — mirrors client-sites hil-content.ts paths on cs-futureproof.pages.dev */

export const HIL_SITE_ORIGIN = 'https://cs-futureproof.pages.dev';

export const HIL_ASSETS = {
  heroCanopy: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/hero-lawn.jpg`,
  logoHorizontal: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/logos/logo-concept-mountains-horizontal.png`,
  serviceCustomLandscaping: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/services/custom-landscaping.jpg`,
  serviceOutdoorLiving: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/services/outdoor-living.jpg`,
  serviceSodPlanting: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/services/sod-planting.jpg`,
  serviceSeasonalCleanup: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/services/seasonal-cleanup.jpg`,
  galleryWall: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/gallery/facebook-post-2.jpg`,
  galleryBobcat: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/gallery/facebook-post-3.jpg`,
  galleryWallDetail: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/gallery/facebook-post-4.jpg`,
  verifiedProfile: `${HIL_SITE_ORIGIN}/lab/hil/blackstone/facebook-profile.jpg`,
} as const;

export const HIL_DEFAULT_SERVICES = [
  {
    title: 'Custom landscaping',
    body: 'Design and install for Anchorage properties — family-owned crew, free estimates.',
    priceFrom: 'Free estimate',
    image: HIL_ASSETS.serviceCustomLandscaping,
    alt: 'Custom landscaping service',
    href: '#quote',
  },
  {
    title: 'Outdoor living spaces',
    body: 'Patios, hardscape, and gathering areas built around how you use your yard.',
    priceFrom: 'Anchorage area: $1,600–$20,800 per project',
    image: HIL_ASSETS.serviceOutdoorLiving,
    alt: 'Outdoor living spaces',
    href: '#quote',
  },
  {
    title: 'Sod, grading & planting',
    body: 'Finish-out planting, beds, and lawn work as part of a custom landscape plan.',
    priceFrom: 'Anchorage area: $950–$6,200 per project',
    image: HIL_ASSETS.serviceSodPlanting,
    alt: 'Sod and planting',
    href: '#quote',
  },
  {
    title: 'Seasonal cleanup',
    body: 'Spring and fall property work for Alaska seasons — quoted per visit or program.',
    priceFrom: 'Anchorage area: $78–$600 per visit',
    image: HIL_ASSETS.serviceSeasonalCleanup,
    alt: 'Seasonal cleanup',
    href: '#quote',
  },
] as const;

export const HIL_DEFAULT_GALLERY = [
  {
    src: HIL_ASSETS.galleryWall,
    alt: 'Finished natural stone retaining wall with gravel bed',
    label: 'Rock retaining wall',
  },
  {
    src: HIL_ASSETS.galleryBobcat,
    alt: 'Bobcat grading at a rock wall install in progress',
    label: 'Site grading & equipment',
  },
  {
    src: HIL_ASSETS.galleryWallDetail,
    alt: 'Retaining wall, gravel bed, and fence posts along the property line',
    label: 'Wall & gravel finish',
  },
  {
    src: HIL_ASSETS.verifiedProfile,
    alt: 'Southcentral Alaska — from the public Facebook page',
    label: 'Southcentral Alaska',
  },
] as const;

export const HIL_DEFAULT_FAQ = [
  {
    q: 'How much does a patio or hardscape project cost in Anchorage?',
    a: 'Anchorage-area patio and hardscape projects typically run $1,600–$20,800 per project, depending on size, base prep, and materials.',
  },
  {
    q: 'What services does Blackstone Landscaping AK offer?',
    a: 'Public listings describe custom landscaping, outdoor living spaces, and home-improvement landscaping.',
  },
  {
    q: 'How do I get a free estimate?',
    a: 'Contact us for a free estimate at (907) 306-6415, through the quote form on this page, or via Facebook and Instagram.',
  },
] as const;
