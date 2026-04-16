const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3:latest";

export const generateStructuredReview = async (patch, filename) => {
  const prompt = `
You are a senior software engineer.

Analyze ONLY added lines (+).

Return ONLY JSON:
[
  {
    "file": "${filename}",
    "line": 12,
    "comment": "issue explanation"
  }
]

If no issues, return [].

DIFF:
${patch}
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
    }),
  });

  const data = await response.json();

  return data.response;
};

export const generateFixSuggestions = async (patch, filename) => {
  const prompt = `
You are a senior software engineer.

Analyze ONLY added lines (+) and suggest SAFE fixes.

Return ONLY JSON:

[
  {
    "file": "${filename}",
    "issue": "problem description",
    "fix": "exact improvement",
    "action": "replace|edit|remove"
  }
]

Rules:
- NO full file rewrite
- ONLY safe changes
- NO risky logic changes

If no issues, return [].

DIFF:
${patch}
`;

  const response = await callLLM(prompt);
  return safeParseJSON(response);
};