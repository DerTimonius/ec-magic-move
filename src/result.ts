export type Result<T, E> = Ok<T, E> | Err<T, E>;

export function ok<T, E = never>(value: T): Ok<T, E> {
	return new Ok(value);
}

export function err<T = never, E = unknown>(err: E): Err<T, E> {
	return new Err(err);
}

interface ResultInterface<T, E> {
	/**
	 * Used to check if a `Result` is an `OK`
	 *
	 * @returns `true` if the result is an `OK` variant of Result
	 */
	isOk(): this is Ok<T, E>;

	/**
	 * Used to check if a `Result` is an `Err`
	 *
	 * @returns `true` if the result is an `Err` variant of Result
	 */
	isErr(): this is Err<T, E>;

	/**
	 * Maps a `Result<T, E>` to `Result<U, E>`
	 * by applying a function to a contained `Ok` value, leaving an `Err` value
	 * untouched.
	 *
	 * @param f The function to apply an `OK` value
	 * @returns the result of applying `f` or an `Err` untouched
	 */
	map<A>(f: (t: T) => A): Result<A, E>;

	/**
	 * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a
	 * contained `Err` value, leaving an `Ok` value untouched.
	 *
	 * This function can be used to pass through a successful result while
	 * handling an error.
	 *
	 * @param f a function to apply to the error `Err` value
	 */
	mapErr<U>(f: (e: E) => U): Result<T, U>;

	/**
	 * Unwrap the `Ok` value, or return the default if there is an `Err`
	 *
	 * @param v the default value to return if there is an `Err`
	 */
	unwrapOr<A>(v: A): T | A;

	/**
	 *
	 * Given 2 functions (one for the `Ok` variant and one for the `Err` variant)
	 * execute the function that matches the `Result` variant.
	 *
	 * Match callbacks do not necessitate to return a `Result`, however you can
	 * return a `Result` if you want to.
	 *
	 * `match` is like chaining `map` and `mapErr`, with the distinction that
	 * with `match` both functions must have the same return type.
	 *
	 * @param ok
	 * @param err
	 */
	match<A, B = A>(ok: (t: T) => A, err: (e: E) => B): A | B;
}

export class Ok<T, E> implements ResultInterface<T, E> {
	readonly value: T;

	constructor(value: T) {
		this.value = value;
	}

	isOk(): this is Ok<T, E> {
		return true;
	}

	isErr(): this is Err<T, E> {
		return !this.isOk();
	}

	map<A>(f: (t: T) => A): Result<A, E> {
		return ok(f(this.value));
	}

	mapErr<U>(_f: (e: E) => U): Result<T, U> {
		return ok(this.value);
	}

	unwrapOr<A>(_v: A): T | A {
		return this.value;
	}

	match<A, B = A>(okFn: (t: T) => A, _errFn: (e: E) => B): A | B {
		return okFn(this.value);
	}
}

export class Err<T, E> implements ResultInterface<T, E> {
	readonly error: E;

	constructor(error: E) {
		this.error = error;
	}

	isOk(): this is Ok<T, E> {
		return false;
	}

	isErr(): this is Err<T, E> {
		return !this.isOk();
	}

	map<A>(_f: (t: T) => A): Result<A, E> {
		return err(this.error);
	}

	mapErr<U>(f: (e: E) => U): Result<T, U> {
		return err(f(this.error));
	}

	unwrapOr<A>(v: A): T | A {
		return v;
	}

	match<A, B = A>(_okFn: (t: T) => A, errFn: (e: E) => B): A | B {
		return errFn(this.error);
	}
}
