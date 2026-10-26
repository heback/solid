const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const g = require("./grading");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
// 쉼표로 구분한 교사 이메일. 비워 두면 @ts.hs.kr 계정이면 누구나 사용할 수 있다.
const TEACHER_EMAILS = defineString("TEACHER_EMAILS", { default: "" });
initializeApp();
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

async function callGemini(prep) {
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
    return JSON.parse(res.text);
  } catch (e) {
    console.error("gemini 호출 실패", e);
    throw new HttpsError("unavailable", "AI 채점 호출에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
}

// Storage에 올라간 제출 파일을 채점하고 결과를 Firestore에 기록한다.
exports.gradeSubmission = onCall(
  { region: "asia-northeast3", secrets: [GEMINI_API_KEY], timeoutSeconds: 180, memory: "512MiB", maxInstances: 10 },
  async req => {
    checkCaller(req.auth);
    const id = String(req.data?.id || "");
    if (!/^[\w.-]{1,120}$/.test(id)) throw new HttpsError("invalid-argument", "잘못된 제출 번호입니다.");
    const ref = getFirestore().collection("submissions").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "제출 기록이 없습니다.");
    const path = snap.get("storagePath");
    if (typeof path !== "string" || !path.startsWith("submissions/")) throw new HttpsError("failed-precondition", "파일 경로가 올바르지 않습니다.");

    let worksheet;
    try { worksheet = JSON.parse((await getStorage().bucket().file(path).download())[0].toString("utf8")); }
    catch (e) { throw new HttpsError("failed-precondition", "저장된 파일을 읽지 못했습니다."); }
    if (JSON.stringify(worksheet).length > 400_000) throw new HttpsError("invalid-argument", "파일이 너무 큽니다.");
    let prep;
    try { prep = g.prepare(worksheet); } catch (e) { throw new HttpsError("invalid-argument", e.message); }

    const result = { ...g.assemble(prep, prep.toGrade.length ? await callGemini(prep) : null), model: MODEL };
    const max = result.items.reduce((a, i) => a + i.max, 0);
    const total = max ? Math.round(result.items.reduce((a, i) => a + i.score, 0) / max * 100) : 0;
    await ref.update({ result, total, status: "graded", edited: false, gradedAt: FieldValue.serverTimestamp() });
    return { total };
  }
);
