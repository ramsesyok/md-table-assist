import type { CellAlign } from '../../model/TableModel';

export function alignToSeparator(align?: CellAlign): string {
  switch (align) {
    case 'left':   return ':---';
    case 'center': return ':---:';
    case 'right':  return '---:';
    default:       return '---';
  }
}

export function separatorToAlign(sep: string): CellAlign | undefined {
  const s = sep.trim().replace(/-+/, '-');
  // Must contain at least one dash
  if (!/^:?-+:?$/.test(sep.trim())) return undefined;
  const trimmed = sep.trim();
  const startsColon = trimmed.startsWith(':');
  const endsColon = trimmed.endsWith(':');
  if (startsColon && endsColon) return 'center';
  if (startsColon) return 'left';
  if (endsColon) return 'right';
  return undefined;
}
