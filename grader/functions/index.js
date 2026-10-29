const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const g = require("./grading");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
// 쉼표로 구분한 교사 이메일. 비워 두면 교사 기능은 아무도 쓸 수 없다.
const TEACHER_EMAILS = defineString("TEACHER_EMAILS", { default: "" });
initializeApp();
const MODEL = "gemini-3.5-flash-lite";
const DOMAIN = "@ts.hs.kr";
const REGION = "asia-northeast3";
const MAX_FILE = 400_000;

const emailOf = auth => String(auth?.token?.email || "").toLowerCase();
function checkSchool(auth) {
  if (!auth || !auth.token.email_verified || !emailOf(auth).endsWith(DOMAIN)) {
    throw new HttpsError("permission-denied", `${DOMAIN} 계정으로 로그인해야 합니다.`);
  }
}
function checkTeacher(auth) {
  checkSchool(auth);
  const allow = TEACHER_EMAILS.value().split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allow.includes(emailOf(auth))) throw new HttpsError("permission-denied", "교사 권한이 없는 계정입니다.");
}
const checkUid = uid => {
  if (typeof uid !== "string" || !/^[\w-]{1,128}$/.test(uid)) throw new HttpsError("invalid-argument", "잘못된 학생 번호입니다.");
  return uid;
};
const col = n => getFirestore().collection(n);

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

async function readFile(sub) {
  try { return (await getStorage().bucket().file(sub.storagePath).download())[0].toString("utf8"); }
  catch (e) { throw new HttpsError("failed-precondition", "저장된 답안 파일을 읽지 못했습니다."); }
}

// [학생] 답안 JSON 제출. 다시 제출하면 파일을 덮어쓰고 이전 채점 결과·전송한 피드백을 지운다.
exports.submitExam = onCall({ region: REGION, memory: "256MiB", maxInstances: 10 }, async req => {
  checkSchool(req.auth);
  const content = req.data?.content, fileName = String(req.data?.fileName || "답안.json").slice(0, 120);
  if (typeof content !== "string" || !content.length || content.length > MAX_FILE) throw new HttpsError("invalid-argument", "파일이 비어 있거나 너무 큽니다.");
  let student;
  try { student = g.validateSubmission(JSON.parse(content)); }
  catch (e) { throw new HttpsError("invalid-argument", e instanceof SyntaxError ? "JSON 형식이 올바르지 않습니다." : e.message); }

  const uid = req.auth.uid, path = `exam/${uid}.json`;
  await getStorage().bucket().file(path).save(content, { contentType: "application/json" });
  const ref = col("exam_submissions").doc(uid);
  const prev = await ref.get();
  const batch = getFirestore().batch();
  batch.set(ref, {
    uid, email: emailOf(req.auth), studentName: student.name, studentNo: student.no, fileName, storagePath: path,
    submittedAt: FieldValue.serverTimestamp(), submitCount: (prev.get("submitCount") || 0) + 1, feedbackSentAt: null,
  });
  batch.delete(col("exam_results").doc(uid));
  batch.delete(col("exam_reports").doc(uid));
  await batch.commit();
  return { ok: true };
});

// [교사] 모범 답·채점 기준(교사 화면에 표시)
exports.getRubric = onCall({ region: REGION }, async req => {
  checkTeacher(req.auth);
  const r = require("./rubric/exam.json");
  return {
    items: r.items.map(({ id, q, label, max, answerKey }) => ({ id, q, label, max, answerKey })),
    questions: Object.fromEntries(Object.entries(r.questions).map(([q, v]) => [q, v.text])),
    solutions: Object.fromEntries(Object.entries(r.questions).filter(([, v]) => v.shownSolution).map(([q, v]) => [q, v.shownSolution])),
  };
});

// [교사] 학생이 낸 파일 내용(답안 확인용)
exports.getSubmission = onCall({ region: REGION }, async req => {
  checkTeacher(req.auth);
  const snap = await col("exam_submissions").doc(checkUid(req.data?.uid)).get();
  if (!snap.exists) throw new HttpsError("not-found", "제출 기록이 없습니다.");
  return { content: await readFile(snap.data()) };
});

// [교사] 한 명 채점. 이미 채점되어 있으면 결과를 덮어쓴다(교사가 고친 점수·피드백도 사라진다).
exports.gradeExam = onCall(
  { region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 180, memory: "512MiB", maxInstances: 10 },
  async req => {
    checkTeacher(req.auth);
    const uid = checkUid(req.data?.uid);
    const snap = await col("exam_submissions").doc(uid).get();
    if (!snap.exists) throw new HttpsError("not-found", "제출 기록이 없습니다.");
    let data;
    try { data = JSON.parse(await readFile(snap.data())); } catch (e) { if (e instanceof HttpsError) throw e; throw new HttpsError("failed-precondition", "답안 파일 형식이 올바르지 않습니다."); }
    let student;
    try { student = g.validateSubmission(data); } catch (e) { throw new HttpsError("invalid-argument", e.message); }
    const prep = g.prepare(data);
    const result = { ...g.assemble(prep, prep.toGrade.length ? await callGemini(prep) : null, student), model: MODEL };
    const total = g.totalOf(result);
    const now = FieldValue.serverTimestamp();
    await col("exam_results").doc(uid).set({ uid, result, total, edited: false, gradedAt: now, updatedAt: now });
    return { total };
  }
);

// [교사] 채점 결과를 학생이 볼 수 있는 보고서로 전송(일괄 가능). 전송 시점의 결과가 복사된다.
exports.sendFeedback = onCall({ region: REGION, timeoutSeconds: 120 }, async req => {
  checkTeacher(req.auth);
  const uids = Array.isArray(req.data?.uids) ? [...new Set(req.data.uids.map(checkUid))] : [];
  if (!uids.length || uids.length > 200) throw new HttpsError("invalid-argument", "전송할 학생을 1~200명 선택하세요.");
  const sent = [], skipped = [];
  for (let i = 0; i < uids.length; i += 100) {
    const batch = getFirestore().batch();
    await Promise.all(uids.slice(i, i + 100).map(async uid => {
      const [sub, res] = await Promise.all([col("exam_submissions").doc(uid).get(), col("exam_results").doc(uid).get()]);
      if (!sub.exists || !res.exists) { skipped.push(uid); return; }
      const now = FieldValue.serverTimestamp();
      batch.set(col("exam_reports").doc(uid), {
        uid, studentName: sub.get("studentName"), studentNo: sub.get("studentNo"), submittedAt: sub.get("submittedAt"),
        total: res.get("total"), result: res.get("result"), sentAt: now,
      });
      batch.update(sub.ref, { feedbackSentAt: now });
      sent.push(uid);
    }));
    await batch.commit();
  }
  return { sent: sent.length, skipped };
});
