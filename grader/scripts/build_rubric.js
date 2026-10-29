// 평가 문제·모범 정답·채점 기준 -> functions/rubric/exam.json (비공개 번들, git 제외)
// 사용: node grader/scripts/build_rubric.js   (정답을 고친 뒤 다시 실행하고 firebase deploy)
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../solid_course/assessment");
const OUT = path.resolve(__dirname, "../functions/rubric");

// 학생에게 보이는 문제 글과 교사용 정답 글을 평문으로 바꾼다. 실행 결과(code.out)는 남기고 나머지 코드는 뺀다.
const text = html => html
  .replace(/<pre><code class="out">([\s\S]*?)<\/code><\/pre>/g, "\n[실행 결과]\n$1\n")
  .replace(/<pre[\s\S]*?<\/pre>/g, " [코드 생략] ")
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
  .replace(/<option[^>]*>[^<]*<\/option>/g, "")
  .replace(/<textarea[^>]*><\/textarea>|<input[^>]*>|<select[\s\S]*?<\/select>/g, "")
  .replace(/<\/(p|li|tr|h\d|div|details|table)>|<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");
const exam = read("exam.html"), key = read("answers.html");

// 문항별 소문항: [id, 정답 파일의 <h3> 접두어, 라벨, 만점, 코드 입력칸 키 또는 null]
const CODE = { 2: "q2_log_collector.py", 3: "q3_game_skills.py", 4: "q4_payment.py", 5: "q5_delivery_robot.py" };
const SPEC = {
  1: [["1-1", "(1)", "상황 A~E 원칙 판단", 10], ["1-2", "(2)", "과잉 적용 판단", 5]],
  2: [["2-1", "(1)", "변경 이유 3가지", 6], ["2-2", "(2)", "변경 영향 추적", 8], ["2-3", "(3)", "DIP 설명과 개선 구조", 6]],
  3: [["3-1", "(1)", "실행 결과 예측", 8], ["3-2", "(2)", "약속 위반 판정", 8], ["3-3", "(3)", "호출부 타입 분기", 4]],
  4: [["4-1", "(1)(2)", "리팩터링과 기능 추가(코드)", 15], ["4-3", "(3)", "OCP 서술", 5]],
  5: [["5-1", "(1)", "ISP·DIP 위반 분석", 8], ["5-2", "(2)", "구현(코드)", 14], ["5-3", "(3)", "DIP 서술", 3]],
};

const items = [];
const questions = {};
let total = 0;
for (const q of [1, 2, 3, 4, 5]) {
  const qsec = exam.match(new RegExp(`<section class="qsec[^"]*" id="q${q}">([\\s\\S]*?)</section>`))[1];
  const keys = [...new Set([...qsec.matchAll(/data-k="([^"]+)"/g)].map(x => x[1]))];
  const ans = key.match(new RegExp(`<h2 class="qa" id="a${q}">[\\s\\S]*?(?=<h2 class="qa"|<section id="verify")`))[0];
  const parts = ans.split(/(?=<h3>)/).slice(1);
  const starter = CODE[q] ? fs.readFileSync(path.join(ROOT, "code", CODE[q]), "utf8") : "";
  const solution = CODE[q] ? fs.readFileSync(path.join(ROOT, "code/solutions", CODE[q]), "utf8") : "";
  questions[q] = { text: text(qsec), starterCode: q === 2 || q === 3 ? starter : "", solutionCode: q >= 4 ? solution : "" };
  for (const [id, prefix, label, max] of SPEC[q]) {
    // "(1)"이 "(1)(2)"와 헷갈리지 않도록 접두어 바로 뒤가 공백인 h3만 고른다.
    const part = parts.find(p => { const h = text(p.match(/<h3>([\s\S]*?)<\/h3>/)[1]); return h.startsWith(prefix + " "); });
    if (!part) throw new Error(`정답 파일에서 문항 ${q} ${prefix} 를 찾지 못했습니다`);
    const n = prefix[1]; // "(3)" -> 3. 입력칸 키는 q{문항}-{소문항}으로 시작한다.
    const own = id === "4-1" ? ["py-q4_payment.py"] : id === "5-2" ? ["py-q5_delivery_robot.py"]
      : keys.filter(k => k === `q${q}-${n}` || k.startsWith(`q${q}-${n}-`));
    items.push({ id, q, label, max, keys: own, answerKey: text(part) });
    total += max;
  }
}
const common = text(key.match(/<section id="common">([\s\S]*?)<\/section>/)[1]);
// 입력칸이 어느 소문항에도 속하지 않는지 점검한다(이름·학번 제외).
const covered = new Set(items.flatMap(i => i.keys));
const allKeys = [...new Set([...exam.matchAll(/data-k="([^"]+)"/g)].map(x => x[1]))].filter(k => !k.startsWith("id-"));
const orphan = allKeys.filter(k => !covered.has(k) && !k.startsWith("py-"));
if (orphan.length) throw new Error("소문항에 속하지 않은 입력칸: " + orphan.join(", "));
if (total !== 100) throw new Error("배점 합계가 100이 아닙니다: " + total);

fs.mkdirSync(OUT, { recursive: true });
const starters = Object.fromEntries([4, 5].map(q => ["py-" + CODE[q], fs.readFileSync(path.join(ROOT, "code", CODE[q]), "utf8")]));
fs.writeFileSync(path.join(OUT, "exam.json"), JSON.stringify({ common, questions, items, starters }));
console.log(`exam.json: 소문항 ${items.length}개, 입력칸 ${covered.size}개, 합계 ${total}점`);
