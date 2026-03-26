import { describe, expect, test } from 'vitest';
import { parseRange, range, validateRanges } from './utils';

test('correctly parses range', () => {
	const result = parseRange('1-12');
	expect(result.isOk()).toBeTruthy();
	if (result.isOk()) {
		expect(result.value.start).toBe(0);
		expect(result.value.end).toBe(11);
	}
});

describe('parseRange errors', () => {
	test('incorrect input: incorrect length', () => {
		const result = parseRange('1');
		expect(result.isErr()).toBeTruthy();
		if (result.isErr()) {
			expect(result.error).toBe('incorrect input given');
		}
	});

	test('incorrect input: incorrect length with negative values', () => {
		const result = parseRange('-1-12');
		expect(result.isErr()).toBeTruthy();
		if (result.isErr()) {
			expect(result.error).toBe('incorrect input given');
		}
	});

	test('incorrect input: start is bigger than end', () => {
		const result = parseRange('15-5');
		expect(result.isErr()).toBeTruthy();
		if (result.isErr()) {
			expect(result.error).toBe('start cannot be bigger than end');
		}
	});
});

test('correct creates range', () => {
	const result = range({ start: 0, end: 5 });

	expect(result.isOk()).toBeTruthy();
	if (result.isOk()) {
		expect(result.value).toMatchObject([0, 1, 2, 3, 4, 5]);
	}
});

describe('correctly validates ranges', () => {
	test('should return ok', () => {
		expect(
			validateRanges({ start: 0, end: 4 }, { start: 5, end: 10 }).isOk(),
		).toBeTruthy();
	});

	test('should fail for first range', () => {
		const result = validateRanges({ start: 4, end: 0 }, { start: 5, end: 10 });

		expect(result.isErr()).toBeTruthy();
		if (result.isErr()) {
			expect(result.error).toBe(
				'start of first range is bigger than end of first range',
			);
		}
	});

	test('should fail for second range', () => {
		const result = validateRanges({ start: 0, end: 4 }, { start: 15, end: 10 });

		expect(result.isErr()).toBeTruthy();
		if (result.isErr()) {
			expect(result.error).toBe(
				'start of second range is bigger than end of second range',
			);
		}
	});

	test('should fail if start/end mismatch', () => {
		const result = validateRanges({ start: 0, end: 10 }, { start: 8, end: 15 });
		expect(result.isErr()).toBeTruthy();
		if (result.isErr()) {
			expect(result.error).toBe(
				'start of second range has to be bigger than end of first range',
			);
		}
	});
});
