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

  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString
      .replace(/[()]/g, "")
      .split("-")
      .map(Number);
    return new Date(year, month - 1, day);
  };

  const getDayDifference = (date1: Date, date2: Date): number => {
    const timeDifference = date2.getTime() - date1.getTime();
    return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  };

  /**
   * Formats date to: "Weekday, YYYY-MM-DD"
   * Uses .slice(-2) for compatibility instead of .padStart()
   */
  const formatDate = (date: Date): string => {
    const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
    const year = date.getFullYear();

    // Add a leading zero and take the last two characters
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);

    return `${weekday}, ${year}-${month}-${day}`;
  };

  const pluraliseDays = (days: number): string => (days !== 1 ? "days" : "day");

  const chapters = Array.from(
    document.querySelectorAll<HTMLLIElement>("ol.chapter.index.group li")
  );

  const dateArray: Date[] = chapters
    .map((chapter) => {
      const dateSpan = chapter.querySelector("span.datetime");
      return dateSpan?.textContent
        ? parseDate(dateSpan.textContent.trim())
        : null;
    })
    .filter((date): date is Date => date !== null);

  const now = new Date();

  dateArray.forEach((date, index) => {
    const dateSpan = chapters[index].querySelector("span.datetime");
    if (!dateSpan) return;

    const formattedDate = formatDate(date);
    const updatedDaysAgo = getDayDifference(date, now);

    let previousUpdateText = "";
    if (index > 0) {
      const previousDate = dateArray[index - 1];
      const dayDifference = getDayDifference(previousDate, date);
      previousUpdateText = `, Previous update ${dayDifference} ${pluraliseDays(
        dayDifference
      )} ago`;
    }

    if (!isNaN(updatedDaysAgo)) {
      dateSpan.textContent = `(${formattedDate}, Updated ${updatedDaysAgo} ${pluraliseDays(
        updatedDaysAgo
      )} ago${previousUpdateText})`;
    }
  });

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "nav_success" })
    );
  }
})();
true;
