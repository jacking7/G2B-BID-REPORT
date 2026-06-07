import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, getTodayDateLabel } from "@/lib/format";
import type { getDailyReportWindow } from "@/lib/report-window";

export async function getCollectedResultsForUser(userId: string) {
  return prisma.collectedResult.findMany({
    where: {
      userId,
    },
    orderBy: {
      collectedAt: "desc",
    },
    include: {
      bidNotice: true,
    },
  });
}

export async function getPendingResultsForUser(userId: string) {
  return prisma.collectedResult.findMany({
    where: {
      userId,
      emailedAt: null,
    },
    orderBy: {
      collectedAt: "desc",
    },
    include: {
      bidNotice: true,
    },
  });
}

type DailyReportWindow = ReturnType<typeof getDailyReportWindow>;

export async function getDailyReportResultsForUser(userId: string, window: DailyReportWindow) {
  return prisma.collectedResult.findMany({
    where: {
      userId,
      collectedAt: {
        gte: window.start,
        lt: window.end,
      },
    },
    orderBy: {
      collectedAt: "desc",
    },
    include: {
      bidNotice: true,
    },
  });
}

type CollectedResultWithNotice = Awaited<ReturnType<typeof getCollectedResultsForUser>>[number];

const ZIP_UTF8_FLAG = 0x0800;
const XLSX_SHEET_NAME = "수집결과";

type WorkbookRow = Record<string, string>;

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getCellReference(columnIndex: number, rowNumber: number) {
  let columnName = "";
  let index = columnIndex;

  while (index >= 0) {
    columnName = String.fromCharCode((index % 26) + 65) + columnName;
    index = Math.floor(index / 26) - 1;
  }

  return `${columnName}${rowNumber}`;
}

function getCrc32Table() {
  return Array.from({ length: 256 }, (_, tableIndex) => {
    let current = tableIndex;

    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }

    return current >>> 0;
  });
}

const crc32Table = getCrc32Table();

function calculateCrc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosTimestamp(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);

  return { dosDate, dosTime };
}

function createZip(files: Array<{ path: string; content: string }>) {
  const { dosDate, dosTime } = getDosTimestamp();
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = Buffer.from(file.path, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const crc32 = calculateCrc32(content);
    const localHeader = Buffer.alloc(30 + fileName.length);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(ZIP_UTF8_FLAG, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileName.copy(localHeader, 30);

    localParts.push(localHeader, content);

    const centralHeader = Buffer.alloc(46 + fileName.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(ZIP_UTF8_FLAG, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    fileName.copy(centralHeader, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);

  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function buildWorksheetXml(rows: WorkbookRow[]) {
  const workbookRows = rows.length > 0 ? rows : [{ 안내: "수집 결과가 없습니다." }];
  const headers = Object.keys(workbookRows[0]);
  const sheetRows = [headers, ...workbookRows.map((row) => headers.map((header) => row[header] ?? ""))];

  const rowXml = sheetRows
    .map((values, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = values
        .map(
          (value, columnIndex) =>
            `<c r="${getCellReference(columnIndex, rowNumber)}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`,
        )
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

function buildXlsxBuffer(rows: WorkbookRow[]) {
  const worksheetXml = buildWorksheetXml(rows);

  return createZip([
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(XLSX_SHEET_NAME)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      path: "xl/worksheets/sheet1.xml",
      content: worksheetXml,
    },
  ]);
}

function buildWorkbookFromResults(results: CollectedResultWithNotice[]) {
  const rows = results.map((result) => ({
    확인시각: formatDateTime(result.collectedAt),
    발송상태: result.emailedAt ? "발송완료" : "미발송",
    매칭키워드: result.matchedKeyword ?? "-",
    공고번호: result.bidNotice.bidNtceNo,
    공고차수: result.bidNotice.bidNtceOrd ?? "-",
    공고명: result.bidNotice.title,
    기관: result.bidNotice.organization ?? "-",
    공고일: formatDateTime(result.bidNotice.noticeDate),
    마감일: formatDateTime(result.bidNotice.closeDate),
    기초금액: formatCurrency(result.bidNotice.baseAmount),
    상세URL: result.bidNotice.detailUrl ?? "",
  }));

  return {
    buffer: buildXlsxBuffer(rows),
    fileName: `g2b-results-${getTodayDateLabel()}.xlsx`,
    count: results.length,
  };
}

export function buildResultsWorkbookFromResults(results: CollectedResultWithNotice[]) {
  return buildWorkbookFromResults(results);
}

export async function buildResultsWorkbook(userId: string) {
  const results = await getCollectedResultsForUser(userId);
  return buildWorkbookFromResults(results);
}

export function buildReportHtml(input: {
  userName: string;
  results: CollectedResultWithNotice[];
  title?: string;
  summary?: string;
}) {
  const { userName, results } = input;
  const rows = results
    .map(
      (result) => `
        <tr>
          <td style="padding:8px;border:1px solid #d7e0ea;">${result.matchedKeyword ?? "-"}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${result.bidNotice.title}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${result.bidNotice.organization ?? "-"}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${formatDateTime(result.bidNotice.noticeDate)}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${formatDateTime(result.bidNotice.closeDate)}</td>
          <td style="padding:8px;border:1px solid #d7e0ea;">${formatCurrency(result.bidNotice.baseAmount)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6;">
      <h2>${input.title ?? "나라장터 공고 리포트"}</h2>
      <p>${input.summary ?? `${userName}님 기준 확인 공고 ${results.length}건입니다.`}</p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">매칭 키워드</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">공고명</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">기관</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">공고일</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">마감일</th>
            <th style="padding:8px;border:1px solid #d7e0ea;background:#f8fbff;">기초금액</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
