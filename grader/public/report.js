import { getDoc, doc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { $, esc, fmtDate, db, start } from "./common.js";

// ?uid=... 는 교사가 학생의 보고서를 볼 때만 쓴다(권한은 Firestore 규칙이 검사한다).
start(async user => {
  if (!user) return;
  const uid = new URLSearchParams(location.search).get("uid");
  if (uid) $("#back").href = "teacher.html";
  const box = $("#report");
  box.innerHTML = `<p class="mute">불러오는 중…</p>`;
  try {
    const snap = await getDoc(doc(db, "exam_reports", uid || user.uid));
    if (!snap.exists()) { box.innerHTML = `<p>아직 전송된 피드백 보고서가 없습니다.</p>`; return; }
    const r = snap.data(), res = r.result;
    const byQ = {};
    for (const it of res.items) (byQ[it.q] ||= []).push(it);
    const qSum = q => `${byQ[q].reduce((a, i) => a + i.score, 0)} / ${byQ[q].reduce((a, i) => a + i.max, 0)}`;
    box.innerHTML = `<div class="report">
      <h1>SOLID 원리 평가 피드백 보고서</h1>
      <div class="mute">${esc(r.studentNo)} ${esc(r.studentName)} · 제출 ${fmtDate(r.submittedAt)} · 전송 ${fmtDate(r.sentAt)}</div>
      <div class="total">총점 ${r.total} / 100</div>
      <table><thead><tr><th style="width:34%">소문항</th><th style="width:13%">점수</th><th>피드백</th></tr></thead><tbody>
      ${Object.keys(byQ).map(q => `<tr><th colspan="3" style="background:var(--bg)">문항 ${q} · ${qSum(q)}점</th></tr>` +
        byQ[q].map(it => `<tr><td>${esc(it.id)}. ${esc(it.label)}</td><td>${it.score} / ${it.max}</td><td>${esc(it.feedback)}</td></tr>`).join("")).join("")}
      </tbody></table>
      ${res.overall ? `<div class="ov"><b>종합 평가</b><br>${esc(res.overall)}</div>` : ""}
    </div>`;
  } catch (e) {
    box.innerHTML = `<p class="err">보고서를 불러오지 못했습니다: ${esc(e.code || e.message)}</p>`;
  }
});
$("#print").onclick = () => window.print();
