/** ?demo=1 (before or after the #) turns on the presenter controls. */
export const demoMode = /[?&]demo=1(?:&|$|#)/.test(window.location.search + window.location.hash);
