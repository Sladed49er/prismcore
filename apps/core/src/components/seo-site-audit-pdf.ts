import { jsPDF } from "jspdf";
import type { SiteAuditReport } from "@/lib/seo-site-audit";
import { SEO_GLOSSARY } from "@/lib/seo-glossary";

/**
 * PDF rendering for the deep site audit — a client-side, brand-styled report
 * the member can hand to a boss or client. Loaded dynamically by the panel
 * so jsPDF stays out of the main bundle.
 */

const MARGIN = 54;
const INDIGO: [number, number, number] = [79, 70, 229];
const GRAY: [number, number, number] = [107, 114, 128];
const DARK: [number, number, number] = [17, 24, 39];
const GREEN: [number, number, number] = [5, 150, 105];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];

function scoreColor(score: number): [number, number, number] {
  return score >= 80 ? GREEN : score >= 55 ? AMBER : RED;
}

export function buildPdf(r: SiteAuditReport): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensure = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text: string) => {
    ensure(40);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(text, MARGIN, y);
    y += 6;
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, y, MARGIN + width, y);
    y += 14;
  };

  const paragraph = (
    text: string,
    size = 9.5,
    color: [number, number, number] = [55, 65, 81],
    indent = 0,
  ) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, width - indent) as string[];
    for (const line of lines) {
      ensure(size + 4);
      doc.text(line, MARGIN + indent, y);
      y += size + 3.5;
    }
  };

  /* Header band */
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO);
  doc.text("PRISMOPTIMIZE", MARGIN, y);
  y += 20;
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  doc.text("SEO Site Audit", MARGIN, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(
    `${r.root}  ·  ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  ·  ${r.pagesCrawled} pages crawled${r.truncated ? " (capped)" : ""}`,
    MARGIN,
    y,
  );
  y += 28;

  /* Score row */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(44);
  doc.setTextColor(...scoreColor(r.score));
  doc.text(String(r.score), MARGIN, y + 10);
  const scoreWidth = doc.getTextWidth(String(r.score));
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.text("/100 site score", MARGIN + scoreWidth + 6, y + 10);

  let x = MARGIN + scoreWidth + 130;
  for (const c of r.categoryScores) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...scoreColor(c.score));
    doc.text(String(c.score), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(c.label, x, y + 11);
    x += Math.max(doc.getTextWidth(c.label), 24) + 22;
  }
  y += 34;

  /* Summary */
  if (r.summary) {
    heading("Executive summary");
    paragraph(r.summary, 10);
  }

  /* Action plan */
  if (r.actions.length > 0) {
    heading("Action plan");
    r.actions.forEach((a, i) => {
      ensure(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const impactColor =
        a.impact === "high" ? RED : a.impact === "medium" ? AMBER : GRAY;
      doc.setTextColor(...impactColor);
      doc.text(a.impact.toUpperCase(), MARGIN, y);
      doc.setTextColor(...DARK);
      doc.text(`${i + 1}. ${a.title}`, MARGIN + 52, y);
      y += 13;
      paragraph(a.detail, 9, [75, 85, 99], 52);
      y += 5;
    });
  }

  /* Stats */
  heading("Site-wide findings");
  paragraph(
    "Counts across every page crawled. Every term below is explained in the plain-English glossary on the last page.",
    8.5,
    GRAY,
  );
  y += 6;
  const stats: [string, string | number][] = [
    ["Pages missing a title", r.stats.missingTitle],
    ["Pages missing a meta description", r.stats.missingMeta],
    ["Pages missing an H1", r.stats.missingH1],
    ["Thin pages (under 150 words)", r.stats.thinPages],
    [
      "Images without alt text",
      `${r.stats.imagesMissingAlt} of ${r.stats.imagesTotal}`,
    ],
    ["Broken internal links", r.brokenLinks.length],
    ["Duplicate title groups", r.duplicateTitles.length],
    ["Duplicate meta description groups", r.duplicateMetas.length],
    ["Pages without structured data", r.stats.missingStructuredData],
    ["Pages marked noindex", r.stats.noindexPages],
    ["Sitemap.xml", r.technical.sitemapFound ? "found" : "missing"],
    [
      "HTTP redirects to HTTPS",
      r.technical.httpRedirectsToHttps === null
        ? "n/a"
        : r.technical.httpRedirectsToHttps
          ? "yes"
          : "NO",
    ],
  ];
  for (const [label, value] of stats) {
    ensure(14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(String(value), MARGIN + 250, y);
    y += 14;
  }

  /* Broken links */
  if (r.brokenLinks.length > 0) {
    heading(`Broken internal links (${r.brokenLinks.length})`);
    paragraph(
      "Links on the site that lead to dead pages — visitors hit an error, and Google reads it as neglect. Fix the link or the page it points to.",
      8.5,
      GRAY,
    );
    y += 4;
    for (const link of r.brokenLinks.slice(0, 40)) {
      paragraph(`[${link.status}] ${link.url}  —  found on ${link.foundOn}`, 8, [75, 85, 99]);
      y += 2;
    }
  }

  /* Duplicate titles */
  if (r.duplicateTitles.length > 0) {
    heading(`Duplicate titles (${r.duplicateTitles.length} groups)`);
    paragraph(
      "These pages share the same headline in Google, so they compete with each other. Give each page a title that says what makes it different.",
      8.5,
      GRAY,
    );
    y += 4;
    for (const group of r.duplicateTitles.slice(0, 10)) {
      ensure(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(doc.splitTextToSize(`"${group.value}"`, width)[0] as string, MARGIN, y);
      y += 12;
      for (const url of group.urls) paragraph(url, 8, GRAY, 12);
      y += 4;
    }
  }

  /* Worst pages */
  const worst = r.pages.filter((p) => p.failCount + p.warnCount > 0).slice(0, 20);
  if (worst.length > 0) {
    heading("Pages needing the most work");
    paragraph(
      "✗ marks a failed check, ! marks a warning. Each check is explained in the glossary on the last page.",
      8.5,
      GRAY,
    );
    y += 4;
    for (const p of worst) {
      ensure(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(doc.splitTextToSize(p.url, width)[0] as string, MARGIN, y);
      y += 12;
      for (const f of p.findings) {
        paragraph(
          `${f.status === "fail" ? "✗" : "!"} ${f.label}: ${f.detail}`,
          8,
          f.status === "fail" ? RED : AMBER,
          12,
        );
      }
      y += 6;
    }
  }

  /* Glossary — always the last section, so the report needs no translator. */
  doc.addPage();
  y = MARGIN;
  heading("Plain-English glossary — what these terms mean");
  paragraph(
    "Every technical term used in this report, in everyday language. Hand this report to anyone — no SEO background needed.",
    9,
    GRAY,
  );
  y += 8;
  for (const entry of SEO_GLOSSARY) {
    ensure(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(entry.term, MARGIN, y);
    y += 12;
    paragraph(entry.plain, 8.5, [75, 85, 99], 12);
    y += 6;
  }

  /* Footer: page numbers + brand */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `PrismOptimize — prismoptimize.com`,
      MARGIN,
      pageHeight - 24,
    );
    doc.text(
      `${i} / ${pages}`,
      pageWidth - MARGIN,
      pageHeight - 24,
      { align: "right" },
    );
  }

  return doc;
}
