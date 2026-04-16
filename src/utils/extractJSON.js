export const extractJSON = (text) => {
  try {
    const match = text.match(/\[\s*{[\s\S]*}\s*\]/);
    console.log('match: ', match);
    if (!match) return [];

    console.log('JSON.parse(match[0]);: ', JSON.parse(match[0]));
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
};