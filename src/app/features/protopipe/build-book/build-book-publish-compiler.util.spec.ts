import { BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES } from '../build-book-baseline-assemblies';
import { compileBuildBookHomepage, stripEditorOnlyProps } from '../build-book-publish-compiler.util';
import { validateBuildBookPublishGate } from '../build-book-publish-gate.util';

describe('build-book publish compiler', () => {
  it('strips editor-only props', () => {
    const props = stripEditorOnlyProps({
      heading: 'Hello',
      baselineRenderer: 'sparky-site',
      labUnit: 'foo',
    });
    expect(props).toEqual({ heading: 'Hello' });
  });

  for (const [templateId, pages] of Object.entries(BUILD_BOOK_BASELINE_PAGE_ASSEMBLIES)) {
    it(`compiles homepage for ${templateId}`, () => {
      const homepage = pages.find((page) => page.kind === 'homepage');
      expect(homepage).toBeTruthy();
      const compiled = compileBuildBookHomepage({
        homepage: homepage!,
        sourceTemplateId: templateId,
        theme: 'ocean',
      });
      expect(compiled.pages[0].sections.length).toBeGreaterThan(0);
      expect(compiled.sourceTemplateId).toBe(templateId);
      const gate = validateBuildBookPublishGate({
        homepage: homepage!,
        site: { clientSitesSlug: 'demo-site', publishStatus: 'draft' },
        dirty: false,
      });
      expect(gate.ok).toBe(true);
    });
  }
});
