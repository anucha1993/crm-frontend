import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: unknown) => string | number;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = "Sheet1"
) {
  // Build header row
  const headers = columns.map((c) => c.header);

  // Build data rows
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      if (col.format) return col.format(value);
      return value ?? "";
    })
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate and download
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
}

export function exportMultiSheetExcel(
  sheets: {
    name: string;
    data: Record<string, unknown>[];
    columns: ExportColumn[];
  }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const headers = sheet.columns.map((c) => c.header);
    const rows = sheet.data.map((row) =>
      sheet.columns.map((col) => {
        const value = row[col.key];
        if (col.format) return col.format(value);
        return value ?? "";
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = sheet.columns.map((c) => ({ wch: c.width || 15 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
}
