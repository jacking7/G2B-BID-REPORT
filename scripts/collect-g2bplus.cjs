/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');

const URL = 'https://www.g2bplus.kr/bidnotice_search.php?bsnsDiv=ITALL';

function normalizeDate(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const match = text.match(/(\d{2})-(\d{2})-(\d{2})\([^\)]+\)\s*(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, yy, mm, dd, hh, mi] = match;
  return `20${yy}-${mm}-${dd}T${hh}:${mi}:00+09:00`;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const rows = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      const candidates = tables.filter((t) => {
        const text = t.innerText || '';
        return text.includes('순번') && text.includes('입찰공고명');
      });
      if (!candidates.length) return [];

      let target = candidates[0];
      let maxCells = 0;
      for (const t of candidates) {
        const trList = Array.from(t.querySelectorAll('tr'));
        const dataRow = trList[1];
        const cells = dataRow ? dataRow.querySelectorAll('td').length : 0;
        if (cells > maxCells) {
          maxCells = cells;
          target = t;
        }
      }

      const trList = Array.from(target.querySelectorAll('tr'));
      const dataRows = trList.slice(1);

      return dataRows
        .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()))
        .filter((row) => row.length > 0);
    });

    const notices = [];
    const datePattern = /\d{2}-\d{2}-\d{2}\([^\)]+\)\s*\d{2}:\d{2}/;

    for (const row of rows) {
      const seq = row[0] || '';
      const dateBlock = row[1] || '';
      const orgBlock = row[2] || '';
      const status = row[3] || '';
      const titleBlock = row[4] || '';
      const priceBlock = row[5] || '';
      const bidMethod = row[6] || '';

      const dateLines = dateBlock.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const dateHits = dateLines.filter((line) => datePattern.test(line));
      const noticeDate = dateHits[0] || '';
      const closeDate = dateHits[1] || '';

      const orgLines = orgBlock.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const organization = (orgLines[0] || '').split('｜')[0].trim();

      const titleLines = titleBlock.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const titleLineRaw = titleLines.find((line) => line.includes('♡')) || titleLines[0] || '';
      let title = titleLineRaw.replace(/.*?♡\s*/, '');

      let bidNtceNo = '';
      if (/[|｜]/.test(title)) {
        const parts = title.split(/\s*[|｜]\s*/).map((s) => s.trim());
        title = parts[0] || title;
        const maybe = parts[1] || '';
        const m = maybe.match(/R\d{2}[A-Z]{2}\d{8,9}(?:-\d{3})?/);
        if (m) bidNtceNo = m[0];
      }

      const bidNoMatch = titleBlock.match(/R\d{2}[A-Z]{2}\d{8,9}-\d{3}|R\d{2}[A-Z]{2}\d{8,9}/);
      if (bidNoMatch) bidNtceNo = bidNoMatch[0];

      const bidNtceOrdMatch = bidNtceNo.match(/-(\d{3})$/);
      const bidNtceOrd = bidNtceOrdMatch ? bidNtceOrdMatch[1] : '000';
      const bidNtceNoBase = bidNtceNo.replace(/-\d{3}$/, '');

      const priceNums = priceBlock.match(/[0-9,]+/g) || [];
      const baseAmount = priceNums.length
        ? Number(priceNums[priceNums.length - 1].replace(/,/g, ''))
        : null;

      notices.push({
        seq,
        bidNtceNo: bidNtceNoBase || bidNtceNo,
        bidNtceOrd,
        title,
        organization,
        noticeDateRaw: noticeDate,
        closeDateRaw: closeDate,
        noticeDate: normalizeDate(noticeDate),
        closeDate: normalizeDate(closeDate),
        baseAmount,
        detailUrl: URL,
        status,
        bidMethod,
      });
    }

    process.stdout.write(JSON.stringify({ notices }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
