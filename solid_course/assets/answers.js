// 학습지 정답 표시: 입력칸 아래에 정답을 보여 주고, T 키(또는 도구 모음 버튼)로 숨기거나 다시 보인다.
// 정답은 worksheets/answers.json(입력칸 data-k → 정답)과 solutions.json(편집기 정답 코드)에서 읽는다.
// 입력칸의 값은 건드리지 않는다(학생이 쓴 내용과 JSON 저장에 영향 없음).
(function () {
  const KEY = "solid-answers-visible";
  let visible = true;
  try { if (localStorage.getItem(KEY) === "0") visible = false; } catch (e) {}
  const apply = () => {
    document.body.classList.toggle("hide-answers", !visible);
    const b = document.getElementById("ws-answers");
    if (b) b.textContent = visible ? "정답 숨기기 (T)" : "정답 보이기 (T)";
  };
  const toggle = () => { visible = !visible; try { localStorage.setItem(KEY, visible ? "1" : "0"); } catch (e) {} apply(); };

  const typing = el => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|button)$/.test(el.type || ""));
  document.addEventListener("keydown", e => {
    if ((e.key === "t" || e.key === "T" || e.key === "ㅅ") && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(document.activeElement)) { e.preventDefault(); toggle(); }
  });

  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const box = html => { const d = document.createElement("div"); d.className = "ans-box"; d.innerHTML = '<span class="ans-tag">정답</span>' + html; return d; };

  async function build() {
    let answers = {}, solutions = {};
    try { answers = await (await fetch("answers.json")).json(); } catch (e) {}
    try { solutions = await (await fetch("solutions.json")).json(); } catch (e) {}
    document.querySelectorAll("main [data-k]").forEach(el => {
      const k = el.dataset.k;
      if (!(k in answers) || el.classList.contains("pyedit-code")) return;
      const v = answers[k];
      if (el.type === "checkbox" || el.type === "radio") { if (v === true) (el.closest("label") || el.parentElement).classList.add("ans-pick"); return; }
      if (typeof v !== "string") return;
      const b = box(esc(v));
      if (el.tagName === "INPUT" || el.tagName === "SELECT") { b.classList.add("inline"); el.insertAdjacentElement("afterend", b); }
      else el.insertAdjacentElement("afterend", b);
    });
    document.querySelectorAll(".pyedit[data-name]").forEach(ed => {
      const code = solutions[ed.dataset.name];
      if (!code) return;
      const b = box(""); b.classList.add("code");
      b.insertAdjacentHTML("beforeend", "<pre><code>" + esc(code) + "</code></pre>");
      ed.insertAdjacentElement("afterend", b);
      if (window.pyHighlight) { const c = b.querySelector("code"); c.innerHTML = window.pyHighlight(code); }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // 도구 모음은 worksheet.js가 먼저 만든다(이 파일을 worksheet.js 뒤에 불러온다).
    const bar = document.querySelector(".ws-tools");
    if (bar) {
      const b = document.createElement("button");
      b.type = "button"; b.id = "ws-answers";
      b.onclick = toggle;
      bar.insertBefore(b, bar.querySelector("button"));
    }
    apply();
    build();
  });
})();
