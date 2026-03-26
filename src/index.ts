import type { ExpressiveCodeBlockProps } from '@expressive-code/core';
import { definePlugin } from '@expressive-code/core';
import { h, select } from '@expressive-code/core/hast';
import type { BundledTheme } from 'shiki';

type MagicMoveData = {
	beforeCode: string;
	afterCode: string;
	lang: string;
};

type MagicMoveBlockProps = Partial<ExpressiveCodeBlockProps> & {
	magicMove?: MagicMoveData;
};

const JS = `
import { createHighlighter } from 'shiki';
import {
  createMagicMoveMachine,
  codeToKeyedTokens,
} from 'shiki-magic-move/core';
import { MagicMoveRenderer } from 'shiki-magic-move/renderer';

const THEME = 'catppuccin-mocha';
const highlighterCache = new Map();

async function getHighlighter(lang, theme) {
  const key = \`\${lang}:\${theme}\`;

  if (!highlighterCache.has(key)) {
    highlighterCache.set(
      key,
      createHighlighter({
        langs: [lang],
        themes: [theme],
      }),
    );
  }

  return highlighterCache.get(key);
}

document
  .querySelectorAll('[data-magic-move-before]')
  .forEach(async (el) => {
    try {
      const beforeCode = decodeURIComponent(
        el.dataset.magicMoveBefore ?? '',
      );
      const afterCode = decodeURIComponent(
        el.dataset.magicMoveAfter ?? '',
      );
      const lang = el.dataset.magicMoveLang ?? 'text';
      const theme = el.dataset.magicMoveTheme ?? THEME;
      const duration = Number(el.dataset.magicMoveDuration);
      const stagger = Number(el.dataset.magicMoveStagger);
      const lineNumbers = el.dataset.magicMoveLineNumbers;
      const opts = { duration, stagger };

      const host = el.closest('.expressive-code');
      const btn = host?.querySelector('.ec-magic-move-btn');

      if (!btn) {
        console.error('Magic Move: Button not found');
        return;
      }

      const pre = el;
      pre.replaceChildren();

      const highlighter = await getHighlighter(lang, theme);

      const machine = createMagicMoveMachine(
        (code) =>
          codeToKeyedTokens(highlighter, code, { lang, theme }, lineNumbers),
        opts,
      );

      const renderer = new MagicMoveRenderer(pre, opts);

      machine.commit(beforeCode);
      await renderer.render(machine.current);

      let showingAfter = false;
      let busy = false;

      btn.addEventListener('click', async () => {
        if (busy) return;
        busy = true;

        try {
          machine.commit(showingAfter ? beforeCode : afterCode);
          await renderer.render(machine.current);
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
`;

type Options = {
	duration: number;
	stagger: number;
	lineNumbers: true;
	theme: BundledTheme;
};

const DEFAULT_OPTS = {
	duration: 800,
	stagger: 3,
	lineNumbers: true,
	theme: 'catppuccin-mocha',
} satisfies Options;

