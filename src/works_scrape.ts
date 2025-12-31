type Series =
  | {
      name: string;
      url: string;
      part: number;
    }[]
  | null;

type Authors = {
  name: string;
  url: string | null;
}[];

type Gifts =
  | {
      name: string;
      url: string;
    }[]
  | null;

type Collections =
  | {
      name: string;
      url: string;
    }[]
  | null;

type InspiredWork = {
  name: string;
  url: string;
  authors: Authors;
};

type InspiredWorks = InspiredWork[] | null;

type Tag = string[] | null;

interface AO3SuccessMetadata {
  current_url: string;
  title: string;

  hidden: boolean;

  language: string;
  authors: Authors;

  gifts: Gifts;

  inspired_parent: InspiredWorks;
  inspired_children: InspiredWorks;

  summary: string | null;
  notes: string | null;

  categories: Tag;
  rating: Tag;
  archive_warnings: Tag;
  fandoms: Tag;
  characters: Tag;
  relationships: Tag;
  additional_tags: Tag;

  series: Series;
  collections: Collections;

  published: string;
  updated: string | null;
  completed: string | null;

  chapters: number;
  expected_chapters: number | null;
  words: number;
  hits: number;
  kudos: number | null;
  bookmarks: number | null;
  comments: number | null;
}

type AO3DeletedMetadata = { current_url: string; deleted_on_archive: true };
type AO3MysteryMetadata = { current_url: string; mystery_work: true };
type AO3ErrorMetadata = { current_url: string; error: string };
type AO3ScrapedMetadata =
  | AO3SuccessMetadata
  | AO3DeletedMetadata
  | AO3MysteryMetadata
  | AO3ErrorMetadata;

// Window interface for React Native WebView
interface Window {
  ReactNativeWebView: {
    postMessage: (message: string) => void;
  };
}

