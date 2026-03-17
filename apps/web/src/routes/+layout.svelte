<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	type SessionLike = {
		session?: {
			expiresAt?: string;
		};
		user?: {
			id: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
		};
	} | null;

	let { children, data } = $props<{
		children: () => unknown;
		data: {
			session: SessionLike;
		};
	}>();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Cloudflare First Starter</title>
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a class="brand" href="/">
			<span class="brand-mark">CF</span>
			<span>
				<strong>Cloudflare First Starter</strong>
				<small>SvelteKit, oRPC, typia, D1, Better Auth</small>
			</span>
		</a>

		<nav class="nav">
			<a href="/">Home</a>
			<a href="/posts">Posts Demo</a>
			<a href="/api/docs">REST Docs</a>
			<a href="/api/docs/rpc">RPC Docs</a>
		</nav>

		<div class="account">
			{#if data.session?.user?.id}
				<div class="account-copy">
					<strong>{data.session.user.name ?? 'Signed in'}</strong>
					<span>{data.session.user.email ?? data.session.user.id}</span>
				</div>

				<form method="POST" action="/sign-out">
					<button type="submit" class="ghost-button">Sign out</button>
				</form>
			{:else}
				<a class="primary-link" href="/auth/sign-in">
					Sign in
				</a>
			{/if}
		</div>
	</header>

	<main class="content">{@render children()}</main>
</div>

<style>
	:global(body) {
		--page-bg: #f4efe6;
		--panel: rgba(255, 252, 246, 0.82);
		--panel-strong: rgba(255, 250, 242, 0.96);
		--line: rgba(34, 30, 24, 0.12);
		--text: #17130f;
		--muted: #675b4f;
		--accent: #cf4f2d;
		--accent-deep: #87311c;
		--shadow: 0 24px 80px rgba(54, 32, 19, 0.12);
		margin: 0;
		min-height: 100vh;
		font-family:
			'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		color: var(--text);
		background:
			radial-gradient(circle at top left, rgba(207, 79, 45, 0.22), transparent 32%),
			radial-gradient(circle at top right, rgba(18, 77, 117, 0.16), transparent 26%),
			linear-gradient(180deg, #f7f2e9 0%, var(--page-bg) 100%);
	}

	:global(a) {
		color: inherit;
		text-decoration: none;
	}

	.shell {
		min-height: 100vh;
		padding: 24px;
	}

	.topbar {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto;
		gap: 16px;
		align-items: center;
		padding: 18px 22px;
		border: 1px solid var(--line);
		border-radius: 24px;
		background: var(--panel);
		backdrop-filter: blur(18px);
		box-shadow: var(--shadow);
	}

	.brand {
		display: flex;
		gap: 14px;
		align-items: center;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: linear-gradient(135deg, #17130f 0%, #4d2317 100%);
		color: #fff8ee;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.brand strong,
	.account strong {
		display: block;
		font-size: 0.96rem;
	}

	.brand small,
	.account span {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.nav {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 0.95rem;
	}

	.nav a {
		padding: 10px 12px;
		border-radius: 999px;
	}

	.nav a:hover {
		background: rgba(23, 19, 15, 0.06);
	}

	.account {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: flex-end;
	}

	.account-copy {
		text-align: right;
	}

	.primary-link,
	.ghost-button {
		border-radius: 999px;
		padding: 11px 16px;
		font: inherit;
		cursor: pointer;
		transition:
			transform 120ms ease,
			background 120ms ease;
	}

	.primary-link {
		background: var(--accent);
		color: #fff7f1;
	}

	.ghost-button {
		border: 1px solid var(--line);
		background: var(--panel-strong);
	}

	.primary-link:hover,
	.ghost-button:hover {
		transform: translateY(-1px);
	}

	.content {
		width: min(1180px, 100%);
		margin: 24px auto 0;
	}

	@media (max-width: 960px) {
		.topbar {
			grid-template-columns: 1fr;
		}

		.nav,
		.account {
			justify-content: flex-start;
		}

		.account-copy {
			text-align: left;
		}
	}

	@media (max-width: 640px) {
		.shell {
			padding: 16px;
		}

		.topbar {
			padding: 16px;
			border-radius: 20px;
		}
	}
</style>
