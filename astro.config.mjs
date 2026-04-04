// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://misaka789.github.io',
	base: '/my-blog/',
	integrations: [mdx(), sitemap()],
});