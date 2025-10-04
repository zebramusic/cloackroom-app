// Feature removed. MRZ utilities were part of the check-in feature.
export type MRZResult = Record<string, never>;
export function parseMRZ(): MRZResult {
	return {};
}
