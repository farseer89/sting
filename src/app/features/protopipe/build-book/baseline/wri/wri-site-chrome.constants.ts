/** Static WRI site chrome — mirrors client-sites wri-content defaults for canvas preview. */
export const WRI_SITE_CHROME = {
  companyName: 'Water Resources International, Inc.',
  shortName: 'WRI',
  phone: '(808) 531-8422',
  phoneHref: 'tel:+18085318422',
  founded: 1989,
  logoSrc: 'https://45108834.cs-futureproof.pages.dev/wri/logo/logo-spring-leaf.png',
  logoAlt: 'Water Resources International — water spring with green leaf mark',
  nav: [
    { label: 'Capabilities', href: '#services' },
    { label: 'Projects', href: '#projects' },
    { label: 'Groundwater Notes', href: '/lab/content/wri' },
    { label: 'Coverage', href: '#coverage' },
  ],
  offices: [
    {
      label: 'Honolulu',
      address: '1100 Alakea St., Suite 2900',
      city: 'Honolulu, HI 96813',
      phone: '(808) 531-8422',
    },
    {
      label: 'Big Island',
      address: '61-3295 Maluokalani St. Bay #1',
      city: 'Kawaihae, HI 96743',
      phone: '(808) 882-7207',
    },
  ],
} as const;
