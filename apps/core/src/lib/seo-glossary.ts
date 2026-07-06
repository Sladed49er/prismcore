/**
 * The plain-English layer of every PrismOptimize report.
 *
 * Reports go to operations people, not SEO techs — every term the report
 * uses gets defined here once, in everyday language, and every surface
 * (web panel, PDF, AI prompts) pulls from this file so nobody ever has to
 * explain a report after handing it over. Keep entries anchored to things
 * a non-technical reader has actually seen ("the blue headline on a Google
 * result", "the preview card when a link is pasted into Teams").
 */

export interface GlossaryEntry {
  term: string;
  plain: string;
}

/** The full glossary, in the order it should print. */
export const SEO_GLOSSARY: GlossaryEntry[] = [
  {
    term: "SEO (search engine optimization)",
    plain:
      "Everything that helps your site show up higher when people search on Google or Bing. This report measures the parts of SEO that live on your own site.",
  },
  {
    term: "GEO / AI visibility",
    plain:
      "Generative Engine Optimization — the new counterpart to SEO. Instead of ranking in Google results, it's whether AI assistants (ChatGPT, Claude, Copilot) mention your business when someone asks them a question. The AI visibility checks measure exactly that.",
  },
  {
    term: "Crawl",
    plain:
      "An automated visit that loads your pages and follows your links the same way Google does. This report is built from one crawl of your site.",
  },
  {
    term: "Site score",
    plain:
      "A 0–100 grade. Every crawled page is scored on the checks below, the scores are averaged, and site-wide problems (broken links, missing sitemap) subtract a few points from the total.",
  },
  {
    term: "Title tag",
    plain:
      "The page's name. It becomes the clickable blue headline on a Google result and the label on the browser tab. Every page needs its own, ideally 15–65 characters.",
  },
  {
    term: "Meta description",
    plain:
      "The one- or two-sentence blurb Google shows in gray under the blue headline. It's your sales pitch in the search results — when it's missing, Google improvises one, often badly. \"Meta tags\" generally are these behind-the-scenes labels that describe a page to search engines.",
  },
  {
    term: "Headings (H1, H2, H3)",
    plain:
      "The headline structure of a page, like an outline. The H1 is the page's main headline (use exactly one); H2s and H3s are the section headings under it. Search engines read them to understand what the page is about.",
  },
  {
    term: "Thin content",
    plain:
      "A page with very little text — under about 150 words. A page that says almost nothing gives Google almost nothing to rank, so thin pages rarely show up in results.",
  },
  {
    term: "Image alt text",
    plain:
      "A short written description attached to an image. Screen-reader software speaks it aloud for visually impaired visitors, and Google reads it to understand what the picture shows. Images without it are invisible to both.",
  },
  {
    term: "Social sharing tags (Open Graph)",
    plain:
      "The tags that control the preview card — picture, headline, blurb — when someone pastes your link into Facebook, LinkedIn, Teams, or a text message. Without them the preview comes up blank or ugly, and people click far less.",
  },
  {
    term: "Canonical URL",
    plain:
      "A tag that declares the one official address of a page. The same page can often be reached at slightly different addresses; the canonical tag keeps Google from treating those as competing duplicate pages.",
  },
  {
    term: "Duplicate titles / descriptions",
    plain:
      "Several different pages sharing the same title or blurb. Google can't tell them apart, so they compete with each other and all of them rank worse.",
  },
  {
    term: "Broken internal links",
    plain:
      "Links on your own site that lead to dead pages (a \"404 error\"). Visitors hit a dead end, and Google reads them as a sign the site isn't maintained.",
  },
  {
    term: "Structured data (JSON-LD)",
    plain:
      "Machine-readable facts — business name, address, hours, events — embedded invisibly in the page. It's how Google builds the rich results with stars, maps, and event listings, and how AI assistants confirm facts about your business.",
  },
  {
    term: "Mobile viewport",
    plain:
      "One line of code that tells phones to fit the page to their screen. Without it the page loads zoomed-out and unreadable on mobile, and Google ranks the site down for it.",
  },
  {
    term: "HTTPS",
    plain:
      "The padlock in the address bar — the connection to your site is encrypted. Google marks plain http sites \"not secure\" and ranks them lower.",
  },
  {
    term: "Redirects (http→https, www)",
    plain:
      "Automatic forwarding from the alternate spellings of your address (http://, with or without www) to the one real one. Without it, your site appears to exist at several competing addresses and splits its credit between them.",
  },
  {
    term: "Sitemap.xml",
    plain:
      "A machine-readable table of contents listing every page on the site, so search engines can find all of them instead of only the ones they stumble into.",
  },
  {
    term: "Robots.txt",
    plain:
      "A small file that tells search engines which parts of the site to stay out of (admin screens, search pages, shopping carts).",
  },
  {
    term: "Noindex",
    plain:
      "A tag that tells search engines to leave a page out of their results on purpose — normal for login screens and thank-you pages. These pages are counted but not graded.",
  },
];

/**
 * One-line explainers keyed by per-page check id — shown where a finding
 * appears so the reader never has to look the term up.
 */
export const CHECK_EXPLAINERS: Record<string, string> = {
  title:
    "The title is the clickable blue headline Google shows for the page, and the browser-tab label.",
  meta: "The meta description is the blurb Google shows under the headline — your pitch in the results.",
  h1: "The H1 is the page's main on-page headline; search engines use it to understand the page. Use exactly one.",
  alt: "Alt text describes an image in words, for screen readers and for Google.",
  canonical:
    "The canonical tag declares the page's one official address, so near-identical addresses don't compete.",
  og: "Open Graph tags control the preview card when the link is shared on social media or in Teams.",
  viewport:
    "The viewport tag makes the page fit phone screens; without it the page is zoomed-out on mobile.",
  https:
    "HTTPS is the padlock — an encrypted connection. Google marks plain http as \"not secure\".",
  content:
    "Content depth is how much actual text the page has; pages under ~150 words rarely rank.",
  fetch:
    "The page couldn't be loaded at all — visitors and Google hit an error here.",
};
