/** * Types for the AO3 Metadata object
 */
interface NameUrlPair {
  name: string | null;
  url: string | null;
}

interface Recipient {
  recipient_name: string | null;
  recipient_url: string | null;
}

interface WorkAndAuthor {
  work_title: string | null;
  work_url: string | null;
  external: boolean;
  author: string;
  author_url: string | null;
}

interface SeriesInfo {
  name: string | null;
  url: string | null;
  part: string | null;
}

interface AO3Metadata {
  title?: string | null;
  authors?: NameUrlPair[] | null;
  gifts?: Recipient[] | null;
  inspired_by_parent?: WorkAndAuthor[] | null;
  inspired_works_children?: WorkAndAuthor[] | null;
  summary?: string | null;
  categories?: string[] | null;
  language?: string | null;
  rating?: string[] | null;
  archive_warnings?: string[] | null;
  fandoms?: string[] | null;
  characters?: string[] | null;
  relationships?: string[] | null;
  additional_tags?: string[] | null;
  current_url: string;
  series?: SeriesInfo[] | null;
  collections?: NameUrlPair[] | null;
  stats?: Record<string, string> | null;
  hidden?: boolean;
  deleted_on_archive?: boolean;
  mystery_work?: boolean;
  error?: string;
}

/**
 * Extend the Window interface for React Native WebView
 */
interface Window {
  ReactNativeWebView: {
    postMessage: (message: string) => void;
  };
}

