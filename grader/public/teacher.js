import { collection, doc, updateDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, esc, fmtDate, millis, db, call, start, isTeacher } from "./common.js";

const gradeFn = call("gradeExam", 190000), sendFn = call("sendFeedback", 120000), fileFn = call("getSubmission");
let subs = new Map(), results = new Map();   // uid -> 문서 데이터
const selected = new Set(), grading = new Set(), errors = new Map();
let unsubs = [];

start(user => {
  unsubs.forEach(u => u()); unsubs = [];
  subs = new Map(); results = new Map(); selected.clear();
  $("#denied").hidden = !user || isTeacher(user);
  $("#board").hidden = !user || !isTeacher(user);
  if (user && isTeacher(user)) {
    const fail = err => { $("#msg").textContent = "불러오지 못했습니다: " + err.code; };
    unsubs.push(onSnapshot(collection(db, "exam_submissions"), s => { subs = new Map(s.docs.map(d => [d.id, d.data()])); render(); }, fail));
    unsubs.push(onSnapshot(collection(db, "exam_results"), s => { results = new Map(s.docs.map(d => [d.id, d.data()])); render(); }, fail));
  }
  render();
});

/* ---------- 상태 계산 ---------- */
const rows = () => [...subs.entries()].map(([uid, s]) => ({ uid, s, r: results.get(uid) }))
  .sort((a, b) => String(a.s.studentNo).localeCompare(String(b.s.studentNo), "ko", { numeric: true }) || String(a.s.studentName).localeCompare(String(b.s.studentName), "ko"));
const gradeState = x => grading.has(x.uid) ? ["채점중", "warn"] : errors.has(x.uid) ? ["오류", "bad"] : x.r ? [x.r.edited ? "완료(수정됨)" : "완료", "ok"] : ["미채점", "mute"];
// 전송 상태: 전송 후 결과가 바뀌었으면(점수 수정·재채점) 재전송이 필요하다.
const sendState = x => !x.s.feedbackSentAt ? ["미전송", "mute"]
  : x.r && millis(x.r.updatedAt) > millis(x.s.feedbackSentAt) ? ["재전송 필요", "warn"] : ["전송됨 " + fmtDate(x.s.feedbackSentAt), "ok"];
const needsSend = x => x.r && (!x.s.feedbackSentAt || millis(x.r.updatedAt) > millis(x.s.feedbackSentAt));

function render() {
  const list = rows();
  $("#list tbody").innerHTML = list.map(x => {
    const [g, gc] = gradeState(x), [sd, sc] = sendState(x);
    return `<tr data-uid="${x.uid}">
      <td><input type="checkbox" class="sel" ${selected.has(x.uid) ? "checked" : ""} aria-label="선택"></td>
      <td>${esc(x.s.studentNo)}</td><td>${esc(x.s.studentName)}</td><td class="hide-s mute">${esc(x.s.email)}</td>
      <td>${fmtDate(x.s.submittedAt)}${x.s.submitCount > 1 ? ` <small class="mute">(${x.s.submitCount}회)</small>` : ""}</td>
      <td class="${gc}">${g}${errors.has(x.uid) ? `<br><small>${esc(errors.get(x.uid))}</small>` : ""}</td>
      <td>${x.r ? x.r.total + "점" : ""}</td>
      <td class="${sc}">${sd}</td>
      <td style="white-space:nowrap">
        <button type="button" class="ghost sm one">${x.r ? "재채점" : "채점"}</button>
        ${x.r ? `<button type="button" class="ghost sm view">결과 조회</button><button type="button" class="ghost sm send">${x.s.feedbackSentAt ? "재전송" : "전송"}</button>` : ""}
      </td></tr>`;
  }).join("") || `<tr><td colspan="9" class="mute">아직 제출된 답안이 없습니다.</td></tr>`;
  const graded = list.filter(x => x.r).length, sent = list.filter(x => x.s.feedbackSentAt && !needsSend(x)).length;
  $("#summary").textContent = `제출 ${list.length}명 · 채점 ${graded}명 · 전송 ${sent}명`;
}

