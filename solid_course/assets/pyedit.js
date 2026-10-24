// 학습지 안 파이썬 편집기: 시작 코드를 고쳐 쓰고 브라우저에서 바로 실행한다(Pyodide, Web Worker).
// 마크업: <div class="pyedit" data-name="s1_discount.py"><script type="text/x-python">원본</script></div>
// 편집 내용은 textarea[data-k="py-파일명"]에 담기므로 worksheet.js의 자동 저장·JSON 저장/불러오기에 함께 들어간다.
// 이 파일은 worksheet.js보다 앞에 불러와야 한다(편집기 칸이 먼저 만들어져 있어야 worksheet.js가 저장된 내용을 복원한다).
(function () {
  const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";
  const TIMEOUT_MS = 15000; // 무한 반복 방지: 이 시간이 지나면 실행을 끝내고 작업자를 새로 만든다.

  // Worker 코드는 Blob URL로 만들어 별도 파일 없이도 file:// 로 열 수 있게 한다.
  const workerSrc = `
    importScripts("${PYODIDE}pyodide.js");
    let py = null, out = [];
    const flush = () => { if (out.length) { postMessage({ type: "out", text: out.join("") }); out = []; } };
    self.onmessage = async (e) => {
      const { id, code, name } = e.data;
      try {
        if (!py) {
          postMessage({ type: "status", text: "파이썬 불러오는 중… (처음 한 번, 몇 초 걸립니다)" });
          py = await loadPyodide({ indexURL: "${PYODIDE}" });
          py.setStdout({ batched: s => { out.push(s + "\\n"); flush(); } });
          py.setStderr({ batched: s => { out.push(s + "\\n"); flush(); } });
        }
        postMessage({ type: "status", text: "실행 중…" });
        // 실제 파일로 써서 실행해야 inspect.getsource, 트레이스백의 소스 줄 표시가 동작한다.
        py.FS.writeFile("/home/pyodide/" + name, code);
        // runpy.run_path는 python3 파일.py 와 같이 __main__ 모듈에 __file__을 달아 준다(inspect.getsource에 필요).
        await py.runPythonAsync("import runpy; runpy.run_path('/home/pyodide/" + name + "', run_name='__main__')");
        postMessage({ type: "done", id });
      } catch (err) {
        // 파이썬 예외는 학생 코드 파일이 나오는 줄부터만 보여 준다(runpy·Pyodide 내부 프레임 제거).
        let msg = String(err && err.message || err);
        const lines = msg.split("\\n"), i = lines.findIndex(l => l.includes("/home/pyodide/" + name));
        if (i >= 0) msg = (/SyntaxError/.test(msg) ? "" : "Traceback (most recent call last):\\n") + lines.slice(i).join("\\n").replaceAll("/home/pyodide/", "");
        postMessage({ type: "error", id, text: msg });
      }
    };`;

  let worker = null, ready = false;
  function newWorker() {
    if (worker) worker.terminate();
    worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: "text/javascript" })));
    ready = false;
  }

  // 예시 코드 목록(solutions.json)은 한 번만 내려받는다(없거나 file:// 에서 막히면 null → 예시 코드 버튼 없음).
  let solPromise = null;
  const loadSolutions = () => solPromise || (solPromise = fetch("solutions.json").then(r => r.ok ? r.json() : null).catch(() => null));

  const highlight = window.pyHighlight; // assets/highlight.js (이 파일보다 먼저 불러온다)

  function build(box) {
    const name = box.dataset.name;
    const src = box.querySelector("script").textContent.replace(/^\n/, "");
    box.innerHTML = "";
    const ta = document.createElement("textarea");
    ta.className = "pyedit-code";
    ta.dataset.k = "py-" + name;
    ta.spellcheck = false;
    ta.setAttribute("aria-label", name + " 코드 편집");
    if (!ta.value) ta.value = src;

    const bar = document.createElement("div");
    bar.className = "pyedit-bar";
    bar.innerHTML = '<b class="pyedit-name">' + name + '</b>'
      + '<button type="button" data-a="run">▶ 실행</button>'
      + '<button type="button" data-a="stop" hidden>■ 중지</button>'
      + '<button type="button" data-a="reset">↺ 처음 코드로</button>'
      + '<button type="button" data-a="dl">⬇ .py 저장</button>'
      + '<button type="button" data-a="sol" hidden>💡 예시 코드</button>'
      + '<span class="pyedit-status"></span>';
    const out = document.createElement("pre");
    out.className = "pyedit-out";
    out.textContent = "▶ 실행을 누르면 결과가 여기에 나옵니다. (Ctrl/⌘+Enter)";
    // 하이라이트 층(pre)을 아래에 깔고, 글자가 투명한 textarea를 그 위에 겹쳐 입력은 그대로 textarea가 받는다.
    const wrap = document.createElement("div");
    wrap.className = "pyedit-wrap";
    const hl = document.createElement("pre");
    hl.className = "pyedit-hl";
    hl.setAttribute("aria-hidden", "true");
    wrap.append(hl, ta);
    box.append(bar, wrap, out);

    const $ = a => bar.querySelector('[data-a="' + a + '"]');
    const status = t => { bar.querySelector(".pyedit-status").textContent = t; };
    let timer = null, runId = 0;

    const paint = () => { hl.innerHTML = highlight(ta.value) + "\n"; hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; };
    const fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 4, 560) + "px"; paint(); };
    ta.addEventListener("input", fit);
    ta.addEventListener("scroll", () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; });
    paint();
    requestAnimationFrame(fit);
    window.addEventListener("load", fit); // worksheet.js가 저장된 내용을 복원한 뒤 다시 그린다.

    // Tab = 공백 4칸, Shift+Tab = 내어쓰기(선택한 줄 전체). Enter는 앞 줄의 들여쓰기를 이어 간다.
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); return; }
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const set = (val, a, b) => { ta.value = val; ta.setSelectionRange(a, b); ta.dispatchEvent(new Event("input", { bubbles: true })); };
      if (e.key === "Tab") {
        e.preventDefault();
        if (s === en && !e.shiftKey) { set(v.slice(0, s) + "    " + v.slice(en), s + 4, s + 4); return; }
        const block = v.slice(ls, en), lines = block.split("\n");
        const edited = lines.map(l => e.shiftKey ? l.replace(/^ {1,4}/, "") : "    " + l).join("\n");
        const delta = edited.length - block.length;
        set(v.slice(0, ls) + edited + v.slice(en), e.shiftKey ? Math.max(ls, s - Math.min(4, (lines[0].match(/^ */)[0].length))) : s + 4, en + delta);
      } else if (e.key === "Enter" && s === en && !e.isComposing) {
        e.preventDefault();
        const line = v.slice(ls, s), ind = line.match(/^ */)[0] + (/:\s*$/.test(line) ? "    " : "");
        set(v.slice(0, s) + "\n" + ind + v.slice(en), s + 1 + ind.length, s + 1 + ind.length);
      }
    });

    function finish(msg) {
      clearTimeout(timer); timer = null;
      $("run").disabled = false; $("stop").hidden = true; status(msg);
    }
    function run() {
      if (!ta.value.trim()) ta.value = src;
      if (!worker) newWorker();
      const id = ++runId;
      out.textContent = ""; out.classList.remove("err");
      $("run").disabled = true; $("stop").hidden = false;
      status(ready ? "실행 중…" : "파이썬 불러오는 중…");
      timer = setTimeout(() => {
        newWorker();
        out.textContent += "\n⏱ " + TIMEOUT_MS / 1000 + "초 안에 끝나지 않아 멈췄습니다. 무한 반복이 없는지 확인하세요.";
        out.classList.add("err"); finish("시간 초과");
      }, TIMEOUT_MS + (ready ? 0 : 30000)); // 처음에는 내려받는 시간만큼 더 기다린다.
      worker.onmessage = e => {
        const m = e.data;
        if (m.type === "status") { status(m.text); if (m.text === "실행 중…") { ready = true; clearTimeout(timer); timer = setTimeout(() => { newWorker(); out.textContent += "\n⏱ 시간 초과"; out.classList.add("err"); finish("시간 초과"); }, TIMEOUT_MS); } }
        else if (m.type === "out") { out.textContent += m.text; out.scrollTop = out.scrollHeight; }
        else if (m.id !== id) return;
        else if (m.type === "done") finish("끝 ✔");
        else if (m.type === "error") { out.textContent += (out.textContent && !out.textContent.endsWith("\n") ? "\n" : "") + m.text; out.classList.add("err"); finish("오류"); }
      };
      worker.onerror = () => {
        out.textContent = "파이썬 실행 환경을 불러오지 못했습니다. 인터넷 연결(cdn.jsdelivr.net)을 확인하세요.";
        out.classList.add("err"); newWorker(); finish("불러오기 실패");
      };
      worker.postMessage({ id, code: ta.value, name });
    }
    $("run").onclick = run;
    $("stop").onclick = () => { newWorker(); out.textContent += "\n■ 사용자가 중지했습니다."; finish("중지됨"); };
    $("reset").onclick = () => {
      if (!confirm("편집한 코드를 지우고 처음 시작 코드로 되돌릴까요?")) return;
      ta.value = src; ta.dispatchEvent(new Event("input", { bubbles: true })); out.textContent = "";
    };
    $("dl").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ta.value], { type: "text/x-python" }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    // 예시 코드: solutions.json에 이 파일의 항목이 있을 때만 버튼을 보이고, 누르면 팝업(dialog)으로 연다.
    const dlg = document.createElement("dialog");
    dlg.className = "pyedit-pop";
    dlg.setAttribute("aria-label", name + " 예시 코드");
    document.body.append(dlg);
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); // 바깥(어두운 배경) 클릭으로도 닫힘
    loadSolutions().then(all => { if (all && all[name]) $("sol").hidden = false; });
    $("sol").onclick = async () => {
      const code = (await loadSolutions() || {})[name];
      if (code == null) return;
      dlg.innerHTML = '<div class="pyedit-pop-head"><b></b><button type="button" data-a="copy">복사</button><button type="button" data-a="close">✕ 닫기</button></div>'
        + '<p class="pyedit-pop-note">먼저 스스로 풀어 본 뒤 비교하세요.</p><pre></pre>';
      dlg.querySelector("b").textContent = name + " 예시 코드";
      dlg.querySelector("pre").innerHTML = highlight(code);
      dlg.querySelector('[data-a="close"]').onclick = () => dlg.close();
      dlg.querySelector('[data-a="copy"]').onclick = e => { navigator.clipboard && navigator.clipboard.writeText(code); e.target.textContent = "복사됨"; };
      dlg.showModal();
    };
    // 학습지의 '입력 지우기'·'JSON 불러오기'가 값을 바꾼 뒤에도 높이와 빈 칸을 맞춘다.
    document.addEventListener("click", e => {
      if (e.target.id === "ws-reset") setTimeout(() => { if (!ta.value) ta.value = src; fit(); }, 0);
    });
    document.addEventListener("change", e => { if (e.target.id === "ws-file") setTimeout(fit, 300); });
  }

  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll(".pyedit").forEach(build));
})();
