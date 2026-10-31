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
      customCss: ['@ds/tokens/tokens.css', './src/styles/theme.css'],
      sidebar: [
        { label: 'Overview', link: '/' },
        {
          label: 'Foundations',
          items: [
            { label: 'Colour', link: '/foundations/colour/' },
            { label: 'Type and space', link: '/foundations/type-and-space/' },
          ],
        },
        {
          label: 'Charts',
          items: [
            { label: 'Palette', link: '/charts/palette/' },
            { label: 'Examples', link: '/charts/examples/' },
          ],
        },
        { label: 'Components', items: [{ label: 'Donut', link: '/components/donut/' }] },
        { label: 'Checks', link: '/checks/' },
      ],
    }),
  ],
});
