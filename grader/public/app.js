import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

const DOMAIN = "@ts.hs.kr";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const grade = httpsCallable(getFunctions(app, "asia-northeast3"), "gradeWorksheet", { timeout: 190000 });

/* ---------- 로그인 ---------- */
$("#loginBtn").onclick = async () => {
  $("#loginMsg").textContent = "";
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: "ts.hs.kr", prompt: "select_account" });
  try { await signInWithPopup(auth, provider); }
  catch (e) { if (e.code !== "auth/popup-closed-by-user") $("#loginMsg").textContent = "로그인에 실패했습니다: " + e.code; }
};
$("#logout").onclick = () => signOut(auth);
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
});

/* ---------- 파일 목록 ---------- */
let files = [];   // { id, name, data, session, student, status, result, error, selected }
let seq = 0;
const total = r => { const m = r.items.reduce((a, i) => a + i.max, 0); return m ? Math.round(r.items.reduce((a, i) => a + i.score, 0) / m * 100) : 0; };

async function addFiles(list) {
  for (const f of list) {
    const row = { id: ++seq, name: f.name, status: "대기", selected: true };
    try {
      if (f.size > 400000) throw new Error("파일이 너무 큽니다.");
      const d = JSON.parse(await f.text());
      const m = d && d.format === "solid-worksheet" && d.fields && /session_(\d)\.html$/.exec(d.page || "");
      if (!m) throw new Error("학습지 JSON이 아닙니다.");
      row.data = d; row.session = Number(m[1]);
      row.student = { name: d.fields["id-name"] || "", no: d.fields["id-no"] || d.fields["id-num"] || "" };
    } catch (e) { row.status = "오류"; row.error = e.message; row.selected = false; }
    files.push(row);
  }
  render();
}
$("#pick").onchange = e => { addFiles([...e.target.files]); e.target.value = ""; };
const drop = $("#drop");
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); addFiles([...e.dataTransfer.files].filter(f => /\.json$/i.test(f.name))); };

function render() {
  $("#list tbody").innerHTML = files.map(r => `<tr data-id="${r.id}">
    <td><input type="checkbox" class="sel" ${r.selected ? "checked" : ""} ${r.data ? "" : "disabled"} aria-label="선택"></td>
    <td>${esc(r.name)}</td><td>${esc(r.student?.name)}</td><td>${esc(r.student?.no)}</td><td>${r.session ? r.session + "차시" : ""}</td>
    <td class="st-${r.status}">${r.status}${r.error ? " · " + esc(r.error) : ""}</td>
    <td>${r.result ? total(r.result) + "점" : ""}</td>
    <td>${r.status === "완료" ? `<button type="button" class="ghost view">결과 보기</button> <button type="button" class="ghost pdf">PDF</button>`
      : r.data && r.status !== "채점중" ? `<button type="button" class="ghost one">채점</button>` : ""}</td></tr>`).join("");
  const done = files.filter(r => r.status === "완료").length;
  $("#summary").textContent = files.length ? `${files.length}개 중 ${done}개 완료` : "";
  $("#pdfAll").disabled = !done;
}
$("#list").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-id]"); if (!tr) return;
  const r = files.find(x => x.id === +tr.dataset.id);
  if (e.target.classList.contains("sel")) r.selected = e.target.checked;
  else if (e.target.classList.contains("one")) runBatch([r]);
  else if (e.target.classList.contains("view")) openDetail(r);
  else if (e.target.classList.contains("pdf")) downloadPdf([r]);
});
$("#selAll").onchange = e => { files.forEach(r => { if (r.data) r.selected = e.target.checked; }); render(); };
$("#clear").onclick = () => { if (!files.some(r => r.status === "채점중")) { files = []; render(); } };

/* ---------- 채점 ---------- */
async function gradeOne(r) {
  r.status = "채점중"; r.error = ""; render();
  for (let attempt = 0; ; attempt++) {
    try {
      r.result = (await grade({ worksheet: r.data })).data;
      r.status = "완료"; break;
    } catch (e) {
      const retry = ["functions/unavailable", "functions/resource-exhausted", "functions/deadline-exceeded"].includes(e.code);
      if (retry && attempt < 2) { await new Promise(res => setTimeout(res, 2500 * (attempt + 1))); continue; }
      r.status = "오류"; r.error = e.message || "채점 실패"; break;
    }
  }
  render();
}
let running = false;
async function runBatch(rows) {
  rows = rows.filter(r => r.data && r.status !== "채점중");
  if (running || !rows.length) return;
  running = true; setBusy(true);
  const queue = [...rows];
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => { while (queue.length) await gradeOne(queue.shift()); }));
  running = false; setBusy(false);
}
const setBusy = b => ["#gradeAll", "#gradeSel"].forEach(s => $(s).disabled = b);
$("#gradeAll").onclick = () => runBatch(files.filter(r => r.status !== "완료"));
$("#gradeSel").onclick = () => runBatch(files.filter(r => r.selected));

/* ---------- 결과 보기(수정 가능) ---------- */
let current = null;
function openDetail(r) {
  current = r;
  const d = r.result;
  $("#dTitle").textContent = `${r.student.name || r.name} (${r.student.no || "-"}) · ${d.session}차시`;
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
  render();
});
$("#dPdf").onclick = () => current && downloadPdf([current]);
$("#detail").addEventListener("close", () => { current = null; });

/* ---------- PDF ---------- */
const reportHtml = (r, last) => {
  const d = r.result, t = total(d), today = new Date().toLocaleDateString("ko-KR");
  return `<div class="report ${last ? "" : "pb"}">
    <h1>SOLID 탐구학습지 ${d.session}차시 채점 결과</h1>
    <div class="meta">이름 ${esc(d.student.name || "-")} · 학번 ${esc(d.student.no || "-")}${d.student.group ? " · 모둠 " + esc(d.student.group) : ""} · 채점일 ${today}</div>
    <div class="total">총점 ${t} / 100</div>
    <table><thead><tr><th style="width:42%">활동</th><th style="width:12%">점수</th><th>피드백</th></tr></thead><tbody>
    ${d.items.map(it => `<tr><td>활동 ${esc(it.id)}. ${esc(it.title)}</td><td>${it.score} / ${it.max}</td><td>${esc(it.feedback)}</td></tr>`).join("")}
    </tbody></table>
    ${d.overall ? `<div class="ov"><b>종합 평가</b><br>${esc(d.overall)}</div>` : ""}
  </div>`;
};
async function downloadPdf(rows) {
  rows = rows.filter(r => r.result);
  if (!rows.length) return;
  const host = $("#print");
  host.innerHTML = rows.map((r, i) => reportHtml(r, i === rows.length - 1)).join("");
  const safe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, "_");
  const name = rows.length === 1
    ? `${safe(rows[0].student.no || "")}_${safe(rows[0].student.name || rows[0].name.replace(/\.json$/i, ""))}_${rows[0].result.session}차시_채점결과.pdf`
    : `SOLID_채점결과_${rows.length}명.pdf`;
  try {
    await html2pdf().set({
      margin: [10, 0, 10, 0], filename: name, image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "avoid-all"] },
    }).from(host).save();
  } finally { host.innerHTML = ""; }
}
$("#pdfAll").onclick = () => downloadPdf(files.filter(r => r.status === "완료"));
render();
