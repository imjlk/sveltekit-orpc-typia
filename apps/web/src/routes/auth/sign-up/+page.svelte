<script lang="ts">
	import { getAuthClient } from '$lib/auth/client';

	type PageData = {
		githubEnabled: boolean;
		nextPath: string;
	};

	type ActionForm = {
		formError?: string;
		values?: {
			name?: string;
			email?: string;
		};
	};

	type AuthResult<T = Record<string, unknown>> = {
		data?: T | null;
		error?: {
			message?: string;
		} | null;
	};

	let { data, form } = $props<{ data: PageData; form?: ActionForm }>();

	let errorMessage = $state('');
	let isGitHubSubmitting = $state(false);

	const handleGitHubSignUp = async () => {
		errorMessage = '';
		isGitHubSubmitting = true;

		try {
			const result = (await getAuthClient().signIn.social({
				provider: 'github',
				callbackURL: data.nextPath,
				disableRedirect: true,
				requestSignUp: true
			})) as AuthResult<{ url?: string }>;

			if (result.error) {
				errorMessage = result.error.message ?? 'Unable to continue with GitHub.';
				return;
			}

			if (result.data?.url) {
				window.location.assign(result.data.url);
				return;
			}

			errorMessage = 'GitHub sign-up did not return a redirect URL.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to continue with GitHub.';
		} finally {
			isGitHubSubmitting = false;
		}
	};
</script>

<section class="auth-layout">
	<div class="copy">
		<p class="eyebrow">Starter onboarding</p>
		<h1>Create an account and keep the example deliberately small.</h1>
		<p>
			The starter keeps auth practical: email/password is first-class, GitHub OAuth is optional, and
			the demo resource is scoped to the authenticated user instead of pretending to be a full product.
		</p>
	</div>

	<div class="panel">
		<form class="stack" method="POST">
			<input type="hidden" name="next" value={data.nextPath} />
			<div class="field">
				<label for="name">Name</label>
				<input
					id="name"
					name="name"
					value={form ? form.values?.name ?? '' : undefined}
					autocomplete="name"
					required
				/>
			</div>

			<div class="field">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					name="email"
					value={form ? form.values?.email ?? '' : undefined}
					autocomplete="email"
					required
				/>
			</div>

			<div class="field">
				<label for="password">Password</label>
				<input
					id="password"
					type="password"
					name="password"
					autocomplete="new-password"
					minlength="8"
					required
				/>
			</div>

			{#if form?.formError}
				<p class="error">{form.formError}</p>
			{/if}

			{#if errorMessage}
				<p class="error">{errorMessage}</p>
			{/if}

			<button type="submit" class="primary">Create account</button>
		</form>

		{#if data.githubEnabled}
			<div class="divider">or</div>
			<button
				type="button"
				class="secondary"
				onclick={() => {
					void handleGitHubSignUp();
				}}
				disabled={isGitHubSubmitting}
			>
				{isGitHubSubmitting ? 'Redirecting...' : 'Sign up with GitHub'}
			</button>
		{/if}

		<p class="footnote">
			Already have an account?
			<a href={`/auth/sign-in?next=${encodeURIComponent(data.nextPath)}`}>Sign in</a>
		</p>
	</div>
</section>

<style>
	.auth-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
		gap: 20px;
		align-items: start;
	}

	.copy,
	.panel {
		border: 1px solid rgba(23, 19, 15, 0.1);
		border-radius: 26px;
		background: rgba(255, 251, 245, 0.86);
		box-shadow: 0 20px 60px rgba(58, 38, 18, 0.1);
		padding: 28px;
	}

	.eyebrow {
		margin: 0 0 10px;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #7b6758;
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3.8rem);
		line-height: 0.96;
		max-width: 12ch;
	}

	.copy p:not(.eyebrow) {
		margin-top: 16px;
		line-height: 1.75;
		color: #55493f;
	}

	.stack {
		display: grid;
		gap: 16px;
	}

	.field {
		display: grid;
		gap: 8px;
	}

	label {
		font-size: 0.86rem;
		font-weight: 600;
	}

	input {
		border: 1px solid rgba(23, 19, 15, 0.14);
		border-radius: 16px;
		padding: 14px 16px;
		font: inherit;
		background: rgba(255, 255, 255, 0.92);
	}

	button,
	.footnote a {
		font: inherit;
	}

	.primary,
	.secondary {
		width: 100%;
		border: 0;
		border-radius: 999px;
		padding: 14px 18px;
		cursor: pointer;
		font-weight: 700;
	}

	.primary {
		background: #cf4f2d;
		color: #fff7f1;
	}

	.secondary {
		background: rgba(23, 19, 15, 0.08);
	}

	.divider {
		margin: 16px 0;
		text-align: center;
		color: #7b6758;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.error {
		margin: 0;
		color: #b0351c;
		font-size: 0.9rem;
	}

	.footnote {
		margin-top: 16px;
		color: #55493f;
	}

	.footnote a {
		color: #87311c;
		text-decoration: underline;
	}

	@media (max-width: 820px) {
		.auth-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
