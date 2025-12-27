(() => {
    "use strict";
    const getAO3Metadata = () => {
        var _a, _b, _c;
        const errorFlash = document.querySelector(".flash.error");
        const is404 = document.querySelector(".error-404");
        if (is404 ||
            (errorFlash && ((_a = errorFlash.textContent) === null || _a === void 0 ? void 0 : _a.includes("couldn't find the work")))) {
            return {
                current_url: window.location.href,
                deleted_on_archive: true,
            };
        }
        const notice = document.querySelector(".notice");
        const isMystery = !!(notice &&
            ((_b = notice.textContent) === null || _b === void 0 ? void 0 : _b.includes("ongoing challenge")) &&
            ((_c = notice.textContent) === null || _c === void 0 ? void 0 : _c.includes("revealed soon")));
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
        const extractText = (sel, ctx = document) => { var _a, _b; return ((_b = (_a = ctx.querySelector(sel)) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || null; };
        const extractTexts = (sel, ctx = document) => {
            const results = Array.from(ctx.querySelectorAll(sel))
                .map((el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ""; })
                .filter(Boolean);
            return results.length > 0 ? results : null;
        };
        const extractNameUrlPairs = (sel, ctx = document) => {
            const results = Array.from(ctx.querySelectorAll(sel)).map((el) => {
                var _a;
                const anchor = el;
                return {
                    name: ((_a = anchor.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                    url: anchor.href || null,
                };
            });
            return results.length > 0 ? results : null;
        };
        const getWorkAndAuthor = (li) => {
            var _a, _b, _c;
            const workLink = li.querySelector('a[href*="/works/"], a[href*="/external_works/"]');
            const authorLink = li.querySelector('a[href*="/users/"]');
            const isExternal = workLink
                ? workLink.href.includes("external_works")
                : false;
            let authorName = "Anonymous";
            let authorUrl = null;
            if (authorLink) {
                authorName = ((_a = authorLink.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "Anonymous";
                authorUrl = authorLink.href;
            }
            else if ((_b = li.textContent) === null || _b === void 0 ? void 0 : _b.includes(" by ")) {
                authorName = li.textContent
                    .split(" by ")
                    .pop()
                    .trim()
                    .replace(/\.$/, "");
            }
            return {
                work_title: workLink ? ((_c = workLink.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || null : null,
                work_url: workLink ? workLink.href : null,
                external: isExternal,
                author: authorName,
                author_url: authorUrl,
            };
        };
        const extractAssociations = () => {
            const gifts = [];
            const inspired = [];
            const items = workSkin.querySelectorAll(".notes.module ul.associations li");
            items.forEach((li) => {
                var _a;
                const text = ((_a = li.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                if (text.includes("inspired by")) {
                    inspired.push(getWorkAndAuthor(li));
                }
                else if (text.includes("for ")) {
                    const recipients = Array.from(li.querySelectorAll('a[href*="/users/"]')).map((a) => {
                        var _a;
                        return ({
                            recipient_name: ((_a = a.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                            recipient_url: a.href,
                        });
                    });
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
            if (!seriesDd)
                return null;
            const seriesSpans = seriesDd.querySelectorAll("span.series");
            const results = Array.from(seriesSpans)
                .map((span) => {
                var _a, _b;
                const positionContainer = span.querySelector(".position");
                if (!positionContainer)
                    return null;
                const seriesLink = positionContainer.querySelector("a");
                const fullText = ((_a = positionContainer.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "";
                const partMatch = fullText.match(/Part (\d+)/i);
                return {
                    name: seriesLink ? ((_b = seriesLink.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || null : null,
                    url: seriesLink
                        ? `https://archiveofourown.org${seriesLink.getAttribute("href")}`
                        : null,
                    part: partMatch ? partMatch[1] : null,
                };
            })
                .filter((item) => item !== null);
            return results.length > 0 ? results : null;
        };
        const extractStats = () => {
            var _a, _b, _c;
            const stats = {};
            const statsElements = workMeta.querySelectorAll("dl.stats dt, dl.stats dd");
            if (statsElements.length === 0)
                return null;
            for (let i = 0; i < statsElements.length; i += 2) {
                const key = (_a = statsElements[i].textContent) === null || _a === void 0 ? void 0 : _a.replace(":", "").trim().toLowerCase();
                const value = (_c = (_b = statsElements[i + 1]) === null || _b === void 0 ? void 0 : _b.textContent) === null || _c === void 0 ? void 0 : _c.trim();
                if (key && value) {
                    stats[key] = value;
                }
            }
            return Object.keys(stats).length > 0 ? stats : null;
        };
        const getInspiredWorksChildren = () => {
            const items = Array.from(document.querySelectorAll("#children ul li"));
            return items.length > 0 ? items.map((li) => getWorkAndAuthor(li)) : null;
        };
        const associations = extractAssociations();
        const isRestricted = workSkin.querySelector('h2.title.heading img[alt="(Restricted)"]') !==
            null;
        return {
            title: extractText("h2.title.heading", workSkin),
            authors: extractNameUrlPairs('h3.byline.heading a[rel="author"]', workSkin),
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
