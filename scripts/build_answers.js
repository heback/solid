// teacher/sample_answers/session_N_예시정답.json 3개를 worksheets/answers.json ({입력칸키: 정답})으로 묶는다.
// 학습지의 정답 표시(assets/answers.js, T 키로 숨김/표시)가 읽는다. 예시 정답을 고친 뒤 다시 실행: node scripts/build_answers.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "solid_course");
const out = {};
for (const n of [1, 2, 3]) {
  const f = JSON.parse(fs.readFileSync(path.join(root, "teacher/sample_answers", `session_${n}_예시정답.json`), "utf8")).fields;
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith("id-") || k.startsWith("py-") || v === "" || v === false) continue;
    if (k in out && out[k] !== v) throw new Error("차시 사이에 겹치는 입력칸 키: " + k);
    out[k] = v;
  }
}
fs.writeFileSync(path.join(root, "worksheets", "answers.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length + "칸");
