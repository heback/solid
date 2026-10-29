import { $, esc, call, start, isTeacher, highlightAll } from "./common.js";

const rubricFn = call("getRubric");

start(async user => {
  if (!user) return;
  const body = $("#body");
  if (!isTeacher(user)) { body.innerHTML = `<p class="err">교사 권한이 없는 계정입니다.</p>`; return; }
  body.innerHTML = `<p class="mute">불러오는 중…</p>`;
  try {
    const d = (await rubricFn()).data;
    const qs = Object.keys(d.questions).sort();
    const sumOf = q => d.items.filter(i => i.q == q).reduce((a, i) => a + i.max, 0);
    $("#toc").innerHTML = qs.map(q => `<a href="#q${q}">문항 ${q}</a>`).join("");
    body.innerHTML = `<div class="hero"><h2>문제와 모범 정답</h2><p>문항마다 <b>문제 → 모범 코드 → 소문항별 모범 답·채점 기준</b> 순서입니다. 합계 ${qs.reduce((a, q) => a + sumOf(q), 0)}점.</p></div>
      <table class="sum"><thead><tr><th>문항</th><th>제목</th><th>소문항 배점</th><th>합계</th></tr></thead><tbody>${qs.map(q => `<tr><td><a href="#q${q}">문항 ${q}</a></td><td>${esc(d.questions[q].title)}</td><td>${d.items.filter(i => i.q == q).map(i => `${esc(i.id)} · ${i.max}`).join(" / ")}</td><td><b>${sumOf(q)}</b></td></tr>`).join("")}</tbody></table>` +
      qs.map(q => {
        const Q = d.questions[q], items = d.items.filter(i => i.q == q);
        return `<section class="qcard" id="q${q}">
          <div class="qhead"><span class="qnum">${q}</span><div><h2>${esc(Q.title)}</h2><div class="tags">${Q.tags.map(t => `<span class="tagp">${esc(t)}</span>`).join("")}</div></div><span class="qpts">${sumOf(q)}점</span></div>
          <div class="blk"><h3>문제</h3><div class="doc">${Q.html}</div></div>
          ${Q.solution ? `<div class="blk sol"><h3>모범 코드</h3><details class="doc" open><summary>펼치기 / 접기</summary><pre><code>${esc(Q.solution)}</code></pre></details></div>` : ""}
          <div class="blk ans"><h3>소문항별 모범 답·채점 기준</h3>${items.map(i => `<div class="sitem"><header><b>${esc(i.id)}. ${esc(i.label)}</b><span class="pill">${i.max}점</span></header><div class="doc">${i.answerHtml}</div></div>`).join("")}</div>
        </section>`;
      }).join("");
    highlightAll(body);
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  } catch (e) { body.innerHTML = `<p class="err">불러오지 못했습니다: ${esc(e.message || e.code)}</p>`; }
});
$("#print").onclick = () => window.print();
