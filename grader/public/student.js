import { onSnapshot, doc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, esc, fmtDate, db, call, start } from "./common.js";

const submit = call("submitExam");
let unsub = null;

start(user => {
  if (unsub) { unsub(); unsub = null; }
  $("#msg").textContent = "";
  if (!user) return;
  unsub = onSnapshot(doc(db, "exam_submissions", user.uid), snap => {
    const s = snap.exists() ? snap.data() : null;
    $("#status tbody").innerHTML = !s
      ? `<tr><td colspan="4" class="mute">아직 제출한 답안이 없습니다.</td></tr>`
      : `<tr><td>${esc(s.studentNo)} ${esc(s.studentName)}<br><small class="mute">${esc(s.fileName)}${s.submitCount > 1 ? ` · ${s.submitCount}번째 제출` : ""}</small></td>
          <td>${fmtDate(s.submittedAt)}</td>
          <td class="${s.feedbackSentAt ? "ok" : "mute"}">${s.feedbackSentAt ? "채점 완료" : "채점 전"}</td>
          <td>${s.feedbackSentAt ? `<a class="btn sm" href="report.html">피드백 보고서 보기</a>` : "-"}</td></tr>`;
  }, err => { $("#msg").textContent = "제출 현황을 불러오지 못했습니다: " + err.code; });
});

async function upload(file) {
  if (!file) return;
  const msg = $("#msg");
  msg.className = "note";
  try {
    if (file.size > 400000) throw new Error("파일이 너무 큽니다.");
    const content = await file.text();
    let d;
    try { d = JSON.parse(content); } catch { throw new Error("JSON 형식이 올바르지 않습니다."); }
    if (!d || d.format !== "solid-worksheet" || !/(^|\/)exam\.html$/.test(String(d.page || ""))) throw new Error("평가 화면에서 저장한 답안 파일이 아닙니다.");
    if (!String(d.fields?.["id-no"] || "").trim() || !String(d.fields?.["id-name"] || "").trim()) throw new Error("파일에 학번과 성명이 없습니다. 평가 화면 맨 위에 입력하고 다시 저장하세요.");
    if (!confirm(`'${d.fields["id-no"]} ${d.fields["id-name"]}' 답안을 제출합니다. 이전에 제출한 답안이 있으면 덮어씁니다. 계속할까요?`)) return;
    msg.textContent = "제출 중…";
    await submit({ fileName: file.name, content });
    msg.textContent = "제출했습니다.";
  } catch (e) {
    msg.className = "err";
    msg.textContent = "제출하지 못했습니다: " + (e.message || e.code);
  }
}
$("#pick").onchange = e => { upload(e.target.files[0]); e.target.value = ""; };
const drop = $("#drop");
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); upload(e.dataTransfer.files[0]); };
