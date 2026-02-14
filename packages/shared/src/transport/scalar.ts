export type ScalarDocsOptions = {
  specUrl: string;
  title: string;
  scriptUrl?: string;
  headHtml?: string;
  config?: Record<string, unknown>;
  /**
   * When true, add `<meta name="robots" ...>` to discourage indexing.
   *
   * Default: true
   */
  noIndex?: boolean;
};

const DEFAULT_SCALAR_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';

export const renderScalarDocsHtml = (opts: ScalarDocsOptions): string => {
  const scriptUrl = opts.scriptUrl ?? DEFAULT_SCALAR_SCRIPT_URL;
  const headHtml = opts.headHtml ?? '';
  const noIndex = opts.noIndex ?? true;

  // Force using specUrl for the UI, while still allowing additional config keys.
  const config = { ...(opts.config ?? {}), url: opts.specUrl };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.title}</title>
    ${noIndex ? '<meta name="robots" content="noindex, nofollow" />' : ''}
    ${headHtml}
  </head>
  <body>
    <div id="app"></div>
    <script src="${scriptUrl}"></script>
    <script>
      Scalar.createApiReference('#app', ${JSON.stringify(config)});
    </script>
  </body>
</html>
`;
};

