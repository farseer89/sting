/** Static Sparky site chrome — mirrors client-sites sparky-content defaults. */
export const SPARKY_SITE_CHROME = {
  companyName: 'Sparky Electric LLC',
  legalName: 'Sparky Jake LLC',
  location: 'Makawao, Maui, Hawaii',
  phone: '(808) 268-4107',
  phoneHref: 'tel:8082684107',
  email: 'sparkyjakellc@gmail.com',
  founded: 2015,
  logoMarkSrc: 'https://cs-futureproof.pages.dev/sparky/logo-mark-transparent.png?v=6',
  nav: [
    { label: 'Services', href: '#services' },
    { label: 'Areas', href: '#areas' },
    { label: 'Field Notes', href: '/lab/content/sparky' },
    { label: 'About', href: '#about' },
  ],
} as const;
