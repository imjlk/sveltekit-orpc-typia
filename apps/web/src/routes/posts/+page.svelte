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

<h1>Posts</h1>

<ul>
	{#each data.posts as post}
		<li>
			<h3>{post.title}</h3>
			<p>{post.content}</p>
		</li>
	{/each}
</ul>

<form method="POST" use:enhance={enhancedSubmit}>
	<div>
		<label for="title">Title</label>
		<input id="title" name="title" bind:value={title} />
		{#if form?.fieldErrors?.title}
			<span class="error">{form.fieldErrors.title}</span>
		{/if}
	</div>

	<div>
		<label for="content">Content</label>
		<textarea id="content" name="content" bind:value={content}></textarea>
		{#if form?.fieldErrors?.content}
			<span class="error">{form.fieldErrors.content}</span>
		{/if}
	</div>

	{#if form?.formError}
		<span class="error">{form.formError}</span>
	{/if}

	<button type="submit">Create Post</button>
</form>

<style>
	.error {
		color: red;
	}
</style>
