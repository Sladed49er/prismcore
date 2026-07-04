import { jsPDF } from "jspdf";
import type { CompareResult, CompareSite } from "@/lib/seo-compare";

/**
 * PDF for the multi-site comparison — a ranking table (sites as rows, so it
 * scales to ten domains), the per-site issue counts, and the comparative
 * summary. Same brand styling as the single-site report; loaded dynamically
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

export function buildComparePdf(result: CompareResult): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
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

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO);
  doc.text("PRISMOPTIMIZE", MARGIN, y);
  y += 20;
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  doc.text("SEO Comparison Report", MARGIN, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY);
  const sites = result.sites.filter((s) => !s.error);
  doc.text(
    `${sites.length} sites  ·  ${new Date(result.generatedAt).toLocaleDateString()}  ·  first site listed is yours`,
    MARGIN,
    y,
  );
  y += 24;

  // Ranking table — sites as rows
  const cols: [string, (s: CompareSite) => string | number, number][] = [
    ["Site", (s) => s.host, 150],
    ["Score", (s) => s.score, 46],
    ["Content", (s) => s.categoryScores.find((c) => c.label === "Content")?.score ?? "-", 52],
    ["Technical", (s) => s.categoryScores.find((c) => c.label === "Technical")?.score ?? "-", 56],
    ["Social", (s) => s.categoryScores.find((c) => c.label === "Social")?.score ?? "-", 44],
    ["Access.", (s) => s.categoryScores.find((c) => c.label === "Accessibility")?.score ?? "-", 48],
    ["Pages", (s) => s.pagesCrawled, 44],
    ["Thin", (s) => s.thinPages, 36],
    ["No meta", (s) => s.missingMeta, 50],
    ["No H1", (s) => s.missingH1, 42],
    ["No alt", (s) => s.imagesMissingAlt, 42],
    ["Broken", (s) => s.brokenLinks, 46],
    ["Dup titles", (s) => s.duplicateTitles, 52],
  ];
  const ranked = [...sites].sort((a, b) => b.score - a.score);
  const ownHost = sites[0]?.host;

  // header row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  let x = MARGIN;
  for (const [label, , w] of cols) {
    doc.text(label, x, y);
    x += w;
  }
  y += 5;
  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, y, MARGIN + width, y);
  y += 13;

  for (const s of ranked) {
    ensure(16);
    x = MARGIN;
    const own = s.host === ownHost;
    for (const [label, get, w] of cols) {
      const value = String(get(s));
      if (label === "Score") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...scoreColor(s.score));
      } else if (label === "Site") {
        doc.setFont("helvetica", own ? "bold" : "normal");
        doc.setTextColor(...DARK);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
      }
      doc.setFontSize(9);
      doc.text(
        label === "Site" && own ? `${value} (you)` : value,
        x,
        y,
        { maxWidth: w - 6 },
      );
      x += w;
    }
    y += 16;
  }
  y += 10;

  // Summary
  if (result.summary) {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("How you compare", MARGIN, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(55, 65, 81);
    for (const para of result.summary.split(/\n+/)) {
      const lines = doc.splitTextToSize(para, width) as string[];
      for (const line of lines) {
        ensure(14);
        doc.text(line, MARGIN, y);
        y += 13;
      }
      y += 6;
    }
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("PrismOptimize — prismoptimize.com", MARGIN, pageHeight - 28);
    doc.text(`${i} / ${pages}`, pageWidth - MARGIN, pageHeight - 28, {
      align: "right",
    });
  }
  return doc;
}