$("#list").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-uid]"); if (!tr) return;
  const x = rows().find(y => y.uid === tr.dataset.uid); if (!x) return;
  if (e.target.classList.contains("sel")) e.target.checked ? selected.add(x.uid) : selected.delete(x.uid);
  else if (e.target.classList.contains("one")) gradeMany([x]);
  else if (e.target.classList.contains("view")) openDetail(x);
  else if (e.target.classList.contains("send")) sendMany([x]);
});
$("#selAll").onchange = e => { rows().forEach(x => e.target.checked ? selected.add(x.uid) : selected.delete(x.uid)); render(); };

/* ---------- 채점 ---------- */
async function gradeOne(x) {
  grading.add(x.uid); errors.delete(x.uid); render();
  for (let attempt = 0; ; attempt++) {
    try { await gradeFn({ uid: x.uid }); break; }
    catch (e) {
      const retry = ["functions/unavailable", "functions/resource-exhausted", "functions/deadline-exceeded"].includes(e.code);
      if (retry && attempt < 2) { await new Promise(r => setTimeout(r, 2500 * (attempt + 1))); continue; }
      errors.set(x.uid, e.message || "채점 실패"); break;
    }
  }
  grading.delete(x.uid); render();
}
let running = false;
async function gradeMany(list) {
  list = list.filter(x => !grading.has(x.uid));
  if (running || !list.length) return;
  const over = list.filter(x => x.r);
  if (over.length && !confirm(`이미 채점된 ${over.length}명의 결과(교사가 고친 점수·피드백 포함)를 새로 채점한 결과로 덮어씁니다. 계속할까요?`)) return;
  running = true; setBusy(true);
  const queue = [...list];
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => { while (queue.length) await gradeOne(queue.shift()); }));
  running = false; setBusy(false);
  $("#msg").textContent = `채점을 마쳤습니다(${list.length}명). 결과를 확인한 뒤 전송하세요.`;
}
const setBusy = b => ["#gradeNew", "#gradeSel"].forEach(s => $(s).disabled = b);
$("#gradeNew").onclick = () => gradeMany(rows().filter(x => !x.r));
$("#gradeSel").onclick = () => gradeMany(rows().filter(x => selected.has(x.uid)));

/* ---------- 피드백 전송 ---------- */
async function sendMany(list) {
  list = list.filter(x => x.r);
  if (!list.length) { $("#msg").textContent = "전송할 채점 결과가 없습니다."; return; }
  const resend = list.filter(x => x.s.feedbackSentAt).length;
  if (!confirm(`${list.length}명에게 채점 결과와 피드백 보고서를 전송합니다. 전송하면 학생이 점수를 볼 수 있습니다.` + (resend ? ` (재전송 ${resend}명은 이전 보고서를 덮어씁니다)` : "") + " 계속할까요?")) return false;
  try {
    let sent = 0;
    for (let i = 0; i < list.length; i += 100) sent += (await sendFn({ uids: list.slice(i, i + 100).map(x => x.uid) })).data.sent;
    $("#msg").textContent = `${sent}명에게 피드백을 전송했습니다.`;
    return true;
  } catch (e) { $("#msg").textContent = "전송 실패: " + (e.message || e.code); return false; }
}
$("#sendAll").onclick = () => sendMany(rows().filter(needsSend));
$("#sendSel").onclick = () => sendMany(rows().filter(x => selected.has(x.uid)));

