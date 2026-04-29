export function escapeMarkdownCell(text: string): string {
  // Escape pipe characters so they don't break the Markdown table
  return text.replace(/\|/g, '\\|');
}

export function escapeAttributeValue(value: string): string {
  // Escape double quotes inside attribute values
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
