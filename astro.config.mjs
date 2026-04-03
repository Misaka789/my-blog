// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// 站点主域名
	site: 'https://misaka789.github.io',
	// 本地优先使用根路径，避免资源加载错位
	base: '/',
	//integrations: [mdx(), sitemap()],
});
