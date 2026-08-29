export function toCsv(rows: Array<Record<string, unknown>>, columns: Array<{ key: string; header: string }>): string {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const headerLine = columns.map((column) => escape(column.header)).join(",");
  const lines = rows.map((row) => columns.map((column) => escape(row[column.key])).join(","));
  return [headerLine, ...lines].join("\r\n");
}
