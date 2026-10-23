// 학습지의 <!--pyedit:파일명--> ... <!--/pyedit--> 구간에 worksheets/code/파일명 내용을 채워 넣는다.
// 사용: node scripts/embed_pyedit.js   (시작 코드를 고친 뒤 다시 실행하면 학습지 안 원본도 갱신된다)
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "solid_course", "worksheets");
for (const f of fs.readdirSync(dir).filter(n => /^session_\d\.html$/.test(n))) {
  const p = path.join(dir, f);
  const html = fs.readFileSync(p, "utf8");
  const out = html.replace(/<!--pyedit:([\w.]+)-->[\s\S]*?<!--\/pyedit-->/g, (_, name) => {
    const src = fs.readFileSync(path.join(dir, "code", name), "utf8");
    if (/<\/script/i.test(src)) throw new Error(name + ": </script 포함");
    return `<!--pyedit:${name}-->\n<div class="pyedit" data-name="${name}"><script type="text/x-python">\n${src}</script></div>\n<!--/pyedit-->`;
  });
  if (out !== html) fs.writeFileSync(p, out);
}
