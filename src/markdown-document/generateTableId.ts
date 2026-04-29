let counter = 0;

export function generateTableId(existingIds: string[] = []): string {
  const usedSet = new Set(existingIds);
  let id: string;
  do {
    counter++;
    id = `tbl-${String(counter).padStart(3, '0')}`;
  } while (usedSet.has(id));
  return id;
}

export function resetTableIdCounter(): void {
  counter = 0;
}
