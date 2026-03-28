import type { ExpressiveCodeBlockProps } from '@expressive-code/core';
import { definePlugin } from '@expressive-code/core';
import { h, select } from '@expressive-code/core/hast';
import type { BundledTheme } from 'shiki';
import { createHighlighter } from 'shiki';
import { codeToKeyedTokens, syncTokenKeys } from 'shiki-magic-move/core';
import { jsModule as JS } from './js-module/magic-move.min';
import { err, ok, type Result } from './result';
import { parseRange, range, validateRanges } from './utils';

type MagicMoveData = {
	beforeCode: string;
	afterCode: string;
	lang: string;
};

type MagicMoveBlockProps = Partial<ExpressiveCodeBlockProps> & {
	magicMove?: Result<MagicMoveData, string>;
};

type Options = {
	/**
	 * Duration of the animation in milliseconds.
	 * @default 800
	 */
	duration: number;
	/**
	 * Stagger delay between each token in milliseconds.
	 * @default 3
	 */
	stagger: number;
	/**
	 * Whether to show line numbers.
	 * @default true
	 */
	lineNumbers: boolean;
	/**
	 * The syntax highlighting theme to use.
	 * @default 'catppuccin-mocha'
	 */
	theme: BundledTheme;
	/**
	 * The position of the play button
	 * @default 'bottom-right'
	 */
	buttonPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
};

const DEFAULT_OPTS = {
	duration: 800,
	stagger: 3,
	lineNumbers: true,
	theme: 'catppuccin-mocha',
	buttonPosition: 'bottom-right',
} satisfies Options;

const highlighterCache = new Map<
	string,
	ReturnType<typeof createHighlighter>
>();

function getOrCreateHighlighter(lang: string, theme: BundledTheme) {
	const key = `${lang}:${theme}`;
	if (!highlighterCache.has(key)) {
		highlighterCache.set(
			key,
			createHighlighter({ langs: [lang], themes: [theme] }),
		);
	}
	// biome-ignore lint/style/noNonNullAssertion: guaranteed to exist
	return highlighterCache.get(key)!;
}

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

        &[data-position^="top"] {
          top: 0.6rem;
        }
        &[data-position^="bottom"] {
          bottom: 0.6rem;
        }

        &[data-position$="-right"] {
          right: 0.6rem;
        }
        &[data-position$="-left"] {
          left: 0.6rem;
        }
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

      .ec-magic-move-error {
        padding: 0.5rem 0.75rem;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        border-radius: 4px;
        background: var(--ec-tm-delDiffIndCol, #f38ba8);
        color: var(--ec-frm-edBg, #1e1e2e);
      }
    `,
		hooks: {
			preprocessCode: async ({ codeBlock }) => {
				const beforeRange = codeBlock.metaOptions.getRange('magic-move-before');
				const afterRange = codeBlock.metaOptions.getRange('magic-move-after');

				if (!beforeRange || !afterRange || !codeBlock.language) return;

				const beforeResult = parseRange(beforeRange);
				const afterResult = parseRange(afterRange);

				if (beforeResult.isErr()) {
					(codeBlock.props as MagicMoveBlockProps).magicMove = err(
						`error at beforeRange: ${beforeResult.error}`,
					);
					return;
				}
				if (afterResult.isErr()) {
					(codeBlock.props as MagicMoveBlockProps).magicMove = err(
						`error at afterRange: ${afterResult.error}`,
					);
					return;
				}

				const beforeLines = codeBlock.getLines(
					beforeResult.value.start,
					beforeResult.value.end + 1,
				);
				const afterLines = codeBlock.getLines(
					afterResult.value.start,
					afterResult.value.end + 1,
				);

				const rangeValidation = validateRanges(
					beforeResult.value,
					afterResult.value,
				);

				if (rangeValidation.isErr()) {
					(codeBlock.props as MagicMoveBlockProps).magicMove = err(
						rangeValidation.error,
					);
					return;
				}

				const beforeCode = beforeLines.map((line) => line.text).join('\n');
				const afterCode = afterLines.map((line) => line.text).join('\n');
				const rangeResult = range(afterResult.value);

				if (rangeResult.isErr()) {
					(codeBlock.props as MagicMoveBlockProps).magicMove = err(
						rangeResult.error,
					);
					return;
				}

				const codeLines = codeBlock.getLines().length;

				// biome-ignore lint/style/noNonNullAssertion: not undefined
				if (codeLines < rangeResult.value.at(-1)!) {
					(codeBlock.props as MagicMoveBlockProps).magicMove = err(
						'cannot delete lines outside of code block',
					);
					return;
				}

				codeBlock.deleteLines(rangeResult.value);

				(codeBlock.props as MagicMoveBlockProps).magicMove = ok({
					beforeCode,
					afterCode,
					lang: codeBlock.language,
				});
			},

			postprocessRenderedBlock: async ({ codeBlock, renderData }) => {
				const metaOptions = codeBlock.metaOptions;
				const duration = metaOptions.getInteger('magic-move-duration');
				const stagger = metaOptions.getInteger('magic-move-stagger');
				const lineNumbers = metaOptions.getBoolean('magic-move-line-numbers');
				const props = (codeBlock.props as MagicMoveBlockProps).magicMove;

				if (!props) return;

				if (props.isErr()) {
					const errorDiv = h(
						'div',
						{
							class: 'ec-magic-move-error',
						},
						`[MAGIC-MOVE-ERROR]: ${props.error}`,
					);
					renderData.blockAst.children.push(errorDiv);
					return;
				}
				const { beforeCode, afterCode, lang } = props.value;

				const theme = config.theme;
				const showLineNumbers = lineNumbers ?? config.lineNumbers;

				const highlighter = await getOrCreateHighlighter(lang, theme);
				const beforeTokens = codeToKeyedTokens(
					highlighter,
					beforeCode,
					{ lang, theme },
					showLineNumbers,
				);
				const afterTokens = codeToKeyedTokens(
					highlighter,
					afterCode,
					{ lang, theme },
					showLineNumbers,
				);
				const { from: syncedBefore, to: syncedAfter } = syncTokenKeys(
					beforeTokens,
					afterTokens,
				);

				const pre = select('pre', renderData.blockAst);
				if (pre) {
					pre.properties = {
						...pre.properties,
						class: 'shiki-magic-move-container-resize',
						'data-magic-move-before': encodeURIComponent(
							JSON.stringify(syncedBefore),
						),
						'data-magic-move-after': encodeURIComponent(
							JSON.stringify(syncedAfter),
						),
						'data-magic-move': true,
						'data-magic-move-duration': duration ?? config.duration,
						'data-magic-move-stagger': stagger ?? config.stagger,
					};
				}

				const btn = h(
					'button',
					{
						class: 'ec-magic-move-btn',
						type: 'button',
						'aria-label': 'Toggle Magic Move animation',
						'data-position': config.buttonPosition,
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