(() => {
  "use strict";

  const getAO3Metadata = (): AO3Metadata => {
    const errorFlash = document.querySelector(".flash.error");
    const is404 = document.querySelector(".error-404");

    if (
      is404 ||
      (errorFlash && errorFlash.textContent?.includes("couldn't find the work"))
    ) {
      return {
        current_url: window.location.href,
        deleted_on_archive: true,
      };
    }

    const notice = document.querySelector(".notice");
    const isMystery = !!(
      notice &&
      notice.textContent?.includes("ongoing challenge") &&
      notice.textContent?.includes("revealed soon")
    );

    if (isMystery) {
      return {
        current_url: window.location.href,
        mystery_work: true,
      };
    }

    const workMeta = document.querySelector("dl.work.meta.group");
    const workSkin = document.querySelector("#workskin");

    if (!workMeta || !workSkin) {
      return {
        current_url: window.location.href,
        error: "Metadata container not found",
      };
    }

    // Helper: Extract single text value
    const extractText = (
      sel: string,
      ctx: ParentNode = document
    ): string | null => ctx.querySelector(sel)?.textContent?.trim() || null;

    // Helper: Extract array of strings
    const extractTexts = (
      sel: string,
      ctx: ParentNode = document
    ): string[] | null => {
      const results = Array.from(ctx.querySelectorAll(sel))
        .map((el) => el.textContent?.trim() || "")
        .filter(Boolean);
      return results.length > 0 ? results : null;
    };

    // Helper: Extract name and href pairs
    const extractNameUrlPairs = (
      sel: string,
      ctx: ParentNode = document
    ): NameUrlPair[] | null => {
      const results = Array.from(ctx.querySelectorAll(sel)).map((el) => {
        const anchor = el as HTMLAnchorElement;
        return {
          name: anchor.textContent?.trim() || null,
          url: anchor.href || null,
        };
      });
      return results.length > 0 ? results : null;
    };

    const getWorkAndAuthor = (li: HTMLLIElement): WorkAndAuthor => {
      const workLink = li.querySelector<HTMLAnchorElement>(
        'a[href*="/works/"], a[href*="/external_works/"]'
      );
      const authorLink =
        li.querySelector<HTMLAnchorElement>('a[href*="/users/"]');
      const isExternal = workLink
        ? workLink.href.includes("external_works")
        : false;

      let authorName = "Anonymous";
      let authorUrl: string | null = null;

      if (authorLink) {
        authorName = authorLink.textContent?.trim() || "Anonymous";
        authorUrl = authorLink.href;
      } else if (li.textContent?.includes(" by ")) {
        authorName = li.textContent
          .split(" by ")
          .pop()!
          .trim()
          .replace(/\.$/, "");
      }

      return {
        work_title: workLink ? workLink.textContent?.trim() || null : null,
        work_url: workLink ? workLink.href : null,
        external: isExternal,
        author: authorName,
        author_url: authorUrl,
      };
    };

    const extractAssociations = () => {
      const gifts: Recipient[] = [];
      const inspired: WorkAndAuthor[] = [];
      const items = workSkin.querySelectorAll<HTMLLIElement>(
        ".notes.module ul.associations li"
      );

      items.forEach((li) => {
        const text = li.textContent?.toLowerCase() || "";
        if (text.includes("inspired by")) {
          inspired.push(getWorkAndAuthor(li));
        } else if (text.includes("for ")) {
          const recipients = Array.from(
            li.querySelectorAll<HTMLAnchorElement>('a[href*="/users/"]')
          ).map((a) => ({
            recipient_name: a.textContent?.trim() || null,
            recipient_url: a.href,
          }));
          gifts.push(...recipients);
        }
      });
      return {
        gifts: gifts.length > 0 ? gifts : null,
        inspired_by_parent: inspired.length > 0 ? inspired : null,
      };
    };

    const extractSeries = (): SeriesInfo[] | null => {
      const seriesDd = workMeta.querySelector("dd.series");
      if (!seriesDd) return null;

      const seriesSpans = seriesDd.querySelectorAll("span.series");
      const results = Array.from(seriesSpans)
        .map((span) => {
          const positionContainer = span.querySelector(".position");
          if (!positionContainer) return null;

          const seriesLink =
            positionContainer.querySelector<HTMLAnchorElement>("a");
          const fullText = positionContainer.textContent?.trim() || "";
          const partMatch = fullText.match(/Part (\d+)/i);

          return {
            name: seriesLink ? seriesLink.textContent?.trim() || null : null,
            url: seriesLink
              ? `https://archiveofourown.org${seriesLink.getAttribute("href")}`
              : null,
            part: partMatch ? partMatch[1] : null,
          };
        })
        .filter((item): item is SeriesInfo => item !== null);

      return results.length > 0 ? results : null;
    };

    const extractStats = (): Record<string, string> | null => {
      const stats: Record<string, string> = {};
      const statsElements = workMeta.querySelectorAll(
        "dl.stats dt, dl.stats dd"
      );
      if (statsElements.length === 0) return null;

      for (let i = 0; i < statsElements.length; i += 2) {
        const key = statsElements[i].textContent
          ?.replace(":", "")
          .trim()
          .toLowerCase();
        const value = statsElements[i + 1]?.textContent?.trim();

        if (key && value) {
          stats[key] = value;
        }
      }
      return Object.keys(stats).length > 0 ? stats : null;
    };

    const getInspiredWorksChildren = (): WorkAndAuthor[] | null => {
      const items = Array.from(
        document.querySelectorAll<HTMLLIElement>("#children ul li")
      );
      return items.length > 0 ? items.map((li) => getWorkAndAuthor(li)) : null;
    };

    const associations = extractAssociations();
    const isRestricted =
      workSkin.querySelector('h2.title.heading img[alt="(Restricted)"]') !==
      null;

    return {
      title: extractText("h2.title.heading", workSkin),
      authors: extractNameUrlPairs(
        'h3.byline.heading a[rel="author"]',
        workSkin
      ),
      gifts: associations.gifts,
      inspired_by_parent: associations.inspired_by_parent,
      inspired_works_children: getInspiredWorksChildren(),
      summary: extractText("blockquote.userstuff", workSkin),
      categories: extractTexts("dd.category.tags a", workMeta),
      language: extractText("dd.language", workMeta),
      rating: extractTexts("dd.rating.tags a", workMeta),
      archive_warnings: extractTexts("dd.warning.tags a", workMeta),
      fandoms: extractTexts("dd.fandom.tags a", workMeta),
      characters: extractTexts("dd.character.tags a", workMeta),
      relationships: extractTexts("dd.relationship.tags a", workMeta),
      additional_tags: extractTexts("dd.freeform.tags a", workMeta),
      current_url: window.location.href,
      series: extractSeries(),
      collections: extractNameUrlPairs("dd.collections a", workMeta),
      stats: extractStats(),
      hidden: isRestricted,
      deleted_on_archive: false,
      mystery_work: false,
    };
  };

  const metadata = getAO3Metadata();
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(metadata));
  }
})();
