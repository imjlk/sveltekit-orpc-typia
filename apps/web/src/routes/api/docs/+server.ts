import type { RequestHandler } from './$types';

const renderScalarHtml = (specUrl: string, title: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="robots" content="noindex, nofollow" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', { url: ${JSON.stringify(specUrl)} });
    </script>
  </body>
</html>
`;

export const GET: RequestHandler = async () => {
	const html = renderScalarHtml('/api/spec.json', 'sveltekit-orpc-typia API');

	return new Response(html, {
		status: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'x-robots-tag': 'noindex'
		}
	});
};

