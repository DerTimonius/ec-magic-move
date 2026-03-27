import { type Err, err, ok, type Result } from './result';

type Range = {
	start: number;
	end: number;
};

export function parseRange(value: string): Result<Range, string> {
	const result = value.split('-');

	if (result.length !== 2) {
		return err('incorrect input given');
	}

	const [startRaw, endRaw] = result;
	const start = Number(startRaw) - 1;
	const end = Number(endRaw) - 1;

	if (start > end) {
		return err('start cannot be bigger than end');
	}

	return ok({ start, end });
}

export function range({ start, end }: Range): Result<number[], string> {
	const validation = validateRange({ start, end });
	if (validation.isErr()) {
		return validation as Err<number[], string>;
	}

	return ok(Array.from({ length: end - start + 1 }, (_, i) => start + i));
}

export function validateRange(range: Range): Result<unknown, string> {
	return range.start > range.end ? err('start is bigger than end') : ok({});
}

export function validateRanges(
	first: Range,
	second: Range,
): Result<unknown, string> {
	const firstValidation = validateRange(first);
	if (firstValidation.isErr()) {
		return err('start of first range is bigger than end of first range');
	}

	const secondValidation = validateRange(second);
	if (secondValidation.isErr()) {
		return err('start of second range is bigger than end of second range');
	}

	return first.end > second.start
		? err('start of second range has to be bigger than end of first range')
		: ok({});
}
