<section class="hero">
	<div class="hero-copy">
		<p class="eyebrow">Cloudflare-first GitHub template</p>
		<h1>Start with SvelteKit, oRPC, D1, and Better Auth on Cloudflare.</h1>
		<p class="lede">
			This template keeps the default path small and explicit: SvelteKit on Pages, oRPC plus typia
			for shared contracts, Drizzle on D1, Better Auth under <code>/auth</code>, and one minimal
			auth-scoped CRUD example instead of a fake SaaS shell.
		</p>

		<div class="hero-actions">
			<a class="primary" href="/posts">Open Protected Posts Demo</a>
			<a class="secondary" href="/api/docs">Browse REST Docs</a>
		</div>
	</div>

	<div class="hero-card">
		<div>
			<span>Default runtime</span>
			<strong>Pages + in-process app router</strong>
		</div>
		<div>
			<span>Public surface</span>
			<strong>/auth, /rpc, /api</strong>
		</div>
		<div>
			<span>Built-in example</span>
			<strong>Auth-scoped CRUD only</strong>
		</div>
	</div>
</section>

<section class="grid">
	<article class="panel">
		<p class="kicker">Layering</p>
		<h2>Shared contracts stay upstream of runtime choices.</h2>
		<p>
			The extension path is explicit: <code>shared</code> defines contracts and schemas,
			<code>api</code> implements routers, <code>gateway</code> decides deployment topology, and
			<code>apps</code> wrap the runtime-specific shell.
		</p>
	</article>

	<article class="panel">
		<p class="kicker">Auth</p>
		<h2>Email/password now ships by default.</h2>
		<p>
			Better Auth lives under <code>/auth</code>. GitHub OAuth appears only when
			<code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> are configured.
		</p>
	</article>

	<article class="panel">
		<p class="kicker">Default path</p>
		<h2>Keep the app in-process until an edge capability actually needs more.</h2>
		<p>
			Pages can serve the app and gateway alone. Reach for separate Workers, KV, or Durable Objects
			only when rate limiting, coordination, queue-driven side effects, or stateful edge logic is
			the reason.
		</p>
	</article>
	<article class="panel">
		<p class="kicker">Capability examples</p>
		<h2>Advanced tracks use named capabilities, not domain-split Workers.</h2>
		<p>
			The first optional example is <code>EDGE_GUARD</code> for rate limiting. The second is
			<code>POST_EVENTS</code> for async projection. D1 stays default, while KV, R2, DO, and
			Hyperdrive remain documented extension tracks.
		</p>
	</article>
</section>

<section class="routes">
	<div class="routes-copy">
		<p class="kicker">Reference routes</p>
		<h2>What the template exposes on day one</h2>
	</div>

	<ul>
		<li><code>/auth/*</code> Better Auth endpoints and built-in auth screens.</li>
		<li><code>/rpc/*</code> Standard RPC procedures generated from the shared contracts.</li>
		<li><code>/api/*</code> OpenAPI-style REST handlers generated from the same contracts.</li>
		<li><code>/api/docs</code> Scalar docs backed by checked-in OpenAPI output.</li>
	</ul>
</section>

<style>
	.hero,
	.grid,
	.routes {
		display: grid;
		gap: 20px;
	}

	.hero {
		grid-template-columns: minmax(0, 1.4fr) minmax(290px, 0.8fr);
		align-items: stretch;
	}

	.hero-copy,
	.hero-card,
	.panel,
	.routes {
		border: 1px solid rgba(23, 19, 15, 0.1);
		border-radius: 28px;
		background: rgba(255, 251, 245, 0.82);
		backdrop-filter: blur(18px);
		box-shadow: 0 24px 64px rgba(58, 38, 18, 0.1);
	}

	.hero-copy {
		padding: 42px;
	}

	.hero-card {
		display: grid;
		gap: 18px;
		padding: 28px;
		align-content: center;
		background:
			linear-gradient(180deg, rgba(23, 19, 15, 0.96) 0%, rgba(82, 33, 22, 0.94) 100%);
		color: #fff8f2;
	}

	.hero-card span,
	.kicker,
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 0.72rem;
		color: rgba(103, 91, 79, 0.9);
	}

	.hero-card span {
		color: rgba(255, 239, 226, 0.68);
	}

	h1,
	h2,
	strong {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.6rem, 5vw, 5rem);
		line-height: 0.96;
		max-width: 10ch;
		margin-top: 12px;
	}

	h2 {
		font-size: 1.35rem;
		line-height: 1.1;
	}

	.lede,
	.panel p,
	.routes li {
		color: #4c4339;
		font-size: 1rem;
		line-height: 1.7;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 28px;
	}

	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		padding: 14px 20px;
		font-weight: 600;
	}

	.primary {
		background: #cf4f2d;
		color: #fff7f1;
	}

	.secondary {
		border: 1px solid rgba(23, 19, 15, 0.12);
		background: rgba(255, 255, 255, 0.7);
	}

	.grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin-top: 22px;
	}

	.panel {
		padding: 28px;
	}

	.routes {
		margin-top: 22px;
		padding: 28px;
	}

	.routes ul {
		margin: 0;
		padding-left: 20px;
	}

	.routes code,
	.lede code {
		padding: 2px 6px;
		border-radius: 999px;
		background: rgba(23, 19, 15, 0.08);
		font-size: 0.92em;
	}

	@media (max-width: 860px) {
		.hero,
		.grid {
			grid-template-columns: 1fr;
		}

		.hero-copy,
		.hero-card,
		.panel,
		.routes {
			padding: 24px;
		}
	}
</style>
