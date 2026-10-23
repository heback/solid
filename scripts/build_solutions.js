// teacher/solutions/*_solution.py 를 worksheets/solutions.json ({"s1_discount.py": "정답 코드", ...}) 으로 묶는다.
// 학습지 편집기의 '💡 예시 정답' 팝업이 이 파일을 읽는다. 정답을 고친 뒤 다시 실행: node scripts/build_solutions.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "solid_course");
const dir = path.join(root, "teacher", "solutions");
const out = {};
for (const f of fs.readdirSync(dir).filter(n => n.endsWith("_solution.py")).sort())
  out[f.replace("_solution.py", ".py")] = fs.readFileSync(path.join(dir, f), "utf8").replace(/\[교사용 [^\]]*학생 배포 금지\] /, "");
fs.writeFileSync(path.join(root, "worksheets", "solutions.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length + "개:", Object.keys(out).join(", "));
