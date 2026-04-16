const fixStore = new Map();

/**
 * Save AI fix proposals per PR
 */
export const saveFixSuggestions = (prNumber, fixes) => {
  fixStore.set(prNumber, fixes);
};

/**
 * Get fixes for PR
 */
export const getFixSuggestions = (prNumber) => {
  return fixStore.get(prNumber) || [];
};

/**
 * Clear after use
 */
export const clearFixSuggestions = (prNumber) => {
  fixStore.delete(prNumber);
};