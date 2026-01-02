(() => {
    "use strict";
    const run = () => {
        const getAO3Metadata = () => {
            var _a, _b, _c;
            const current_url = window.location.href;
            const errorFlash = document.querySelector(".flash.error");
            const is404 = document.querySelector(".error-404");
            if (is404 ||
                (errorFlash &&
                    ((_a = errorFlash.textContent) === null || _a === void 0 ? void 0 : _a.includes("couldn't find the work")))) {
                return { current_url, deleted_on_archive: true };
            }
            const notice = document.querySelector(".notice");
            const isMystery = !!(notice &&
                ((_b = notice.textContent) === null || _b === void 0 ? void 0 : _b.includes("ongoing challenge")) &&
                ((_c = notice.textContent) === null || _c === void 0 ? void 0 : _c.includes("revealed soon")));
            if (isMystery) {
                return { current_url, mystery_work: true };
            }
            const getWorkMeta = () => {
                const workMeta = document.querySelector("dl.work.meta.group");
                if (!workMeta) {
                    throw new Error("workMeta container not found");
                }
                return workMeta;
            };
            const getWorkSkin = () => {
                const workSkin = document.querySelector("#workskin");
                if (!workSkin) {
                    throw new Error("workSkin container not found");
                }
                return workSkin;
            };
            const getTitle = (workSkin) => {
                var _a, _b, _c;
                const title = (_c = (_b = (_a = workSkin.querySelector("h2.title.heading")) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : null;
                if (!title) {
                    throw new Error("title not found");
                }
                return title;
            };
            const getAuthors = (workSkin) => {
                const byline = workSkin.querySelector("h3.byline.heading");
                if (!byline) {
                    throw new Error("byline not found");
                }
                const authors = [];
                byline.childNodes.forEach((node) => {
                    var _a, _b;
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        node.tagName === "A") {
                        const link = node;
                        const name = (_a = link.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                        if (name) {
                            authors.push({ name, url: link.href });
                        }
                    }
                    else if (node.nodeType === Node.TEXT_NODE) {
                        const text = (_b = node.textContent) === null || _b === void 0 ? void 0 : _b.trim();
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
            const getTags = (workMeta, className) => {
                const tags = Array.from(workMeta.querySelectorAll(`dd.${className}.tags a`))
                    .map((a) => { var _a; return (_a = a.textContent) === null || _a === void 0 ? void 0 : _a.trim(); })
                    .filter(Boolean);
                return tags.length > 0 ? tags : null;
            };
            const parseNumber = (text) => {
                if (!text)
                    return null;
                const cleanText = text.replace(/,/g, "").trim();
                const parsed = parseInt(cleanText, 10);
                return isNaN(parsed) ? null : parsed;
            };
            const getOptionalStatsValue = (workMeta, className) => {
                var _a, _b;
                return (((_b = (_a = workMeta.querySelector(`dd.${className}`)) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || null);
            };
            const getStatsValue = (workMeta, className) => {
                var _a, _b;
                const value = (_b = (_a = workMeta
                    .querySelector(`dd.${className}`)) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
                if (!value) {
                    throw new Error(`Critical stat "${className}" not found`);
                }
                return value;
            };
            const getStatsValueNumber = (workMeta, className) => {
                var _a;
                const text = (_a = workMeta.querySelector(`dd.${className}`)) === null || _a === void 0 ? void 0 : _a.textContent;
                if (!text) {
                    throw new Error(`Critical numeric stat "${className}" is missing.`);
                }
                const value = parseNumber(text);
                if (value === null) {
                    throw new Error(`Critical numeric stat "${className}" is invalid.`);
                }
                return value;
            };
            const getOptionalStatsValueNumber = (workMeta, className) => {
                var _a;
                const text = (_a = workMeta.querySelector(`dd.${className}`)) === null || _a === void 0 ? void 0 : _a.textContent;
                if (!text) {
                    return null;
                }
                return parseNumber(text);
            };
            const getChapterStats = (workMeta) => {
                var _a;
                const raw = (_a = workMeta.querySelector("dd.chapters")) === null || _a === void 0 ? void 0 : _a.textContent;
                if (!raw)
                    throw new Error("Chapter stat not found");
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
            const getSummaryOrNotes = (container, selector) => {
                const block = container.querySelector(`${selector} blockquote.userstuff`);
                if (!block)
                    return null;
                return block.innerHTML
                    .replace(/<[^>]*>/g, "")
                    .replace(/^[\n\r]+/, "")
                    .trim();
            };
            const getSeries = (workMeta) => {
                const seriesSpans = Array.from(workMeta.querySelectorAll("dd.series span.series"));
                if (seriesSpans.length === 0)
                    return null;
                const results = seriesSpans.map((span) => {
                    const positionSpan = span.querySelector("span.position");
                    const link = positionSpan === null || positionSpan === void 0 ? void 0 : positionSpan.querySelector("a");
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
                        throw new Error(`Could not parse Part number as integer: "${partMatch[1]}"`);
                    }
                    return {
                        name: link.textContent.trim(),
                        url: link.href,
                        part: partNumber,
                    };
                });
                return results.length > 0 ? results : null;
            };
            const getCollections = (workMeta) => {
                const links = Array.from(workMeta.querySelectorAll("dd.collections a"));
                const results = links.map((a) => {
                    var _a;
                    return ({
                        name: (_a = a.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                        url: a.href,
                    });
                });
                return results.length > 0 ? results : null;
            };
            const getGifts = (workSkin) => {
                const gifts = [];
                const items = Array.from(workSkin.querySelectorAll(".notes.module ul.associations li"));
                items.forEach((li) => {
                    var _a;
                    if ((_a = li.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("for ")) {
                        const links = Array.from(li.querySelectorAll("a[href]"));
                        links.forEach((a) => {
                            var _a;
                            const name = (_a = a.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                            if (!name)
                                throw new Error("Gift section found but recipient name is missing");
                            gifts.push({ name, url: a.href });
                        });
                    }
                });
                return gifts.length > 0 ? gifts : null;
            };
            const getPrompts = (workSkin) => {
                const prompts = [];
                const items = Array.from(workSkin.querySelectorAll(".notes.module ul.associations li"));
                items.forEach((li) => {
                    var _a;
                    const text = li.textContent || "";
                    if (text.toLowerCase().includes("in response to a prompt")) {
                        const promptLink = li.querySelector('a[href*="/prompts/"]');
                        const collectionLink = li.querySelector('a[href^="/collections/"]:not([href*="/prompts/"])');
                        if (promptLink && collectionLink) {
                            const prompters = [];
                            const authorLinks = Array.from(li.querySelectorAll('a[rel="author"], a[href*="/users/"]'));
                            if (authorLinks.length > 0) {
                                authorLinks.forEach((link) => {
                                    var _a;
                                    prompters.push({
                                        name: ((_a = link.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "Unknown",
                                        url: link.href,
                                    });
                                });
                            }
                            if (text.match(/\bby\s+Anonymous\b/i)) {
                                prompters.push({ name: "Anonymous", url: null });
                            }
                            prompts.push({
                                url: promptLink.href,
                                prompters,
                                collection: {
                                    name: ((_a = collectionLink.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "Unknown",
                                    url: collectionLink.href,
                                },
                            });
                        }
                    }
                });
                return prompts.length > 0 ? prompts : null;
            };
            const getInspiredParents = (workSkin) => {
                const inspired = [];
                const items = Array.from(workSkin.querySelectorAll(".notes.module ul.associations li"));
                items.forEach((li) => {
                    const text = (li.textContent || "").trim();
                    if (text.toLowerCase().includes("inspired by")) {
                        const workLink = li.querySelector('a[href*="/works/"], a[href*="/external_works/"]');
                        if (!workLink || !workLink.textContent)
                            return;
                        const work_name = workLink.textContent.trim();
                        const work_url = workLink.href;
                        const authors = [];
                        const authorLinks = Array.from(li.querySelectorAll('a[href*="/users/"]'));
                        if (authorLinks.length > 0) {
                            authorLinks.forEach((link) => {
                                var _a;
                                authors.push({
                                    name: ((_a = link.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "Unknown",
                                    url: link.href,
                                });
                            });
                        }
                        else {
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
            const getInspiredChildren = (workSkin) => {
                const container = workSkin.querySelector("#children");
                if (!container)
                    return null;
                const items = Array.from(container.querySelectorAll("ul li"));
                const results = items.map((li) => {
                    var _a;
                    const workLink = li.querySelector('a[href*="/works/"]');
                    if (!workLink || !workLink.textContent) {
                        throw new Error("Inspired child item found but work link is missing");
                    }
                    const work_name = workLink.textContent.trim();
                    const work_url = workLink.href;
                    const authors = [];
                    const authorLinks = Array.from(li.querySelectorAll('a[href*="/users/"]'));
                    if (authorLinks.length > 0) {
                        authorLinks.forEach((link) => {
                            var _a;
                            authors.push({
                                name: ((_a = link.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "Unknown",
                                url: link.href,
                            });
                        });
                    }
                    else {
                        const fullText = ((_a = li.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "";
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
            const getHidden = (workSkin) => {
                return (workSkin.querySelector('h2.title.heading img[alt="(Restricted)"]') !==
                    null);
            };
            try {
                const workMeta = getWorkMeta();
                const workSkin = getWorkSkin();
                const chapterData = getChapterStats(workMeta);
                const status = getOptionalStatsValue(workMeta, "status");
                const completed = chapterData.chapters === chapterData.expected_chapters;
                const successfulScrape = {
                    current_url,
                    title: getTitle(workSkin),
                    authors: getAuthors(workSkin),
                    hidden: getHidden(workSkin),
                    gifts: getGifts(workSkin),
                    prompts: getPrompts(workSkin),
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
                    language: getStatsValue(workMeta, "language"),
                    published: getStatsValue(workMeta, "published"),
                    chapters: chapterData.chapters,
                    expected_chapters: chapterData.expected_chapters,
                    words: getStatsValueNumber(workMeta, "words"),
                    hits: getStatsValueNumber(workMeta, "hits"),
                    updated: completed === false ? status : null,
                    completed: completed === true ? status : null,
                    kudos: getOptionalStatsValueNumber(workMeta, "kudos"),
                    bookmarks: getOptionalStatsValueNumber(workMeta, "bookmarks"),
                    comments: getOptionalStatsValueNumber(workMeta, "comments"),
                };
                return successfulScrape;
            }
            catch (error) {
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
    }
    else {
        run();
    }
})();
true;
