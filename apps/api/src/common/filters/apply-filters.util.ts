export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty'
  | 'in';

export type FilterFieldType = 'string' | 'number' | 'date' | 'select' | 'boolean';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export type FilterFieldMap = Record<string, FilterFieldType>;

/**
 * Parses the `filters` query param (a JSON-encoded FilterCondition[]) and
 * layers it onto an existing Prisma `where` object, in place. Fields not
 * present in `allowedFields` are silently dropped rather than rejected — a
 * saved view built against a since-removed field shouldn't 500 the list, it
 * should just stop narrowing on that one condition.
 */
export function applyFilters(where: Record<string, any>, rawFilters: unknown, allowedFields: FilterFieldMap): void {
  const filters = parseFilters(rawFilters);
  if (filters.length === 0) return;

  for (const filter of filters) {
    const type = allowedFields[filter.field];
    if (!type) continue;

    const clause = buildClause(type, filter.operator, filter.value);
    if (clause !== undefined) where[filter.field] = clause;
  }
}

export function parseFilters(rawFilters: unknown): FilterCondition[] {
  if (!rawFilters) return [];
  let parsed: unknown = rawFilters;
  if (typeof rawFilters === 'string') {
    try {
      parsed = JSON.parse(rawFilters);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (f): f is FilterCondition => f && typeof f === 'object' && typeof f.field === 'string' && typeof f.operator === 'string',
  );
}

function castScalar(type: FilterFieldType, value: unknown): unknown {
  if (type === 'number') return Number(value);
  if (type === 'date') return new Date(value as string);
  if (type === 'boolean') return value === true || value === 'true';
  return value;
}

function buildClause(type: FilterFieldType, operator: FilterOperator, value: unknown): unknown {
  switch (operator) {
    case 'equals':
      return castScalar(type, value);
    case 'not_equals':
      return { not: castScalar(type, value) };
    case 'contains':
      return type === 'string' ? { contains: String(value), mode: 'insensitive' } : undefined;
    case 'gt':
      return { gt: castScalar(type, value) };
    case 'gte':
      return { gte: castScalar(type, value) };
    case 'lt':
      return { lt: castScalar(type, value) };
    case 'lte':
      return { lte: castScalar(type, value) };
    case 'is_empty':
      return null;
    case 'is_not_empty':
      return { not: null };
    case 'in': {
      const list = Array.isArray(value) ? value : String(value ?? '').split(',');
      return { in: list.filter(Boolean) };
    }
    default:
      return undefined;
  }
}
