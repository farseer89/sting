export const HREF_LABELS: Record<string, string> = {
  ctaHref: 'CTA link',
  primaryCtaHref: 'Primary CTA link',
  secondaryCtaHref: 'Secondary CTA link',
  phoneHref: 'Phone link',
  moreHref: 'More link',
};

export interface BuildHrefField {
  key: string;
  label: string;
  value: string;
}

export function hrefFieldsFromProps(
  props: Record<string, unknown>,
  editableFields: string[],
): BuildHrefField[] {
  const fields: BuildHrefField[] = editableFields
    .filter((key) => key in HREF_LABELS)
    .map((key) => ({
      key,
      label: HREF_LABELS[key] ?? key,
      value: typeof props[key] === 'string' ? String(props[key]) : '',
    }));

  if (editableFields.includes('capabilities')) {
    const capabilities = Array.isArray(props['capabilities']) ? props['capabilities'] : [];
    capabilities.forEach((item, index) => {
      const title =
        item && typeof item === 'object' && typeof (item as Record<string, unknown>)['title'] === 'string'
          ? String((item as Record<string, unknown>)['title'])
          : `Capability ${index + 1}`;
      const href =
        item && typeof item === 'object' && typeof (item as Record<string, unknown>)['href'] === 'string'
          ? String((item as Record<string, unknown>)['href'])
          : '';
      fields.push({
        key: `capabilities.${index}.href`,
        label: `${title} link`,
        value: href,
      });
    });
  }

  return fields;
}

export interface BuildAltField {
  key: string;
  label: string;
  value: string;
}

export function altFieldsFromProps(
  props: Record<string, unknown>,
  editableFields: string[],
): BuildAltField[] {
  const labels: Record<string, string> = {
    backgroundImageAlt: 'Hero background alt text',
    imageAlt: 'Featured image alt text',
  };

  return editableFields
    .filter((key) => key in labels)
    .map((key) => ({
      key,
      label: labels[key] ?? key,
      value: typeof props[key] === 'string' ? String(props[key]) : '',
    }));
}