export function pluginMagicMove(opts?: Options) {
	const config = { ...DEFAULT_OPTS, ...opts };

	return definePlugin({
		name: 'Magic Move',
		jsModules: [JS],
		baseStyles: `
      .ec-magic-move-btn {
        position: absolute;
        width: 36px;
        height: 36px;
        bottom: 0.6rem;
        right: 0.6rem;
        display: flex;
        opacity: 0.7;
        transition: all 0.3s ease-out;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        z-index: 10;
        background: var(--ec-codeBg, #1e1e2e);
        border: 1px solid var(--ec-brdCol, #45475a);
        border-radius: 8px;
        cursor: pointer;
        color: var(--ec-codeFg, #cdd6f4);
      }

      .ec-magic-move-btn:hover {
        opacity: 1;
        background: var(--ec-selBg, #313244);
        transform: scale(1.05);
      }

      pre[data-magic-move] .shiki-magic-move-container {
        position: relative;
        width: 100%;
      }

      pre[data-magic-move] .shiki-magic-move-line-number {
        opacity: 0.3;
        user-select: none;
      }

      pre[data-magic-move] .shiki-magic-move-item {
        display: inline-block;
        transition: color var(--smm-duration, 0.5s) var(--smm-easing, ease);
      }

      pre[data-magic-move] {
        display: block !important;
        box-sizing: border-box;
        padding: 1rem 1.25rem;
        white-space: pre;
      }

      pre[data-magic-move] br {
        display: block !important;
        width: 100%;
        height: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }

      pre[data-magic-move] .shiki-magic-move-move,
      pre[data-magic-move] .shiki-magic-move-enter-active,
      pre[data-magic-move] .shiki-magic-move-leave-active,
      pre[data-magic-move] .shiki-magic-move-container-resize,
      pre[data-magic-move] .shiki-magic-move-container-restyle {
        transition: all var(--smm-duration, 0.5s) var(--smm-easing, ease);
      }

      .shiki-magic-move-container-resize,
      .shiki-magic-move-container-restyle {
        transition-delay: calc(
          var(--smm-duration, 0.5s) * var(--smm-delay-container, 1)
        );
      }

      pre[data-magic-move] .shiki-magic-move-move {
        transition-delay: calc(
          calc(
            var(--smm-duration, 0.5s) * var(--smm-delay-move, 1)
          ) + var(--smm-stagger, 0)
        );
        z-index: 1;
      }

      pre[data-magic-move] .shiki-magic-move-enter-active {
        transition-delay: calc(
          calc(
            var(--smm-duration, 0.5s) * var(--smm-delay-enter, 1)
          ) + var(--smm-stagger, 0)
        );
        z-index: 1;
      }

      pre[data-magic-move] .shiki-magic-move-leave-active {
        transition-delay: calc(
          calc(
            var(--smm-duration, 0.5s) * var(--smm-delay-leave, 1)
          ) + var(--smm-stagger, 0)
        );
      }

      pre[data-magic-move] .shiki-magic-move-enter-from,
      pre[data-magic-move] .shiki-magic-move-leave-to {
        opacity: 0;
      }
    `,
		hooks: {
			preprocessCode: async ({ codeBlock }) => {
				const beforeRange = codeBlock.metaOptions.getRange('magic-move-before');
				const afterRange = codeBlock.metaOptions.getRange('magic-move-after');

				if (!beforeRange || !afterRange || !codeBlock.language) return;

				const [beforeStart, beforeEnd] = parseRange(beforeRange);
				const [afterStart, afterEnd] = parseRange(afterRange);

				const beforeLines = codeBlock.getLines(beforeStart, beforeEnd + 1);
				const afterLines = codeBlock.getLines(afterStart, afterEnd + 1);

				const beforeCode = beforeLines.map((line) => line.text).join('\n');
				const afterCode = afterLines.map((line) => line.text).join('\n');

				codeBlock.deleteLines(range(afterStart, afterEnd));

				(codeBlock.props as MagicMoveBlockProps).magicMove = {
					beforeCode,
					afterCode,
					lang: codeBlock.language,
				};
			},

			postprocessRenderedBlock: async ({ codeBlock, renderData }) => {
				const metaOptions = codeBlock.metaOptions;
				const duration = metaOptions.getInteger('magic-move-duration');
				const stagger = metaOptions.getInteger('magic-move-stagger');
				const lineNumbers = metaOptions.getBoolean('magic-move-line-numbers');
				const props = (codeBlock.props as MagicMoveBlockProps).magicMove;

				if (!props) return;

				const { beforeCode, afterCode, lang } = props;

				const pre = select('pre', renderData.blockAst);
				if (pre) {
					pre.properties = {
						...pre.properties,
						class: 'shiki-magic-move-container-resize',
						'data-magic-move-before': encodeURIComponent(beforeCode),
						'data-magic-move-after': encodeURIComponent(afterCode),
						'data-magic-move-lang': lang,
						'data-magic-move-theme': config.theme,
						'data-magic-move': true,
						'data-magic-move-duration': duration ?? config.duration,
						'data-magic-move-stagger': stagger ?? config.stagger,
						'data-magic-move-line-numbers': lineNumbers ?? config.lineNumbers,
					};
				}

				const btn = h(
					'button',
					{
						class: 'ec-magic-move-btn',
						type: 'button',
						'aria-label': 'Toggle Magic Move animation',
					},
					[
						h(
							'svg',
							{
								role: 'img',
								viewBox: '0 0 24 24',
								width: 24,
								height: 24,
								stroke: 'currentColor',
								fill: 'none',
								'stroke-width': '2',
								'stroke-linecap': 'round',
								'stroke-linejoin': 'round',
							},
							[
								h('path', {
									d: 'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z',
								}),
							],
						),
					],
				);

				renderData.blockAst.children.push(btn);
			},
		},
	});
}

function parseRange(value: string) {
	const [startRaw, endRaw] = value.split('-');
	const start = Number(startRaw) - 1;
	const end = Number(endRaw ?? startRaw) - 1;

	return [start, end] as const;
}

function range(start: number, end: number) {
	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
