import type { CollectionEntry } from 'astro:content';

export type CategoryMeta = {
	summary: string;
	readerHint: string;
};

export type CategorizedPost = CollectionEntry<'blog'> & {
	categoryName: string;
	categoryKey: string;
};

const UNCATEGORIZED_LABEL = '未分类';

const toDisplayName = (value: string) => {
	const normalized = value.replace(/[-_]+/g, ' ').trim();
	if (!normalized) return UNCATEGORIZED_LABEL;
	if (/[\u4e00-\u9fa5]/.test(normalized)) return normalized;

	return normalized.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
};

export const getCategoryKeyFromId = (id: string) => {
	const [firstSegment] = id.split('/');
	return firstSegment || UNCATEGORIZED_LABEL;
};

export const getCategoryNameFromId = (id: string) => {
	const segments = id.split('/');
	if (segments.length <= 1) return UNCATEGORIZED_LABEL;
	return toDisplayName(segments[0]);
};

export const getPostCategory = (post: CollectionEntry<'blog'>): CategorizedPost => ({
	...post,
	categoryKey: getCategoryKeyFromId(post.id),
	categoryName: getCategoryNameFromId(post.id),
});

export const sortCategoryNames = (names: string[]) =>
	[...names].sort((a, b) => {
		if (a === UNCATEGORIZED_LABEL) return 1;
		if (b === UNCATEGORIZED_LABEL) return -1;
		return a.localeCompare(b, 'zh-CN');
	});

export const getCategoryMeta = (name: string, count = 0): CategoryMeta => ({
	summary:
		count > 1
			? `这里收录的是「${name}」方向的学习记录与实践文章。`
			: `这里会慢慢收录「${name}」方向的学习记录与实践文章。`,
	readerHint:
		count > 1
			? '如果你想快速进入这个主题，可以先从最近更新的一篇开始。'
			: '这个分类刚开始建立，后面会继续往里补内容。',
});

export const groupPostsByCategory = (posts: CollectionEntry<'blog'>[]) => {
	const categorizedPosts = posts.map(getPostCategory);
	const groups = categorizedPosts.reduce((map, post) => {
		const current = map.get(post.categoryName) ?? [];
		current.push(post);
		map.set(post.categoryName, current);
		return map;
	}, new Map<string, CategorizedPost[]>());

	return sortCategoryNames(Array.from(groups.keys())).map((name) => {
		const items = groups.get(name) ?? [];
		return {
			name,
			count: items.length,
			posts: items,
			latest: items[0],
			...getCategoryMeta(name, items.length),
		};
	});
};

export const toCategoryId = (category: string) =>
	`category-${category.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')}`;
