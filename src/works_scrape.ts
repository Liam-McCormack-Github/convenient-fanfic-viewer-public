type NameUrlPair = {
  name: string;
  url: string;
} | null;

type WorkAndAuthor = {
  work: NameUrlPair;
  author: NameUrlPair[];
  external: boolean;
} | null;

type SeriesInfo = {
  name: string;
  url: string;
  part: string;
} | null;

interface AO3SuccessMetadata {
  type: "success";

  current_url: string;
  title: string;
  language: string;

  authors: NameUrlPair[] | null;
  gifts: NameUrlPair[] | null;
  collections: NameUrlPair[] | null;

  inspired_by_parent: WorkAndAuthor[] | null;
  inspired_works_children: WorkAndAuthor[] | null;

  summary: string | null;

  categories: string[] | null;
  rating: string[] | null;
  archive_warnings: string[] | null;
  fandoms: string[] | null;
  characters: string[] | null;
  relationships: string[] | null;
  additional_tags: string[] | null;

  series: SeriesInfo[] | null;

  stats: Record<string, string> | null;

  hidden: boolean;
}

type AO3DeletedMetadata = { current_url: string; deleted_on_archive: true };
type AO3MysteryMetadata = { current_url: string; mystery_work: true };
type AO3ErrorMetadata = { current_url: string; error: string };
type AO3Metadata =
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
    const getAO3Metadata = (): AO3Metadata => {
      const current_url = window.location.href;

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

      const workMeta = document.querySelector("dl.work.meta.group");
      const workSkin = document.querySelector("#workskin");
      if (!workMeta || !workSkin) {
        return { current_url, error: "Metadata container not found" };
      }

      const extractText = (
        sel: string,
        ctx: ParentNode = document
      ): string | null => ctx.querySelector(sel)?.textContent?.trim() || null;

      const extractTexts = (
        sel: string,
        ctx: ParentNode = document
      ): string[] | null => {
        const results = Array.from(ctx.querySelectorAll(sel))
          .map((el) => el.textContent?.trim() || "")
          .filter(Boolean);
        return results.length > 0 ? results : null;
      };

      const extractNameUrlPairs = (
        sel: string,
        ctx: ParentNode = document
      ): NameUrlPair[] | null => {
        const results = Array.from(ctx.querySelectorAll(sel))
          .map((el) => {
            const anchor = el as HTMLAnchorElement;
            const name = anchor.textContent?.trim();
            const url = anchor.href;
            return name && url ? { name, url } : null;
          })
          .filter((item): item is NonNullable<NameUrlPair> => item !== null);
        return results.length > 0 ? results : null;
      };

      const getWorkAndAuthor = (li: HTMLLIElement): WorkAndAuthor => {
        const workLink = li.querySelector<HTMLAnchorElement>(
          'a[href*="/works/"], a[href*="/external_works/"]'
        );
        const authorLink =
          li.querySelector<HTMLAnchorElement>('a[href*="/users/"]');

        if (!workLink || !workLink.textContent || !workLink.href) return null;

        const isExternal = workLink.href.includes("external_works");

        let authorName = "Anonymous";
        let authorUrl = "";

        if (authorLink && authorLink.textContent) {
          authorName = authorLink.textContent.trim();
          authorUrl = authorLink.href;
        } else if (li.textContent?.includes(" by ")) {
          authorName = li.textContent
            .split(" by ")
            .pop()!
            .trim()
            .replace(/\.$/, "");
        }

        return {
          work: {
            name: workLink.textContent.trim(),
            url: workLink.href,
          },
          author: authorUrl ? { name: authorName, url: authorUrl } : null,
          external: isExternal,
        };
      };

      const extractAssociations = () => {
        const gifts: NameUrlPair[] = [];
        const inspired: WorkAndAuthor[] = [];
        const items = workSkin.querySelectorAll<HTMLLIElement>(
          ".notes.module ul.associations li"
        );

        items.forEach((li) => {
          const text = li.textContent?.toLowerCase() || "";
          if (text.includes("inspired by")) {
            const item = getWorkAndAuthor(li);
            if (item) inspired.push(item);
          } else if (text.includes("for ")) {
            const recipients = Array.from(
              li.querySelectorAll<HTMLAnchorElement>('a[href*="/users/"]')
            )
              .map((a) => {
                const name = a.textContent?.trim();
                const url = a.href;
                return name && url ? { name, url } : null;
              })
              .filter((r): r is NonNullable<NameUrlPair> => r !== null);
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
            const pos = span.querySelector(".position");
            if (!pos) return null;
            const link = pos.querySelector<HTMLAnchorElement>("a");
            const partMatch = pos.textContent?.trim().match(/Part (\d+)/i);
            const name = link?.textContent?.trim();
            const url = link
              ? `https://archiveofourown.org${link.getAttribute("href")}`
              : null;
            const part = partMatch ? partMatch[1] : null;

            if (name && url && part) {
              return { name, url, part };
            }
            return null;
          })
          .filter((item): item is NonNullable<SeriesInfo> => item !== null);
        return results.length > 0 ? results : null;
      };

      const extractStats = (): Record<string, string> | null => {
        const stats: Record<string, string> = {};
        const elements = workMeta.querySelectorAll("dl.stats dt, dl.stats dd");
        if (elements.length === 0) return null;
        for (let i = 0; i < elements.length; i += 2) {
          const key = elements[i].textContent
            ?.replace(":", "")
            .trim()
            .toLowerCase();
          const value = elements[i + 1]?.textContent?.trim();
          if (key && value) stats[key] = value;
        }
        return Object.keys(stats).length > 0 ? stats : null;
      };

      const associations = extractAssociations();
      const isRestricted =
        workSkin.querySelector('h2.title.heading img[alt="(Restricted)"]') !==
        null;
      const title = extractText("h2.title.heading", workSkin);
      const language = extractText("dd.language", workMeta);

      if (!title) return { current_url, error: "no title found" };
      if (!language) return { current_url, error: "no language found" };

      // Case 4: Success
      return {
        type: "success",
        current_url,
        title,
        language,
        authors: extractNameUrlPairs(
          'h3.byline.heading a[rel="author"]',
          workSkin
        ),
        gifts: associations.gifts,
        inspired_by_parent: associations.inspired_by_parent,
        inspired_works_children: ((): WorkAndAuthor[] | null => {
          const items = Array.from(
            document.querySelectorAll<HTMLLIElement>("#children ul li")
          );
          const results = items
            .map((li) => getWorkAndAuthor(li))
            .filter((i): i is NonNullable<WorkAndAuthor> => i !== null);
          return results.length > 0 ? results : null;
        })(),
        summary: extractText("blockquote.userstuff", workSkin),
        categories: extractTexts("dd.category.tags a", workMeta),
        rating: extractTexts("dd.rating.tags a", workMeta),
        archive_warnings: extractTexts("dd.warning.tags a", workMeta),
        fandoms: extractTexts("dd.fandom.tags a", workMeta),
        characters: extractTexts("dd.character.tags a", workMeta),
        relationships: extractTexts("dd.relationship.tags a", workMeta),
        additional_tags: extractTexts("dd.freeform.tags a", workMeta),
        series: extractSeries(),
        collections: extractNameUrlPairs("dd.collections a", workMeta),
        stats: extractStats(),
        hidden: isRestricted,
      };
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
