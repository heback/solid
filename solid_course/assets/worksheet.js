// 학습지 입력 자동 저장(localStorage) + 초기화 + 인쇄 버튼(인쇄 시 details 펼침)
// 저장 키: 페이지 경로 + 입력칸 순번. 입력칸은 textarea/input/select/checkbox/radio.
(function () {
  const ns = "solid-ws:" + location.pathname.split("/").pop();
  const fields = () => Array.from(document.querySelectorAll("main textarea, main input, main select"));
  const key = (el, i) => ns + ":" + (el.dataset.k || el.name || i);
  function save() {
    fields().forEach((el, i) => {
      try {
        const v = (el.type === "checkbox" || el.type === "radio") ? el.checked : el.value;
        localStorage.setItem(key(el, i), JSON.stringify(v));
      } catch (e) {}
    });
    const s = document.querySelector(".saved");
    if (s) s.textContent = "자동 저장됨 " + new Date().toLocaleTimeString("ko-KR");
  }
  function load() {
    fields().forEach((el, i) => {
      try {
        const raw = localStorage.getItem(key(el, i));
        if (raw === null) return;
        const v = JSON.parse(raw);
        if (el.type === "checkbox" || el.type === "radio") el.checked = !!v; else el.value = v;
      } catch (e) {}
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    load();
    document.addEventListener("input", save);
    document.addEventListener("change", save);
    const bar = document.createElement("div");
    bar.className = "ws-tools";
    bar.innerHTML = '<span class="saved"></span><button type="button" id="ws-print">🖨 인쇄/PDF</button><button type="button" id="ws-reset">입력 지우기</button>';
    document.body.appendChild(bar);
    document.getElementById("ws-print").onclick = () => window.print();
    // 인쇄할 때는 접힌 details(정의 확인 등)를 모두 펼쳤다가, 인쇄가 끝나면 원래 상태로 되돌린다.
    // 힌트(details.hint)는 worksheet.css의 @media print 규칙으로 인쇄에서 계속 숨겨진다.
    let wasClosed = [];
    window.addEventListener("beforeprint", () => {
      wasClosed = Array.from(document.querySelectorAll("details:not([open])"));
      wasClosed.forEach(d => { d.open = true; });
    });
    window.addEventListener("afterprint", () => {
      wasClosed.forEach(d => { d.open = false; });
      wasClosed = [];
    });
    document.getElementById("ws-reset").onclick = () => {
      if (!confirm("이 학습지의 입력을 모두 지울까요?")) return;
      fields().forEach((el, i) => { try { localStorage.removeItem(key(el, i)); } catch (e) {} });
      fields().forEach(el => { if (el.type === "checkbox" || el.type === "radio") el.checked = false; else el.value = ""; });
    };
  });
})();
