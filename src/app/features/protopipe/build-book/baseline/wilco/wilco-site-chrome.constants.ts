/** Static Wilco site chrome — mirrors consult-demo site.config defaults. */
export const WILCO_SITE_CHROME = {
  companyName: 'Wilco Consulting & Logistics',
  phone: '(907) 555-0198',
  phoneHref: 'tel:+19075550198',
  email: 'hello@wilcoconsulting.demo',
  nav: [
    { label: 'Services', href: '#services' },
    { label: 'Clients', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
  ],
  headerCtaLabel: 'Call now',
} as const;
