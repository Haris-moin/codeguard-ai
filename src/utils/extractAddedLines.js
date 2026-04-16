export const extractAddedLines = (patch) => {
  const added = [];
  const lines = patch.split("\n");

  let lineNumber = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)/);
      lineNumber = match ? parseInt(match[1], 10) - 1 : 0;
      console.log('lineNumber: ', lineNumber);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      lineNumber++;
      added.push({
        line: lineNumber,
        code: line.replace("+", ""),
      });
    } else if (!line.startsWith("-")) {
      lineNumber++;
    }
  }

  return added;
};