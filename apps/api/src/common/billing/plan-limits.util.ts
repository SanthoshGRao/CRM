/**
 * Reads structured limits out of `Plan.features` (an otherwise-untyped JSON
 * blob). Keeping the accessors here — rather than reaching into `features`
 * directly at each call site — means the shape only needs to change in one
 * place if a new limit is added later.
 */

/** null means unlimited. */
export function getMaxUsers(features: unknown): number | null {
  if (!features || typeof features !== 'object') return null;
  const value = (features as Record<string, unknown>).maxUsers;
  return typeof value === 'number' && value > 0 ? value : null;
}
