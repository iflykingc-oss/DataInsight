import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subtitle, tableData } = body;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'Export'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
    h2 { color: #666; font-size: 14px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd; }
    td { padding: 8px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${title || 'Report'}</h1>
  ${subtitle ? `<h2>${subtitle}</h2>` : ''}
  ${tableData?.headers?.length ? `
    <table>
      <thead>
        <tr>${tableData.headers.map((h: string) => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${tableData.rows.slice(0, 100).map((row: (string | number)[]) =>
          `<tr>${row.map((cell: string | number) => `<td>${cell}</td>`).join('')}</tr>`
        ).join('')}
      </tbody>
    </table>
  ` : ''}
  <script>window.print();window.close();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${title || 'export'}.html"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
