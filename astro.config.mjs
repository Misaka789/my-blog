// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// 站点主域名
	site: 'https://misaka789.github.io',
	// 资源根路径
	base : '/blog',
	//integrations: [mdx(), sitemap()],
});
