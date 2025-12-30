(() => {
  "use strict";
  const run = () => {
    const getAO3Metadata = () => {
      var _a, _b, _c;
      const current_url = window.location.href;
      const errorFlash = document.querySelector(".flash.error");
      const is404 = document.querySelector(".error-404");
      if (
        is404 ||
        (errorFlash &&
          ((_a = errorFlash.textContent) === null || _a === void 0
            ? void 0
            : _a.includes("couldn't find the work")))
      ) {
        return { current_url, deleted_on_archive: true };
      }
      const notice = document.querySelector(".notice");
      const isMystery = !!(
        notice &&
        ((_b = notice.textContent) === null || _b === void 0
          ? void 0
          : _b.includes("ongoing challenge")) &&
        ((_c = notice.textContent) === null || _c === void 0
          ? void 0
          : _c.includes("revealed soon"))
      );
      if (isMystery) {
        return { current_url, mystery_work: true };
      }
      const workMeta = document.querySelector("dl.work.meta.group");
      const workSkin = document.querySelector("#workskin");
      if (!workMeta || !workSkin) {
        return { current_url, error: "Metadata container not found" };
      }
      const extractText = (sel, ctx = document) => {
        var _a, _b;
        return (
          ((_b =
            (_a = ctx.querySelector(sel)) === null || _a === void 0
              ? void 0
              : _a.textContent) === null || _b === void 0
            ? void 0
            : _b.trim()) || null
        );
      };
      const extractTexts = (sel, ctx = document) => {
        const results = Array.from(ctx.querySelectorAll(sel))
          .map((el) => {
            var _a;
            return (
              ((_a = el.textContent) === null || _a === void 0
                ? void 0
                : _a.trim()) || ""
            );
          })
          .filter(Boolean);
        return results.length > 0 ? results : null;
      };
      const extractNameUrlPairs = (sel, ctx = document) => {
        const results = Array.from(ctx.querySelectorAll(sel))
          .map((el) => {
            var _a;
            const anchor = el;
            const name =
              (_a = anchor.textContent) === null || _a === void 0
                ? void 0
                : _a.trim();
            const url = anchor.href;
            return name && url ? { name, url } : null;
          })
          .filter((item) => item !== null);
        return results.length > 0 ? results : null;
      };
      const getWorkAndAuthor = (li) => {
        var _a;
        const workLink = li.querySelector(
          'a[href*="/works/"], a[href*="/external_works/"]'
        );
        const authorLink = li.querySelector('a[href*="/users/"]');
        if (!workLink || !workLink.textContent || !workLink.href) return null;
        const isExternal = workLink.href.includes("external_works");
        let authorName = "Anonymous";
        let authorUrl = "";
        if (authorLink && authorLink.textContent) {
          authorName = authorLink.textContent.trim();
          authorUrl = authorLink.href;
        } else if (
          (_a = li.textContent) === null || _a === void 0
            ? void 0
            : _a.includes(" by ")
        ) {
          authorName = li.textContent
            .split(" by ")
            .pop()
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
        const gifts = [];
        const inspired = [];
        const items = workSkin.querySelectorAll(
          ".notes.module ul.associations li"
        );
        items.forEach((li) => {
          var _a;
          const text =
            ((_a = li.textContent) === null || _a === void 0
              ? void 0
              : _a.toLowerCase()) || "";
          if (text.includes("inspired by")) {
            const item = getWorkAndAuthor(li);
            if (item) inspired.push(item);
          } else if (text.includes("for ")) {
            const recipients = Array.from(
              li.querySelectorAll('a[href*="/users/"]')
            )
              .map((a) => {
                var _a;
                const name =
                  (_a = a.textContent) === null || _a === void 0
                    ? void 0
                    : _a.trim();
                const url = a.href;
                return name && url ? { name, url } : null;
              })
              .filter((r) => r !== null);
            gifts.push(...recipients);
          }
        });
        return {
          gifts: gifts.length > 0 ? gifts : null,
          inspired_by_parent: inspired.length > 0 ? inspired : null,
        };
      };
      const extractSeries = () => {
        const seriesDd = workMeta.querySelector("dd.series");
        if (!seriesDd) return null;
        const seriesSpans = seriesDd.querySelectorAll("span.series");
        const results = Array.from(seriesSpans)
          .map((span) => {
            var _a, _b;
            const pos = span.querySelector(".position");
            if (!pos) return null;
            const link = pos.querySelector("a");
            const partMatch =
              (_a = pos.textContent) === null || _a === void 0
                ? void 0
                : _a.trim().match(/Part (\d+)/i);
            const name =
              (_b =
                link === null || link === void 0
                  ? void 0
                  : link.textContent) === null || _b === void 0
                ? void 0
                : _b.trim();
            const url = link
              ? `https://archiveofourown.org${link.getAttribute("href")}`
              : null;
            const part = partMatch ? partMatch[1] : null;
            if (name && url && part) {
              return { name, url, part };
            }
            return null;
          })
          .filter((item) => item !== null);
        return results.length > 0 ? results : null;
      };
      const extractStats = () => {
        var _a, _b, _c;
        const stats = {};
        const elements = workMeta.querySelectorAll("dl.stats dt, dl.stats dd");
        if (elements.length === 0) return null;
        for (let i = 0; i < elements.length; i += 2) {
          const key =
            (_a = elements[i].textContent) === null || _a === void 0
              ? void 0
              : _a.replace(":", "").trim().toLowerCase();
          const value =
            (_c =
              (_b = elements[i + 1]) === null || _b === void 0
                ? void 0
                : _b.textContent) === null || _c === void 0
              ? void 0
              : _c.trim();
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
        inspired_works_children: (() => {
          const items = Array.from(
            document.querySelectorAll("#children ul li")
          );
          const results = items
            .map((li) => getWorkAndAuthor(li))
            .filter((i) => i !== null);
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
    // console.log("AO3 Metadata Captured:", metadata);
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
