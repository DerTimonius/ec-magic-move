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
		const autoanimate = el.dataset.autoanimate === 'true';
		const opts = { duration, stagger };

		const host = el.closest('.expressive-code');
		const btn = host?.querySelector('.ec-magic-move-btn');

		if (!btn) {
			console.error('Magic Move: Button not found');
			return;
		}

		const reducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;

		const pre = el;
		pre.replaceChildren();

		const renderer = new MagicMoveRenderer(pre, opts);
		await renderer.render(beforeTokens);

		let showingAfter = false;
		let busy = false;

		async function render() {
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
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (reducedMotion) return;

				entries.forEach(async (entry) => {
					if (entry.isIntersecting) {
						await render();
						observer.disconnect();
					}
				});
			},
			{
				root: null,
				rootMargin: '-50px',
				threshold: 1,
			},
		);

		btn.addEventListener('click', async () => {
			await render();
		});

		if (autoanimate) {
			observer.observe(btn);
		}
	} catch (error) {
		console.error('Magic Move: Setup error:', error);
	}
});
