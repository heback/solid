import { $, esc, call, start, isTeacher } from "./common.js";

const rubricFn = call("getRubric");

start(async user => {
  if (!user) return;
  const body = $("#body");
  if (!isTeacher(user)) { body.innerHTML = `<p class="err">교사 권한이 없는 계정입니다.</p>`; return; }
  body.innerHTML = `<p class="mute">불러오는 중…</p>`;
  try {
    const d = (await rubricFn()).data;
    const qs = [...new Set(d.items.map(i => i.q))];
    $("#toc").innerHTML = qs.map(q => `<a class="btn ghost sm" href="#q${q}">문항 ${q}</a>`).join("");
    body.innerHTML = qs.map(q => {
      const items = d.items.filter(i => i.q === q), max = items.reduce((a, i) => a + i.max, 0);
      return `<section class="qbox" id="q${q}">
        <h2>문항 ${q} <small class="mute">(${max}점)</small></h2>
        <div class="lbl">문제</div><pre>${esc(d.questions[q])}</pre>
        ${d.solutions[q] ? `<div class="lbl">모범 코드</div><pre class="code">${esc(d.solutions[q])}</pre>` : ""}
        ${items.map(i => `<h3>${esc(i.id)}. ${esc(i.label)} <small class="mute">(${i.max}점)</small></h3><div class="lbl">모범 답·채점 기준</div><pre>${esc(i.answerKey)}</pre>`).join("")}
      </section>`;
    }).join("");
  } catch (e) { body.innerHTML = `<p class="err">불러오지 못했습니다: ${esc(e.message || e.code)}</p>`; }
});
$("#print").onclick = () => window.print();
