import type { CollectionEntry } from 'astro:content';

export type CategoryMeta = {
	summary: string;
	readerHint: string;
};

export type CategorizedPost = CollectionEntry<'blog'> & {
	categoryName: string;
	categoryKey: string;
	readingTime: number;
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

export const estimateReadingTime = (content: string) => {
	const cjkCount = (content.match(/[\u4e00-\u9fff]/g) || []).length;
	const latinWordCount = (content.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
	return Math.max(1, Math.round(cjkCount / 300 + latinWordCount / 220));
};

export const getPostCategory = (post: CollectionEntry<'blog'>): CategorizedPost => ({
	...post,
	categoryKey: getCategoryKeyFromId(post.id),
	categoryName: getCategoryNameFromId(post.id),
	readingTime: estimateReadingTime(post.body || ''),
});

export const sortCategoryNames = (names: string[]) =>
	[...names].sort((a, b) => {
		if (a === UNCATEGORIZED_LABEL) return 1;
		if (b === UNCATEGORIZED_LABEL) return -1;
		return a.localeCompare(b, 'zh-CN');
	});

export const getCategoryMeta = (_name: string, count = 0): CategoryMeta => ({
	summary:
		count > 1
			? `这个主题下已经有 ${count} 篇文章，适合按顺序慢慢读。`
			: '这个主题还在持续更新，先从这篇开始就很好。',
	readerHint:
		count > 1
			? '建议先从最近更新的一篇开始，再顺着相关文章往下读。'
			: '先读完这篇，再去看看其他主题也会很有收获。',
});

export const groupPostsByCategory = (posts: Array<CollectionEntry<'blog'> | CategorizedPost>) => {
	const categorizedPosts = posts.map((post) => ('categoryName' in post ? post : getPostCategory(post)));
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