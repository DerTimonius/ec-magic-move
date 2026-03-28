import { MagicMoveRenderer } from 'shiki-magic-move/renderer';

document.querySelectorAll('[data-magic-move]').forEach(async (el) => {
	try {
		const beforeTokens = JSON.parse(
			decodeURIComponent(el.dataset.magicMoveBefore ?? ''),
		);
		const afterTokens = JSON.parse(
			decodeURIComponent(el.dataset.magicMoveAfter ?? ''),
		);
		const duration = Number(el.dataset.magicMoveDuration);
		const stagger = Number(el.dataset.magicMoveStagger);
		const opts = { duration, stagger };

		const host = el.closest('.expressive-code');
		const btn = host?.querySelector('.ec-magic-move-btn');

		if (!btn) {
			console.error('Magic Move: Button not found');
			return;
		}

		const pre = el;
		pre.replaceChildren();

		const renderer = new MagicMoveRenderer(pre, opts);
		await renderer.render(beforeTokens);

		let showingAfter = false;
		let busy = false;

		btn.addEventListener('click', async () => {
			if (busy) return;
			busy = true;

			try {
				await renderer.render(showingAfter ? beforeTokens : afterTokens);
				showingAfter = !showingAfter;
			} catch (error) {
				console.error('Magic Move: Render error:', error);
			} finally {
				busy = false;
			}
		});
	} catch (error) {
		console.error('Magic Move: Setup error:', error);
	}
});