(() => {
  "use strict";

  const run = () => {
    const getAO3Metadata = () => {
      const current_url = window.location.href;

      // Archive-Level Checks (Deleted/Mystery)
      const errorFlash = document.querySelector(".flash.error");
      const is404 = document.querySelector(".error-404");
      if (
        is404 ||
        (errorFlash &&
          errorFlash.textContent?.includes("couldn't find the work"))
      ) {
        return { current_url, deleted_on_archive: true };
      }

      const notice = document.querySelector(".notice");
      const isMystery = !!(
        notice &&
        notice.textContent?.includes("ongoing challenge") &&
        notice.textContent?.includes("revealed soon")
      );
      if (isMystery) {
        return { current_url, mystery_work: true };
      }

      // Modular Extraction Functions
      const getWorkMeta = (): Element => {
        const workMeta = document.querySelector("dl.work.meta.group");
        if (!workMeta) {
          throw new Error("workMeta container not found");
        }
        return workMeta;
      };

      const getWorkSkin = (): Element => {
        const workSkin = document.querySelector("#workskin");
        if (!workSkin) {
          throw new Error("workSkin container not found");
        }
        return workSkin;
      };

      const getTitle = (workSkin: Element): AO3SuccessMetadata["title"] => {
        const title =
          workSkin.querySelector("h2.title.heading")?.textContent?.trim() ??
          null;
        if (!title) {
          throw new Error("title not found");
        }
        return title;
      };

      const getAuthors = (workSkin: Element): AO3SuccessMetadata["authors"] => {
        const byline = workSkin.querySelector("h3.byline.heading");
        if (!byline) {
          throw new Error("byline not found");
        }
        const authors: Authors = [];
        byline.childNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).tagName === "A"
          ) {
            const link = node as HTMLAnchorElement;
            const name = link.textContent?.trim();
            if (name) {
              authors.push({ name, url: link.href });
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text && text !== "," && text.toLowerCase() !== "and") {
              const names = text.split(/, | and /);
              names.forEach((n) => {
                const trimmedName = n.trim();
                if (trimmedName) {
                  authors.push({ name: trimmedName, url: null });
                }
              });
            }
          }
        });
        if (authors.length === 0) {
          throw new Error("author names could not be parsed");
        }
        if (authors.some((a) => !a.name || a.name.length === 0)) {
          throw new Error("one or more author names are empty");
        }
        return authors;
      };

      const getTags = (workMeta: Element, className: string): Tag => {
        const tags = Array.from(
          workMeta.querySelectorAll(`dd.${className}.tags a`)
        )
          .map((a) => a.textContent?.trim())
          .filter(Boolean);
        return tags.length > 0 ? tags : null;
      };

      const parseNumber = (text: string) => {
        if (!text) return null;
        const cleanText = text.replace(/,/g, "").trim();
        const parsed = parseInt(cleanText, 10);
        return isNaN(parsed) ? null : parsed;
      };

      const getOptionalStatsValue = (
        workMeta: Element,
        className: string
      ): string | null => {
        return (
          workMeta.querySelector(`dd.${className}`)?.textContent?.trim() || null
        );
      };

      const getStatsValue = (workMeta: Element, className: string): string => {
        const value = workMeta
          .querySelector(`dd.${className}`)
          ?.textContent?.trim();
        if (!value) {
          throw new Error(`Critical stat "${className}" not found`);
        }
        return value;
      };

      const getStatsValueNumber = (
        workMeta: Element,
        className: string
      ): number => {
        const text = workMeta.querySelector(`dd.${className}`)?.textContent;
        if (!text) {
          throw new Error(`Critical numeric stat "${className}" is missing.`);
        }
        const value = parseNumber(text);
        if (value === null) {
          throw new Error(`Critical numeric stat "${className}" is invalid.`);
        }
        return value;
      };

      const getOptionalStatsValueNumber = (
        workMeta: Element,
        className: string
      ) => {
        const text = workMeta.querySelector(`dd.${className}`)?.textContent;
        if (!text) {
          return null;
        }
        return parseNumber(text);
      };

      const getChapterStats = (
        workMeta: Element
      ): {
        chapters: AO3SuccessMetadata["chapters"];
        expected_chapters: AO3SuccessMetadata["expected_chapters"];
      } => {
        const raw = workMeta.querySelector("dd.chapters")?.textContent;
        if (!raw) throw new Error("Chapter stat not found");
        const parts = raw.split("/");
        if (parts.length !== 2)
          throw new Error(`Unexpected chapter format: ${raw}`);
        const current = parseNumber(parts[0]);
        if (current === null)
          throw new Error(`Could not parse current chapters from: ${parts[0]}`);
        const expectedStr = parts[1].trim();
        const expected = expectedStr === "?" ? null : parseNumber(expectedStr);
        return { chapters: current, expected_chapters: expected };
      };

      const getSummaryOrNotes = (
        container: Element,
        selector: string
      ): string | null => {
        const block = container.querySelector(
          `${selector} blockquote.userstuff`
        );
        if (!block) return null;
        return block.innerHTML
          .replace(/<[^>]*>/g, "")
          .replace(/^[\n\r]+/, "")
          .trim();
      };

      const getSeries = (workMeta: Element): Series => {
        const seriesSpans = Array.from(
          workMeta.querySelectorAll("dd.series span.series")
        );
        if (seriesSpans.length === 0) return null;
        const results = seriesSpans.map((span) => {
          const positionSpan = span.querySelector("span.position");
          const link = positionSpan?.querySelector(
            "a"
          ) as HTMLAnchorElement | null;
          if (!positionSpan || !link || !link.textContent) {
            throw new Error("Could not parse series link or position");
          }
          const text = positionSpan.textContent || "";
          const partMatch = text.match(/Part\s+(\d+)/i);
          if (!partMatch) {
            throw new Error(`Could not find Part number in text: "${text}"`);
          }
          const partNumber = parseNumber(partMatch[1]);
          if (partNumber === null) {
            throw new Error(
              `Could not parse Part number as integer: "${partMatch[1]}"`
            );
          }
          return {
            name: link.textContent.trim(),
            url: link.href,
            part: partNumber,
          };
        });
        return results.length > 0 ? results : null;
      };

      const getCollections = (workMeta: Element): Collections => {
        const links = Array.from(workMeta.querySelectorAll("dd.collections a"));
        const results = links.map((a) => ({
          name: a.textContent?.trim(),
          url: (a as HTMLAnchorElement).href,
        }));
        return results.length > 0 ? results : null;
      };

      const getGifts = (workSkin: Element): Gifts => {
        const gifts: { name: string; url: string }[] = [];
        const items = Array.from(
          workSkin.querySelectorAll(".notes.module ul.associations li")
        );

        items.forEach((li) => {
          if (li.textContent?.toLowerCase().includes("for ")) {
            const links = Array.from(li.querySelectorAll("a[href]"));
            links.forEach((a) => {
              const name = a.textContent?.trim();
              if (!name)
                throw new Error(
                  "Gift section found but recipient name is missing"
                );
              gifts.push({ name, url: (a as HTMLAnchorElement).href });
            });
          }
        });
        return gifts.length > 0 ? gifts : null;
      };

      const getInspiredParents = (workSkin: Element): InspiredWorks => {
        const inspired: InspiredWork[] = [];
        const items = Array.from(
          workSkin.querySelectorAll(".notes.module ul.associations li")
        );

        items.forEach((li) => {
          const text = (li.textContent || "").trim();
          if (text.toLowerCase().includes("inspired by")) {
            // 1. Extract Work Link
            const workLink = li.querySelector(
              'a[href*="/works/"], a[href*="/external_works/"]'
            ) as HTMLAnchorElement | null;

            if (!workLink || !workLink.textContent) return;

            const work_name = workLink.textContent.trim();
            const work_url = workLink.href;

            // 2. Extract Multiple Authors
            const authors: Authors = [];
            const authorLinks = Array.from(
              li.querySelectorAll('a[href*="/users/"]')
            ) as HTMLAnchorElement[];

            if (authorLinks.length > 0) {
              authorLinks.forEach((link) => {
                authors.push({
                  name: link.textContent?.trim() || "Unknown",
                  url: link.href,
                });
              });
            } else {
              // Fallback for "Anonymous" or non-linked authors
              // Format usually: "Inspired by Work Name by AuthorName"
              const cleanText = text.replace(/\s+/g, " ");
              const parts = cleanText.split(/\s+by\s+/i);
              if (parts.length >= 2) {
                const author_name = parts[parts.length - 1]
                  .trim()
                  .replace(/\.$/, "");
                authors.push({ name: author_name, url: null });
              }
            }

            inspired.push({ name: work_name, url: work_url, authors });
          }
        });
        return inspired.length > 0 ? inspired : null;
      };

      const getInspiredChildren = (workSkin: Element): InspiredWorks => {
        const container = workSkin.querySelector("#children");
        if (!container) return null;

        const items = Array.from(container.querySelectorAll("ul li"));
        const results = items.map((li) => {
          const workLink = li.querySelector(
            'a[href*="/works/"]'
          ) as HTMLAnchorElement | null;
          if (!workLink || !workLink.textContent) {
            throw new Error(
              "Inspired child item found but work link is missing"
            );
          }

          const work_name = workLink.textContent.trim();
          const work_url = workLink.href;

          const authors: Authors = [];
          const authorLinks = Array.from(
            li.querySelectorAll('a[href*="/users/"]')
          ) as HTMLAnchorElement[];

          if (authorLinks.length > 0) {
            authorLinks.forEach((link) => {
              authors.push({
                name: link.textContent?.trim() || "Unknown",
                url: link.href,
              });
            });
          } else {
            const fullText = li.textContent?.trim() || "";
            const lastByIndex = fullText.lastIndexOf(" by ");
            if (lastByIndex !== -1) {
              const author_name = fullText.substring(lastByIndex + 4).trim();
              authors.push({ name: author_name, url: null });
            }
          }

          return { name: work_name, url: work_url, authors };
        });

        return results.length > 0 ? results : null;
      };

      const getHidden = (workSkin: Element): boolean => {
        return (
          workSkin.querySelector('h2.title.heading img[alt="(Restricted)"]') !==
          null
        );
      };

      try {
        const workMeta = getWorkMeta();
        const workSkin = getWorkSkin();
        const chapterData = getChapterStats(workMeta);
        const status = getOptionalStatsValue(workMeta, "status");
        const completed =
          chapterData.chapters === chapterData.expected_chapters;

        const successfulScrape: AO3SuccessMetadata = {
          current_url,
          title: getTitle(workSkin),
          authors: getAuthors(workSkin),

          hidden: getHidden(workSkin),

          gifts: getGifts(workSkin),

          inspired_parent: getInspiredParents(workSkin),

          inspired_children: getInspiredChildren(workSkin),

          series: getSeries(workMeta),

          collections: getCollections(workMeta),

          summary: getSummaryOrNotes(workSkin, ".summary"),
          notes: getSummaryOrNotes(workSkin, ".notes"),

          categories: getTags(workMeta, "category"),
          rating: getTags(workMeta, "rating"),
          archive_warnings: getTags(workMeta, "warning"),
          fandoms: getTags(workMeta, "fandom"),
          characters: getTags(workMeta, "character"),
          relationships: getTags(workMeta, "relationship"),
          additional_tags: getTags(workMeta, "freeform"),

          // Required Stats
          language: getStatsValue(workMeta, "language"),
          published: getStatsValue(workMeta, "published"),
          chapters: chapterData.chapters,
          expected_chapters: chapterData.expected_chapters,
          words: getStatsValueNumber(workMeta, "words"),
          hits: getStatsValueNumber(workMeta, "hits"),

          // Optional Stats
          updated: completed === false ? status : null,
          completed: completed === true ? status : null,
          kudos: getOptionalStatsValueNumber(workMeta, "kudos"),
          bookmarks: getOptionalStatsValueNumber(workMeta, "bookmarks"),
          comments: getOptionalStatsValueNumber(workMeta, "comments"),
        };

        return successfulScrape;
      } catch (error: any) {
        return {
          current_url,
          error: error.message || "An unknown scraping error occurred",
        };
      }
    };

    const metadata = getAO3Metadata();
    console.log("AO3 Metadata Captured:", metadata);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(metadata));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
true;
