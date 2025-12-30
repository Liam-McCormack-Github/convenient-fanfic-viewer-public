(() => {
    "use strict";
    const parseDate = (dateString) => {
        const [year, month, day] = dateString
            .replace(/[()]/g, "")
            .split("-")
            .map(Number);
        return new Date(year, month - 1, day);
    };
    const getDayDifference = (date1, date2) => {
        const timeDifference = date2.getTime() - date1.getTime();
        return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    };
    const formatDate = (date) => {
        const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
        const year = date.getFullYear();
        const month = ("0" + (date.getMonth() + 1)).slice(-2);
        const day = ("0" + date.getDate()).slice(-2);
        return `${weekday}, ${year}-${month}-${day}`;
    };
    const pluraliseDays = (days) => (days !== 1 ? "days" : "day");
    const chapters = Array.from(document.querySelectorAll("ol.chapter.index.group li"));
    const dateArray = chapters
        .map((chapter) => {
        const dateSpan = chapter.querySelector("span.datetime");
        return (dateSpan === null || dateSpan === void 0 ? void 0 : dateSpan.textContent)
            ? parseDate(dateSpan.textContent.trim())
            : null;
    })
        .filter((date) => date !== null);
    const now = new Date();
    dateArray.forEach((date, index) => {
        const dateSpan = chapters[index].querySelector("span.datetime");
        if (!dateSpan)
            return;
        const formattedDate = formatDate(date);
        const updatedDaysAgo = getDayDifference(date, now);
        let previousUpdateText = "";
        if (index > 0) {
            const previousDate = dateArray[index - 1];
            const dayDifference = getDayDifference(previousDate, date);
            previousUpdateText = `, Previous update ${dayDifference} ${pluraliseDays(dayDifference)} ago`;
        }
        if (!isNaN(updatedDaysAgo)) {
            dateSpan.textContent = `(${formattedDate}, Updated ${updatedDaysAgo} ${pluraliseDays(updatedDaysAgo)} ago${previousUpdateText})`;
        }
    });
    if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "nav_success" }));
    }
})();
true;
