import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getStorage, ref as sref, uploadBytes, deleteObject } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const DOMAIN = "@ts.hs.kr";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const gradeFn = httpsCallable(getFunctions(app, "asia-northeast3"), "gradeSubmission", { timeout: 190000 });

/* ---------- 로그인 ---------- */
$("#loginBtn").onclick = async () => {
  $("#loginMsg").textContent = "";
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: "ts.hs.kr", prompt: "select_account" });
  try { await signInWithPopup(auth, provider); }
  catch (e) { if (e.code !== "auth/popup-closed-by-user") $("#loginMsg").textContent = "로그인에 실패했습니다: " + e.code; }
};
$("#logout").onclick = () => signOut(auth);
let unsub = null;
onAuthStateChanged(auth, async user => {
  if (user && !(user.emailVerified && (user.email || "").toLowerCase().endsWith(DOMAIN))) {
    await signOut(auth);
    $("#loginMsg").textContent = `${DOMAIN} 계정만 사용할 수 있습니다.`;
    user = null;
  }
  $("#login").hidden = !!user;
  $("#app").hidden = !user;
  $("#user").hidden = !user;
  $("#who").textContent = user ? user.email : "";
  if (unsub) { unsub(); unsub = null; }
  rows = []; selected.clear();
  if (user) {
    unsub = onSnapshot(query(collection(db, "submissions"), orderBy("uploadedAt", "desc")),
      snap => { rows = snap.docs.map(d => ({ id: d.id, ...d.data() })); render(); },
      err => { $("#upMsg").textContent = "목록을 불러오지 못했습니다: " + err.code; });
  }
  render();
});

/* ---------- 상태 ---------- */
let rows = [];            // Firestore submissions
const selected = new Set();
const grading = new Set();
let tab = "all";          // "all" | 1 | 2 | 3
const total = r => { const m = r.items.reduce((a, i) => a + i.max, 0); return m ? Math.round(r.items.reduce((a, i) => a + i.score, 0) / m * 100) : 0; };
const visible = () => rows.filter(r => tab === "all" || r.session === tab)
  .sort((a, b) => a.session - b.session || String(a.studentNo).localeCompare(String(b.studentNo), "ko", { numeric: true }) || String(a.studentName).localeCompare(String(b.studentName), "ko"));
const fmtDate = t => t?.toDate ? t.toDate().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const statusOf = r => grading.has(r.id) ? "채점중" : r.error ? "오류" : r.status === "graded" ? "완료" : "미채점";

/* ---------- 업로드 ---------- */
async function docId(session, key) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(key));
  return `s${session}_` + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
}
async function upload(list) {
  const items = [], skipped = [];
  for (const f of list) {
    try {
      if (f.size > 400000) throw new Error("파일이 너무 큽니다");
      const text = await f.text();
      const d = JSON.parse(text);
      const m = d && d.format === "solid-worksheet" && d.fields && /session_(\d)\.html$/.exec(d.page || "");
      if (!m || !["1", "2", "3"].includes(m[1])) throw new Error("학습지 JSON이 아닙니다");
      const session = Number(m[1]);
      const name = String(d.fields["id-name"] || "").trim(), no = String(d.fields["id-no"] || d.fields["id-num"] || "").trim();
      const id = await docId(session, no || name ? `${no}|${name}` : `file|${f.name}`);
      items.push({ id, session, text, file: f, name, no, group: String(d.fields["id-group"] || d.fields["id-team"] || "").trim() });
    } catch (e) { skipped.push(`${f.name}(${e.message})`); }
  }
  const dup = items.filter(i => rows.some(r => r.id === i.id));
  if (dup.length && !confirm(`이미 올라온 ${dup.length}건(같은 학생·같은 차시)을 덮어쓰고 기존 채점 결과를 지웁니다. 계속할까요?`)) return;
  let ok = 0;
  for (const i of items) {
    $("#upMsg").textContent = `업로드 중… ${ok}/${items.length}`;
    try {
      const path = `submissions/session_${i.session}/${i.id}.json`;
      await uploadBytes(sref(storage, path), new Blob([i.text], { type: "application/json" }), { contentType: "application/json" });
      await setDoc(doc(db, "submissions", i.id), {
        session: i.session, studentName: i.name, studentNo: i.no, studentGroup: i.group, fileName: i.file.name,
        storagePath: path, status: "uploaded", result: null, total: null, edited: false,
        uploadedAt: serverTimestamp(), uploaderEmail: auth.currentUser.email,
      });
      ok++;
    } catch (e) { skipped.push(`${i.file.name}(${e.code || e.message})`); }
  }
  $("#upMsg").textContent = `${ok}건 업로드 완료` + (skipped.length ? ` · 제외 ${skipped.length}건: ${skipped.join(", ")}` : "");
}
$("#pick").onchange = e => { upload([...e.target.files]); e.target.value = ""; };
const drop = $("#drop");
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); upload([...e.dataTransfer.files].filter(f => /\.json$/i.test(f.name))); };

