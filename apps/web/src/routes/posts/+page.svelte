<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props();
	let title = $state('');
	let content = $state('');

	const enhancedSubmit: SubmitFunction = () => {
		return async ({ result, update }) => {
			const isSuccess = result.type === 'success';
			await update({
				reset: isSuccess,
				invalidateAll: isSuccess
			});

			if (isSuccess) {
				title = '';
				content = '';
				await invalidateAll();
			}
		};
	};
</script>

<section class="hero">
	<div>
		<p class="eyebrow">Protected demo</p>
		<h1>Your posts stay scoped to the signed-in user.</h1>
		<p class="lede">
			This is the template's only built-in business example. The gateway resolves the Better Auth
			session, signs internal headers, and the API only returns rows owned by
			<strong>{data.session.user.email ?? data.session.user.id}</strong>. When the optional
			<code>EDGE_GUARD</code> and <code>POST_EVENTS</code> bindings are enabled, the same flow also
			shows rate limiting and async projection without changing the UI route surface.
		</p>
	</div>

	<form class="composer" method="POST" use:enhance={enhancedSubmit}>
		<div class="field">
			<label for="title">Title</label>
			<input id="title" name="title" bind:value={title} placeholder="Weekly launch checklist" />
			{#if form?.fieldErrors?.title}
				<span class="error">{form.fieldErrors.title}</span>
			{/if}
		</div>

		<div class="field">
			<label for="content">Content</label>
			<textarea
				id="content"
				name="content"
				bind:value={content}
				rows="5"
				placeholder="Write something you can verify after signing out and back in."
			></textarea>
			{#if form?.fieldErrors?.content}
				<span class="error">{form.fieldErrors.content}</span>
			{/if}
		</div>

		{#if form?.formError}
			<p class="error">{form.formError}</p>
		{/if}

		<button type="submit">Create Post</button>
	</form>
</section>

<section class="list-header">
	<div>
		<p class="eyebrow">Current user feed</p>
		<h2>{data.posts.length} post{data.posts.length === 1 ? '' : 's'}</h2>
	</div>
</section>

<ul class="post-list posts-list">
	{#if data.posts.length === 0}
		<li class="empty-state">
			<strong>No posts yet.</strong>
			<span>Create one above to verify auth-scoped reads and writes.</span>
		</li>
	{:else}
		{#each data.posts as post}
			<li class="post-card">
				<div class="post-meta">
					<span>Post #{post.id}</span>
					<span>{new Date(post.createdAt).toLocaleString()}</span>
				</div>
				<h3>{post.title}</h3>
				<p>{post.content}</p>
			</li>
		{/each}
	{/if}
</ul>

<section class="list-header">
	<div>
		<p class="eyebrow">Async projection</p>
		<h2>Recent activity</h2>
		<p class="activity-copy">
			This stays empty on the default starter path. It fills in when the optional
			<code>POST_EVENTS</code> Queue and consumer Worker are enabled.
		</p>
	</div>
</section>

<ul class="post-list activity-list">
	{#if data.activity.length === 0}
		<li class="empty-state">
			<strong>No async activity yet.</strong>
			<span>Enable the advanced queue example to project post activity here.</span>
		</li>
	{:else}
		{#each data.activity as item}
			<li class="post-card activity-card">
				<div class="post-meta">
					<span>{item.type}</span>
					<span>{new Date(item.createdAt).toLocaleString()}</span>
				</div>
				<h3>Projected post #{item.postId}</h3>
				<p>Queue consumer recorded this event for {item.userId}.</p>
			</li>
		{/each}
	{/if}
</ul>

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
		gap: 20px;
		align-items: start;
	}

	.hero,
	.list-header,
	.post-card,
	.empty-state,
	.composer {
		border: 1px solid rgba(23, 19, 15, 0.1);
		border-radius: 26px;
		background: rgba(255, 251, 245, 0.86);
		box-shadow: 0 18px 50px rgba(58, 38, 18, 0.09);
	}

	.hero > div,
	.composer,
	.list-header {
		padding: 24px;
	}

	.eyebrow {
		margin: 0 0 10px;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #7b6758;
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3.6rem);
		line-height: 0.96;
		max-width: 10ch;
	}

	.lede {
		margin-top: 16px;
		color: #55493f;
		line-height: 1.7;
	}

	.composer {
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

	input,
	textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid rgba(23, 19, 15, 0.14);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.92);
		padding: 14px 16px;
		font: inherit;
		color: inherit;
	}

	textarea {
		resize: vertical;
	}

	button {
		border: 0;
		border-radius: 999px;
		padding: 14px 18px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		background: #cf4f2d;
		color: #fff7f1;
	}

	.list-header {
		margin-top: 24px;
	}

	.activity-copy {
		margin-top: 8px;
		color: #55493f;
		line-height: 1.6;
	}

	.post-list {
		display: grid;
		gap: 16px;
		list-style: none;
		padding: 0;
		margin: 16px 0 0;
	}

	.post-card,
	.empty-state {
		padding: 22px;
	}

	.post-meta,
	.empty-state span {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		font-size: 0.82rem;
		color: #7b6758;
	}

	.post-card h3 {
		margin-top: 10px;
		font-size: 1.25rem;
	}

	.post-card p {
		margin-top: 12px;
		color: #55493f;
		line-height: 1.7;
	}

	.activity-card h3 {
		max-width: none;
	}

	.error {
		color: #b0351c;
		font-size: 0.88rem;
	}

	@media (max-width: 820px) {
		.hero {
			grid-template-columns: 1fr;
		}
	}
</style>
