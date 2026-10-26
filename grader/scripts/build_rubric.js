// 학습지 HTML + 교사용 정답 파일 -> functions/rubric/session_N.json (비공개 번들, git 제외)
// 사용: node grader/scripts/build_rubric.js   (정답·학습지를 고친 뒤 다시 실행하고 firebase deploy)
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../solid_course");
const OUT = path.resolve(__dirname, "../functions/rubric");

const text = html => html
  .replace(/<pre[\s\S]*?<\/pre>/g, " [코드 생략] ")
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
  .replace(/<option[^>]*>[^<]*<\/option>/g, "")
  .replace(/<\/(p|li|tr|h\d|div|details|table)>|<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();

const keyHtml = fs.readFileSync(path.join(ROOT, "teacher/answer_key.html"), "utf8");
const keyById = {};
for (const m of keyHtml.matchAll(/<h3 id="a(\d-\d)"[^>]*>([\s\S]*?)(?=<h[23] |<h2|$)/g)) keyById[m[1]] = text(m[0]);

fs.mkdirSync(OUT, { recursive: true });
for (const n of [1, 2, 3]) {
  const ws = fs.readFileSync(path.join(ROOT, `worksheets/session_${n}.html`), "utf8");
  const sample = JSON.parse(fs.readFileSync(path.join(ROOT, `teacher/sample_answers/session_${n}_예시정답.json`), "utf8")).fields;
  const activities = [];
  for (const m of ws.matchAll(/<section class="activity"[^>]*id="a(\d-\d)"[^>]*>([\s\S]*?)<\/section>/g)) {
    const [, id, body] = m;
    const title = text((body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || id);
    const keys = [...new Set([...body.matchAll(/data-k="([^"]+)"/g)].map(x => x[1]))];
    const py = [...body.matchAll(/class="pyedit" data-name="([^"]+)"/g)].map(x => x[1]);
    const solutions = {};
    for (const f of py) {
      keys.push("py-" + f);
      const sol = path.join(ROOT, "teacher/solutions", f.replace(/\.py$/, "_solution.py"));
      if (fs.existsSync(sol)) solutions["py-" + f] = fs.readFileSync(sol, "utf8");
    }
    if (!keyById[id]) throw new Error(`정답 파일에 활동 ${id} 없음`);
    activities.push({
      id, title, keys,
      worksheet: text(body),
      answerKey: keyById[id],
      exemplar: Object.fromEntries(keys.filter(k => k in sample).map(k => [k, sample[k]])),
      solutions,
    });
  }
  // 활동 밖 구역(예: 정의 확인 구역)의 입력칸은 바로 앞 활동에 붙인다.
  for (const m of ws.matchAll(/<section id="[^"]*">([\s\S]*?)<\/section>/g)) {
    const keys = [...m[1].matchAll(/data-k="([^"]+)"/g)].map(x => x[1]).filter(k => !k.startsWith("id-"));
    const prev = activities.filter(a => ws.indexOf(`id="a${a.id}"`) < m.index).pop();
    if (!keys.length || !prev) continue;
    prev.keys.push(...keys);
    prev.worksheet += "\n" + text(m[1].replace(/<details[\s\S]*?<\/details>/g, ""));
    for (const k of keys) if (k in sample) prev.exemplar[k] = sample[k];
  }
  const covered = new Set(activities.flatMap(a => a.keys));
  const idKeys = Object.keys(sample).filter(k => k.startsWith("id-"));
  const orphan = Object.keys(sample).filter(k => !covered.has(k) && !k.startsWith("id-"));
  if (orphan.length) console.warn(`session_${n}: 활동에 속하지 않은 입력칸`, orphan);
  fs.writeFileSync(path.join(OUT, `session_${n}.json`), JSON.stringify({ session: n, idKeys, activities }));
  console.log(`session_${n}: 활동 ${activities.length}개, 입력칸 ${covered.size}개`);
}
