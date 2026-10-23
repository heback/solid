// teacher/solutions/*_solution.py 를 비밀번호로 암호화해 worksheets/solutions.enc.json 으로 만든다.
// (teacher/ 폴더는 공개 저장소에 올리지 않으므로, 평문 대신 암호문만 학습지와 함께 배포한다.)
// 사용: node scripts/encrypt_solutions.js <비밀번호>
// 방식: PBKDF2-SHA256(20만 회) → AES-256-GCM. assets/pyedit.js 가 브라우저(WebCrypto)에서 같은 방식으로 푼다.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const pw = process.argv[2];
if (!pw) { console.error("사용: node scripts/encrypt_solutions.js <비밀번호>"); process.exit(1); }
const root = path.join(__dirname, "..", "solid_course");
const dir = path.join(root, "teacher", "solutions");
const out = {};
for (const f of fs.readdirSync(dir).filter(n => n.endsWith("_solution.py"))) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pw, salt, 200000, 32, "sha256");
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(fs.readFileSync(path.join(dir, f), "utf8"), "utf8"), c.final(), c.getAuthTag()]); // WebCrypto 형식: 암호문 뒤에 태그
  out[f.replace("_solution.py", ".py")] = { salt: salt.toString("base64"), iv: iv.toString("base64"), data: enc.toString("base64") };
}
fs.writeFileSync(path.join(root, "worksheets", "solutions.enc.json"), JSON.stringify(out));
console.log(Object.keys(out).length + "개 암호화:", Object.keys(out).join(", "));
