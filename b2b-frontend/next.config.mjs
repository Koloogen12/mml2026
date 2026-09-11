/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,

	/**
	 * Старые адреса лендинга и журнала.
	 *
	 * Лендинг переехал с /ru/v2 на корень, журнал — с /ru/blog на /blog, старый
	 * лендинг /ru удалён. Эти адреса уже разошлись по письмам, презентациям и
	 * выдаче, поэтому гасим их не 404-й, а постоянным редиректом: он передаёт
	 * новому адресу накопленный вес ссылок, а временный (302) — нет.
	 *
	 * statusCode: 301, а не permanent: true. permanent в Next означает 308;
	 * поисковики трактуют его так же, но 301 понимают вообще все — включая
	 * старые краулеры и прокси, через которые к нам приходят из писем и
	 * презентаций. Терять на этом нечего: тут только GET-страницы.
	 *
	 * /ru/platform под правила не попадает и остаётся на своём месте — это
	 * отдельная страница про платформу, а не часть старого лендинга виджета.
	 */
	async redirects() {
		return [
			{ source: '/ru', destination: '/', statusCode: 301 },
			{ source: '/ru/v2', destination: '/', statusCode: 301 },
			{ source: '/ru/blog', destination: '/blog', statusCode: 301 },
			{ source: '/ru/blog/:slug', destination: '/blog/:slug', statusCode: 301 }
		];
	}
};

export default nextConfig;
