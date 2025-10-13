export const joinUrl = (...urlParts) => {
    if (!urlParts || urlParts.length === 0) {
        return "";
    }
    const nonEmptyParts = urlParts.filter((part) => part != null && part !== "");
    if (nonEmptyParts.length === 0) {
        return "";
    }
    // Handle the first part separately to preserve protocol
    let firstPart = nonEmptyParts[0];
    const remainingParts = nonEmptyParts.slice(1);
    // Trim trailing slash from the first part, unless it's the only part and just '/' or includes '://'
    if (remainingParts.length > 0 &&
        firstPart.endsWith("/") &&
        firstPart !== "/" &&
        !firstPart.includes("://")) {
        firstPart = firstPart.slice(0, -1);
    }
    else if (firstPart.endsWith("://")) {
        // Avoid trimming if it's just the protocol like 'http://'
        firstPart = firstPart.slice(0, -1); // Keep 'http:/' temporarily
    }
    const processedParts = remainingParts.map((part) => {
        // Trim leading and trailing slashes from middle parts
        return part.replace(/^\/+/, "").replace(/\/+$/, "");
    });
    // REMOVED: // Reconstruct the URL
    const joined = [firstPart, ...processedParts].join("/");
    // Special case: Correct double slashes after protocol if firstPart was only protocol
    // e.g. http:/ + /path -> http://path
    return joined.replace(/(:\/)\/+/g, "$1/");
};
