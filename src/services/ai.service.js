// ================================
// CONFIG
// ================================
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "llama3:latest";
const BASE_RULES = `
You are a STAFF-LEVEL software engineer performing strict pull request review.

ABSOLUTE RULES:
- You MUST ONLY report real issues in the code diff.
- DO NOT suggest console.log, debugging logs, or temporary logging code.
- Treat console.log, print, debug statements as BAD PRACTICE unless explicitly required for production error handling.
- DO NOT suggest "testing code", "debugging code", or temporary fixes.
- DO NOT approve code that contains var, console.log, or unsafe patterns.

STRICT DETECTION RULES:
Flag as issues:
- usage of var
- console.log / debug / print statements
- insecure patterns
- logic bugs
- performance issues

IGNORE:
- styling opinions
- formatting unless breaking logic

OUTPUT RULES:
- Return ONLY valid JSON
- No explanations
- No markdown
- No text outside JSON
`;

// ================================
// SINGLE AI GATEWAY
// ================================
const callLLM = async (prompt) => {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
};

// ================================
// SAFE JSON PARSER (IMPORTANT)
// ================================
export const safeParseJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    // fallback: try to extract JSON block
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      return JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
};

// ================================
// 1. STRUCTURED PR REVIEW
// ================================
export const generateStructuredReview = async (patch, filename) => {
const prompt = `
${BASE_RULES}

You are reviewing a GitHub pull request diff.

STRICT RULE:
You MUST only comment on lines that start with "+" (added lines).

Return ONLY JSON array.

Each comment MUST include:

{
  "file": "${filename}",
  "lineText": "exact added line text",
  "comment": "issue explanation"
}

RULES:
- Do NOT guess line numbers
- Use ONLY the exact added line content
- If multiple issues exist, create multiple entries
- If no issues, return []

FOCUS ON:
- var usage
- console.log usage
- unsafe logic
- missing null checks
- security issues

DIFF:
${patch}
`;

  const response = await callLLM(prompt);
  return safeParseJSON(response);
};

// ================================
// 2. FIX SUGGESTIONS (SINGLE FILE)
// ================================
export const generateFixSuggestions = async (patch, filename) => {
  const prompt = `
  ${BASE_RULES}
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

// ================================
// 3. MULTI-FILE REFACTOR ENGINE
// ================================
export const generateMultiFileFix = async (files) => {
  const combinedDiff = files
    .map((f) => `FILE: ${f.filename}\n${f.patch}`)
    .join("\n\n");

  const prompt = `
  ${BASE_RULES}
You are a senior software engineer.

Analyze multi-file git diff.

Return ONLY JSON:

[
  {
    "file": "file.js",
    "changes": [
      {
        "search": "var user =",
        "replace": "const user ="
      }
    ]
  }
]

Rules:
- Multi-file awareness
- SAFE changes only
- No full rewrites
- Keep consistency between files

DIFF:
${combinedDiff}
`;

  const response = await callLLM(prompt);
  return safeParseJSON(response);
};