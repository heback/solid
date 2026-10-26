const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");
const g = require("./grading");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
// 쉼표로 구분한 교사 이메일. 비워 두면 @ts.hs.kr 계정이면 누구나 사용할 수 있다.
const TEACHER_EMAILS = defineString("TEACHER_EMAILS", { default: "" });
const MODEL = "gemini-3.5-flash-lite";
const DOMAIN = "@ts.hs.kr";

function checkCaller(auth) {
  const email = String(auth?.token?.email || "").toLowerCase();
  if (!auth || !auth.token.email_verified || !email.endsWith(DOMAIN)) {
    throw new HttpsError("permission-denied", `${DOMAIN} 계정으로 로그인해야 합니다.`);
  }
  const allow = TEACHER_EMAILS.value().split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(email)) throw new HttpsError("permission-denied", "채점 권한이 없는 계정입니다.");
}

exports.gradeWorksheet = onCall(
  { region: "asia-northeast3", secrets: [GEMINI_API_KEY], timeoutSeconds: 180, memory: "512MiB", maxInstances: 10 },
  async req => {
    checkCaller(req.auth);
    const data = req.data && req.data.worksheet;
    if (JSON.stringify(data || "").length > 400_000) throw new HttpsError("invalid-argument", "파일이 너무 큽니다.");
    let prep;
    try { prep = g.prepare(data); } catch (e) { throw new HttpsError("invalid-argument", e.message); }

    let raw = null;
    if (prep.toGrade.length) {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      try {
        const res = await ai.models.generateContent({
          model: MODEL,
          contents: g.buildPrompt(prep),
          config: {
            systemInstruction: g.SYSTEM,
            responseMimeType: "application/json",
            responseJsonSchema: g.responseSchema(prep),
            thinkingConfig: { thinkingLevel: "MEDIUM" },
          },
        });
        raw = JSON.parse(res.text);
      } catch (e) {
        console.error("gemini 호출 실패", e);
        throw new HttpsError("unavailable", "AI 채점 호출에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
      }
    }
    return { ...g.assemble(prep, raw), model: MODEL };
  }
);
