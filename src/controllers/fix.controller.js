import { getFixSuggestions } from "../services/fixStore.service.js";
import { applyFixPR } from "../services/applyFix.service.js";

export const applyFixHandler = async (req, res) => {
  try {
    var { prNumber, payload } = req.body;
    console.log('prNumber: ', prNumber);
    console.log('  payload: ', payload);

    var fix = [{prNumber, payload}]
    console.log('fix: ', fix);
    const fixes = getFixSuggestions(prNumber);
    console.log('fixes: ', fixes);

    if (!fixes || fixes.length === 0) {
      return res.status(400).json({
        message: "No AI fixes found for this PR",
      });
    }

    await applyFixPR(prNumber, fixes, payload);

    return res.json({
      message: "✅ AI Fix PR created successfully",
    });
  } catch (error) {
    console.error("Apply Fix Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};