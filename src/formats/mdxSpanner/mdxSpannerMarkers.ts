// mdx_spanner marker specification.
// Changing markers only requires editing this file.
//
// > means "merge with the cell to the left" (colspan continuation)
// ^ means "merge with the cell above" (rowspan continuation)

export const COLSPAN_MARKER = '>';
export const ROWSPAN_MARKER = '^';

export function toColspanMarker(): string {
  return COLSPAN_MARKER;
}

export function toRowspanMarker(): string {
  return ROWSPAN_MARKER;
}

export function isMdxSpannerColspanMarker(value: string): boolean {
  return value.trim() === COLSPAN_MARKER;
}

export function isMdxSpannerRowspanMarker(value: string): boolean {
  return value.trim() === ROWSPAN_MARKER;
}

export function isMdxSpannerMarker(value: string): boolean {
  return isMdxSpannerColspanMarker(value) || isMdxSpannerRowspanMarker(value);
}
