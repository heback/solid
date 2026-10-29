// 학습지 정답 표시: 입력칸에 정답을 채워 보여 주고, T 키(또는 도구 모음 버튼)로 지우거나 다시 채운다.
// 정답은 worksheets/answers.json(입력칸 data-k → 정답)과 solutions.json(편집기 정답 코드)에서 읽는다.
// 정답이 보이는 동안 입력칸은 읽기 전용이며, 학생이 쓴 내용은 따로 보관했다가 숨길 때 그대로 되돌린다.
// 정답이 보이는 동안에는 worksheet.js가 자동 저장·JSON 저장을 하지 않는다(정답이 학생 답안으로 저장되지 않게).
(function () {
  const KEY = "solid-answers-visible";
  const state = (window.solidAnswers = { shown: false });
  let want = true;                       // 사용자가 원하는 상태(기억됨)
  try { if (localStorage.getItem(KEY) === "0") want = false; } catch (e) {}
  let answers = null, solutions = {};
  let mine = new Map();                  // 정답을 채우기 전 학생의 값

  const fields = () => Array.from(document.querySelectorAll("main [data-k]")).filter(el => !el.dataset.k.startsWith("id-"));
  const isCheck = el => el.type === "checkbox" || el.type === "radio";
  const fire = el => el.dispatchEvent(new Event("input", { bubbles: true }));   // 편집기 색칠·글상자 높이 갱신
  const label = () => { const b = document.getElementById("ws-answers"); if (b) b.textContent = state.shown ? "정답 지우기 (T)" : "정답 채우기 (T)"; };

  function show() {
    if (state.shown || !answers) return;
    mine = new Map(fields().map(el => [el, isCheck(el) ? el.checked : el.value]));
    state.shown = true;
    document.body.classList.add("answers-on");
    for (const el of fields()) {
      const k = el.dataset.k, v = el.dataset.k.startsWith("py-") ? solutions[k.slice(3)] : answers[k];
      if (isCheck(el)) { el.checked = v === true; el.disabled = true; continue; }
      if (el.tagName === "SELECT") { el.value = typeof v === "string" ? v : ""; el.disabled = true; continue; }
      el.value = typeof v === "string" ? v : "";
      el.readOnly = true;
      fire(el);
    }
    label();
  }
  function hide() {
    if (!state.shown) return;
    state.shown = false;
    document.body.classList.remove("answers-on");
    for (const el of fields()) {
      const v = mine.get(el);
      if (isCheck(el)) { el.checked = !!v; el.disabled = false; continue; }
      el.value = v == null ? "" : v;
      if (el.tagName === "SELECT") el.disabled = false; else { el.readOnly = false; fire(el); }
    }
    mine = new Map();
    label();
  }
  function set(on) {
    want = on;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    on ? show() : hide();
  }
  const toggle = () => set(!state.shown);

  const typing = el => el && (el.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|button)$/.test(el.type || "")));
  document.addEventListener("keydown", e => {
    if ((e.key === "t" || e.key === "T" || e.key === "ㅅ") && !e.metaKey && !e.ctrlKey && !e.altKey && !(typing(document.activeElement) && !document.activeElement.readOnly)) {
      e.preventDefault(); toggle();
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    // 도구 모음은 worksheet.js가 먼저 만든다(이 파일을 worksheet.js 뒤에 불러온다).
    const bar = document.querySelector(".ws-tools");
    if (bar) {
      const b = document.createElement("button");
      b.type = "button"; b.id = "ws-answers"; b.onclick = toggle;
      bar.insertBefore(b, bar.querySelector("button"));
    }
    label();
    try { answers = await (await fetch("answers.json")).json(); } catch (e) { answers = null; }
    try { solutions = await (await fetch("solutions.json")).json(); } catch (e) {}
    if (want) show();
  });
  // 정답을 채운 채 인쇄해도 괜찮지만, 창을 닫을 때는 저장을 건드리지 않는다(worksheet.js가 막음).
})();
