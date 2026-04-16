export const extractJSON = (text) => {
  try {
    const match = text.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!match) return [];

    return JSON.parse(match[0]);
  } catch {
    return [];
  }
};