/* eslint-disable @typescript-eslint/ban-types */
import { rateLimiter, Operation } from "./limiter";

/**
 * Keeps exact Firestore types while injecting limiter.
 */
export function makeGuarded<
  F extends (...args: any[]) => any,
  Op extends Operation
>(original: F, op: Op): F {
  return (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    const maybeRef = args[0];
    await rateLimiter.register(op, maybeRef);
    // @ts-expect-error – cast back to original return type
    return original(...(args as Parameters<F>));
  }) as unknown as F;
}
