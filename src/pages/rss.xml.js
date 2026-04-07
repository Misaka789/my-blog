import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	const baseURL = import.meta.env.BASE_URL;
	const siteURL = new URL(baseURL, context.site);
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: siteURL,
		items: posts.map((post) => ({
			...post.data,
			link: `${baseURL}blog/${post.id}/`,
		})),
	});
}