/* ---------- 목록 ---------- */
function render() {
  $("#tabs").innerHTML = [["all", "전체"], [1, "1차시"], [2, "2차시"], [3, "3차시"]].map(([k, label]) =>
    `<button type="button" data-tab="${k}" aria-pressed="${tab === k}" class="ghost">${label} (${k === "all" ? rows.length : rows.filter(r => r.session === k).length})</button>`).join("");
  const list = visible();
  $("#list tbody").innerHTML = list.map(r => { const st = statusOf(r); return `<tr data-id="${r.id}">
    <td><input type="checkbox" class="sel" ${selected.has(r.id) ? "checked" : ""} aria-label="선택"></td>
    <td>${r.session}차시</td><td>${esc(r.studentName)}</td><td>${esc(r.studentNo)}</td><td>${fmtDate(r.uploadedAt)}</td>
    <td class="st-${st === "미채점" ? "대기" : st}">${st}${r.edited ? " (수정됨)" : ""}${r.error ? " · " + esc(r.error) : ""}</td>
    <td>${r.status === "graded" && r.result ? r.total + "점" : ""}</td>
    <td>${r.status === "graded" && r.result ? `<button type="button" class="ghost view">결과 보기</button> <button type="button" class="ghost pdf">PDF</button> <button type="button" class="ghost one">재채점</button>`
      : st === "채점중" ? "" : `<button type="button" class="ghost one">채점</button>`}</td></tr>`; }).join("");
  const done = list.filter(r => r.status === "graded").length;
  $("#summary").textContent = list.length ? `${list.length}건 중 ${done}건 채점 완료` : "올린 파일이 없습니다";
  $("#pdfAll").disabled = !done;
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { tab = b.dataset.tab === "all" ? "all" : Number(b.dataset.tab); render(); } });
$("#list").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-id]"); if (!tr) return;
  const r = rows.find(x => x.id === tr.dataset.id);
  if (e.target.classList.contains("sel")) e.target.checked ? selected.add(r.id) : selected.delete(r.id);
  else if (e.target.classList.contains("one")) runBatch([r]);
  else if (e.target.classList.contains("view")) openDetail(r);
  else if (e.target.classList.contains("pdf")) downloadPdf([r]);
});
$("#selAll").onchange = e => { visible().forEach(r => e.target.checked ? selected.add(r.id) : selected.delete(r.id)); render(); };

$("#delSel").onclick = async () => {
  const del = rows.filter(r => selected.has(r.id));
  if (!del.length || !confirm(`선택한 ${del.length}건의 파일과 채점 결과를 삭제합니다. 되돌릴 수 없습니다.`)) return;
  for (const r of del) {
    try { await deleteObject(sref(storage, r.storagePath)).catch(e => { if (e.code !== "storage/object-not-found") throw e; }); await deleteDoc(doc(db, "submissions", r.id)); selected.delete(r.id); }
    catch (e) { $("#upMsg").textContent = `삭제 실패: ${r.studentName} (${e.code})`; }
  }
};

/* ---------- 채점 ---------- */
async function gradeOne(r) {
  grading.add(r.id); r.error = ""; render();
  for (let attempt = 0; ; attempt++) {
    try { await gradeFn({ id: r.id }); break; }
    catch (e) {
      const retry = ["functions/unavailable", "functions/resource-exhausted", "functions/deadline-exceeded"].includes(e.code);
      if (retry && attempt < 2) { await new Promise(res => setTimeout(res, 2500 * (attempt + 1))); continue; }
      r.error = e.message || "채점 실패"; break;
    }
  }
  grading.delete(r.id); render();
}
let running = false;
async function runBatch(list) {
  list = list.filter(r => !grading.has(r.id));
  if (running || !list.length) return;
  running = true; setBusy(true);
  const queue = [...list];
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => { while (queue.length) await gradeOne(queue.shift()); }));
  running = false; setBusy(false);
}
const setBusy = b => ["#gradeAll", "#gradeSel"].forEach(s => $(s).disabled = b);
$("#gradeAll").onclick = () => runBatch(visible().filter(r => r.status !== "graded"));
$("#gradeSel").onclick = () => runBatch(rows.filter(r => selected.has(r.id)));

