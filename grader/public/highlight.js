// 파이썬 신택스 하이라이팅(공용): 교재·학습지·교사용 페이지가 함께 쓴다.
// 사용: <script src="assets/highlight.js" defer></script> — 모든 <pre><code>가 자동으로 칠해진다.
// 파이썬이 아닌 블록(실행 결과, 그림)은 <code class="out">으로 표시한다. window.pyHighlight(코드) 는 HTML 문자열을 돌려준다.
(function () {
  // 파이썬 신택스 하이라이팅: 주석·문자열·숫자·키워드·내장 함수·데코레이터·정의 이름을 <span class="tk-…">로 감싼다.
  const KW = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "));
  const BUILTIN = new Set("print len range int str float bool list dict set tuple type isinstance issubclass super object property staticmethod classmethod sorted sum min max abs round enumerate zip map filter any all open input repr id hasattr getattr setattr iter next format NotImplementedError ValueError TypeError Exception KeyError AttributeError".split(" "));
  const TOKEN = /(#[^\n]*)|([rRbBfFuU]{0,2}(?:"""[\s\S]*?(?:"""|$)|\'\'\'[\s\S]*?(?:\'\'\'|$)|"(?:\\.|[^"\\\n])*"?|\'(?:\\.|[^\'\\\n])*\'?))|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g;
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function highlight(code) {
    let out = "", last = 0, prev = "", m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += esc(code.slice(last, m.index));
      const t = m[0];
      let cls = "";
      if (m[1]) cls = "cm";
      else if (m[2]) cls = "str";
      else if (m[3]) cls = "deco";
      else if (m[4]) cls = "num";
      else if (KW.has(t)) cls = "kw";
      else if (prev === "def" || prev === "class") cls = "def";
      else if (t === "self" || t === "cls") cls = "self";
      else if (BUILTIN.has(t)) cls = "bi";
      out += cls ? '<span class="tk-' + cls + '">' + esc(t) + "</span>" : esc(t);
      if (m[5]) prev = t; else if (!/^\s*$/.test(t)) prev = "";
      last = TOKEN.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  // 본문의 코드 블록(<pre><code>)를 칠한다. 실행 결과·그림 등 파이썬이 아닌 블록은 <code class="out">으로 표시해 건너뛴다. "25  코드"처럼 줄 번호가 붙은 블록은 번호를 칠하지 않고 흐리게 둔다.
  function highlightBlocks() {
    document.querySelectorAll("pre > code:not(.out)").forEach(code => {
      if (code.dataset.hl) return;
      code.dataset.hl = "1";
      const text = code.textContent, lines = text.split("\n");
      const numbered = lines.filter(l => l.trim()).every(l => /^\d+(?: {2}|$)/.test(l));
      if (!numbered) { code.innerHTML = highlight(text); return; }
      const nums = lines.map(l => (l.match(/^\d+(?: {2}|$)/) || [""])[0]);
      const body = highlight(lines.map((l, i) => l.slice(nums[i].length)).join("\n")).split("\n");
      code.innerHTML = body.map((h, i) => '<span class="tk-ln">' + nums[i] + "</span>" + h).join("\n");
    });
  }
  window.pyHighlight = highlight;
  const st = document.createElement("style");
  st.textContent = `:root{--tk-cm:#6b7280;--tk-str:#0a7d3c;--tk-num:#b45309;--tk-kw:#c026d3;--tk-bi:#0b6bcb;--tk-def:#b91c1c;--tk-deco:#a16207;--tk-self:#7c3aed}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--tk-cm:#8b95a8;--tk-str:#7ee2a0;--tk-num:#fbbf72;--tk-kw:#f0a3ff;--tk-bi:#7cc4ff;--tk-def:#ff9b8f;--tk-deco:#f2d16b;--tk-self:#c4b0ff}}
:root[data-theme=dark]{--tk-cm:#8b95a8;--tk-str:#7ee2a0;--tk-num:#fbbf72;--tk-kw:#f0a3ff;--tk-bi:#7cc4ff;--tk-def:#ff9b8f;--tk-deco:#f2d16b;--tk-self:#c4b0ff}
.tk-cm{color:var(--tk-cm);font-style:italic}.tk-str{color:var(--tk-str)}.tk-num{color:var(--tk-num)}.tk-kw{color:var(--tk-kw);font-weight:600}
.tk-bi{color:var(--tk-bi)}.tk-def{color:var(--tk-def);font-weight:600}.tk-deco{color:var(--tk-deco)}.tk-self{color:var(--tk-self)}
.tk-ln{color:var(--tk-cm);user-select:none}
pre>code{font-variant-ligatures:none}`;
  document.head.appendChild(st);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", highlightBlocks); else highlightBlocks();
})();