/* ---------- 결과 조회·수정 ---------- */
let cur = null; // { uid, result(복사본), dirty }
const total = d => d.items.reduce((a, i) => a + i.score, 0);
async function openDetail(x) {
  cur = { uid: x.uid, result: structuredClone(x.r.result), dirty: false };
  const d = cur.result;
  $("#dTitle").textContent = `${x.s.studentNo} ${x.s.studentName} · ${x.s.email}`;
  $("#dMsg").textContent = "";
  const byQ = {};
  d.items.forEach((it, i) => (byQ[it.q] ||= []).push([it, i]));
  $("#dBody").innerHTML = `<p>총점 <b id="dTotal">${total(d)}</b> / 100 <small class="mute">(${esc(d.model)})</small></p>` +
    Object.keys(byQ).map(q => `<h3 class="qh">문항 ${q}</h3>` + byQ[q].map(([it, i]) => `<div class="item" data-i="${i}">
      <h3>${esc(it.id)}. ${esc(it.label)} ${it.needsReview ? '<span class="flag">직접 확인 필요</span>' : ""}</h3>
      <label>점수 <input type="number" min="0" max="${it.max}" value="${it.score}"> / ${it.max}</label>
      <textarea aria-label="피드백">${esc(it.feedback)}</textarea></div>`).join("")).join("") +
    `<div class="item"><h3>종합 평가</h3><textarea id="dOverall" aria-label="종합 평가">${esc(d.overall)}</textarea></div>
     <details class="raw" id="raw"><summary>학생 답안 원문 보기</summary><div id="rawBody" class="mute">불러오는 중…</div></details>`;
  $("#detail").showModal();
  $("#raw").addEventListener("toggle", loadRaw, { once: true });
}
async function loadRaw() {
  const uid = cur?.uid; if (!uid) return;
  try {
    const f = JSON.parse((await fileFn({ uid })).data.content).fields || {};
    const groups = {};
    for (const [k, v] of Object.entries(f)) { if (k.startsWith("id-") || v === "" || v === false) continue; (groups[k.startsWith("py-") ? (k.includes("q4") ? "4" : "5") : (/^q(\d)/.exec(k) || [, "기타"])[1]] ||= []).push([k, v]); }
    if (cur?.uid === uid) $("#rawBody").innerHTML = Object.keys(groups).sort().map(q => `<h4>문항 ${q}</h4><dl>` +
      groups[q].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k.startsWith("py-") ? `<pre>${esc(v)}</pre>` : esc(v)}</dd>`).join("") + `</dl>`).join("") || "입력한 내용이 없습니다.";
  } catch (e) { $("#rawBody").textContent = "불러오지 못했습니다: " + (e.message || e.code); }
}
$("#dBody").addEventListener("input", e => {
  if (!cur) return;
  const d = cur.result, box = e.target.closest(".item[data-i]");
  if (e.target.id === "dOverall") d.overall = e.target.value;
  else if (box && e.target.type === "number") {
    const it = d.items[+box.dataset.i];
    it.score = Math.max(0, Math.min(it.max, Math.round(+e.target.value || 0)));
    $("#dTotal").textContent = total(d);
  } else if (box && e.target.tagName === "TEXTAREA") d.items[+box.dataset.i].feedback = e.target.value;
  else return;
  cur.dirty = true;
  $("#dMsg").textContent = "저장하지 않은 수정이 있습니다";
});
async function saveDetail() {
  if (!cur) return false;
  if (!cur.dirty) return true;
  try {
    await updateDoc(doc(db, "exam_results", cur.uid), { result: cur.result, total: total(cur.result), edited: true, updatedAt: serverTimestamp() });
    cur.dirty = false; $("#dMsg").textContent = "저장했습니다(학생에게는 전송해야 반영됩니다)"; return true;
  } catch (e) { $("#dMsg").textContent = "저장 실패: " + e.code; return false; }
}
$("#dSave").onclick = saveDetail;
$("#dSend").onclick = async () => {
  if (!cur || !(await saveDetail())) return;
  const x = rows().find(y => y.uid === cur.uid);
  if (x && (await sendMany([{ ...x, r: x.r }]))) $("#dMsg").textContent = "전송했습니다";
};
$("#dRegrade").onclick = async () => {
  if (!cur) return;
  const x = rows().find(y => y.uid === cur.uid); if (!x) return;
  $("#detail").close();
  await gradeMany([x]);
  const nx = rows().find(y => y.uid === x.uid);
  if (nx?.r) openDetail(nx);
};
$("#detail").addEventListener("close", () => { cur = null; });
render();
