/**
 * The Insights module's own kit.
 *
 * Kept apart from `components/phase1/ui` because these pieces know what the
 * module is for: a metric that refuses to print a zero it does not have, a
 * chart that breaks its line where a month had no contracts, a header that
 * carries provenance. None of that belongs in the general kit, and all of it
 * has to be the same on all five screens.
 */

export * from './shell';
export * from './metrics';
export * from './charts';
export * from './states';
export * from './filters';
export * from './bars';