/* ---------- 결과 보기(수정 가능) ---------- */
let current = null;   // { id, result(복사본) }
function openDetail(r) {
  current = { id: r.id, student: r.studentName, no: r.studentNo, result: structuredClone(r.result) };
  const d = current.result;
  $("#dTitle").textContent = `${r.studentName || r.fileName} (${r.studentNo || "-"}) · ${d.session}차시`;
  $("#dMsg").textContent = "";
  $("#dBody").innerHTML = `<p>총점 <b id="dTotal">${total(d)}</b>점 / 100 <small>(${esc(d.model)})</small></p>` +
    d.items.map((it, i) => `<div class="item" data-i="${i}"><h3>활동 ${esc(it.id)}. ${esc(it.title)} ${it.needsReview ? '<span class="flag">직접 확인 필요</span>' : ""}</h3>
      <label class="sc">점수 <input type="number" min="0" max="${it.max}" value="${it.score}"> / ${it.max}</label>
      <textarea aria-label="피드백">${esc(it.feedback)}</textarea></div>`).join("") +
    `<div class="item"><h3>종합 평가</h3><textarea id="dOverall" aria-label="종합 평가">${esc(d.overall)}</textarea></div>`;
  $("#detail").showModal();
}
$("#dBody").addEventListener("input", e => {
  if (!current) return;
  const d = current.result, box = e.target.closest(".item[data-i]");
  if (e.target.id === "dOverall") d.overall = e.target.value;
  else if (box && e.target.type === "number") {
    const it = d.items[+box.dataset.i];
    it.score = Math.max(0, Math.min(it.max, Math.round(+e.target.value || 0)));
    $("#dTotal").textContent = total(d);
  } else if (box) d.items[+box.dataset.i].feedback = e.target.value;
  $("#dMsg").textContent = "저장하지 않은 수정이 있습니다";
});
$("#dSave").onclick = async () => {
  if (!current) return;
  try {
    await updateDoc(doc(db, "submissions", current.id), { result: current.result, total: total(current.result), edited: true });
    $("#dMsg").textContent = "저장했습니다";
  } catch (e) { $("#dMsg").textContent = "저장 실패: " + e.code; }
};
$("#dPdf").onclick = () => current && downloadPdf([{ studentName: current.student, studentNo: current.no, result: current.result }]);
$("#detail").addEventListener("close", () => { current = null; });

/* ---------- PDF ---------- */
const reportHtml = (r, last) => {
  const d = r.result, t = total(d), today = new Date().toLocaleDateString("ko-KR");
  const s = d.student || {};
  return `<div class="report ${last ? "" : "pb"}">
    <h1>SOLID 탐구학습지 ${d.session}차시 채점 결과</h1>
    <div class="meta">이름 ${esc(r.studentName || s.name || "-")} · 학번 ${esc(r.studentNo || s.no || "-")}${s.group ? " · 모둠 " + esc(s.group) : ""} · 채점일 ${today}</div>
    <div class="total">총점 ${t} / 100</div>
    <table><thead><tr><th style="width:42%">활동</th><th style="width:12%">점수</th><th>피드백</th></tr></thead><tbody>
    ${d.items.map(it => `<tr><td>활동 ${esc(it.id)}. ${esc(it.title)}</td><td>${it.score} / ${it.max}</td><td>${esc(it.feedback)}</td></tr>`).join("")}
    </tbody></table>
    ${d.overall ? `<div class="ov"><b>종합 평가</b><br>${esc(d.overall)}</div>` : ""}
  </div>`;
};
async function downloadPdf(list) {
  list = list.filter(r => r.result);
  if (!list.length) return;
  const host = $("#print");
  host.innerHTML = list.map((r, i) => reportHtml(r, i === list.length - 1)).join("");
  const safe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, "_");
  const name = list.length === 1
    ? `${safe(list[0].studentNo || "")}_${safe(list[0].studentName || "학생")}_${list[0].result.session}차시_채점결과.pdf`
    : `SOLID_채점결과_${tab === "all" ? "전체" : tab + "차시"}_${list.length}명.pdf`;
  try {
    await html2pdf().set({
      margin: [10, 0, 10, 0], filename: name, image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "avoid-all"] },
    }).from(host).save();
  } finally { host.innerHTML = ""; }
}
$("#pdfAll").onclick = () => downloadPdf(visible().filter(r => r.status === "graded"));
render();
