import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  // Astro's default 'jsx' mode can remove a space between words with no error.
  compressHTML: true,
  integrations: [
    starlight({
      title: 'Design system',
      description: 'Design tokens, a chart palette and chart helpers.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/n1kname/design-system' }],
      customCss: ['@n1kname/tokens/tokens.css', '@n1kname/components/type.css', './src/styles/theme.css'],
      sidebar: [
        { label: 'Overview', link: '/' },
        {
          label: 'Foundations',
          items: [
            { label: 'Colour', link: '/foundations/colour/' },
            { label: 'Type and space', link: '/foundations/type-and-space/' },
            { label: 'Motion', link: '/foundations/motion/' },
          ],
        },
        {
          label: 'Charts',
          items: [
            { label: 'Palette', link: '/charts/palette/' },
            { label: 'Examples', link: '/charts/examples/' },
          ],
        },
        {
          label: 'Patterns',
          items: [{ label: 'Loading and empty', link: '/patterns/loading/' }],
        },
        {
          label: 'Layout',
          items: [
            { label: 'Stack, Cluster, Grid, Split', link: '/components/layout/' },
            { label: 'Page header', link: '/components/page-header/' },
            { label: 'Figure', link: '/components/figure/' },
          ],
        },
        {
          label: 'Data',
          items: [
            { label: 'Stat strip', link: '/components/stat-strip/' },
            { label: 'Data table', link: '/components/data-table/' },
            { label: 'Side panel', link: '/components/side-panel/' },
            { label: 'Empty state', link: '/components/empty-state/' },
            { label: 'Caveats', link: '/components/caveats/' },
            { label: 'Legend', link: '/components/legend/' },
            { label: 'Ranked bars', link: '/components/ranked-bars/' },
            { label: 'Donut', link: '/components/donut/' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Buttons', link: '/components/buttons/' },
            { label: 'Tags and links', link: '/components/tags/' },
            { label: 'Icons', link: '/components/icons/' },
            { label: 'Quote', link: '/components/quote/' },
            { label: 'Timeline', link: '/components/timeline/' },
            { label: 'Outcome table', link: '/components/outcome-table/' },
            { label: 'Columns', link: '/components/columns/' },
            { label: 'Skip link', link: '/components/skip-link/' },
          ],
        },
        { label: 'Checks', link: '/checks/' },
      ],
    }),
  ],
});
