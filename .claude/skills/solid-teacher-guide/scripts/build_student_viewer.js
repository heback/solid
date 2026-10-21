// 학습지(worksheets/session_N.html)에서 활동·입력칸 메타데이터를 뽑아
// assets/student_viewer.template.html 의 /*META*/ 자리에 넣어 teacher/student_viewer.html 을 만든다.
// 사용: 임시 폴더에서 `npm i jsdom` 후  node build_student_viewer.js <solid_course 경로>
// 학습지 입력칸(data-k)이나 활동 제목이 바뀌면 다시 실행한다.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2] || "solid_course");
const clean = s => s.replace(/\s+/g, " ").trim();
const meta = {};
for (let n = 1; n <= 3; n++) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, "worksheets", `session_${n}.html`), "utf8"));
  const doc = dom.window.document;
  const page = `session_${n}.html`;
  const title = clean((doc.querySelector("h1") || {}).textContent || page);
  const acts = {};
  doc.querySelectorAll("section.activity h3").forEach(h => {
    const m = clean(h.textContent).match(/^활동\s*(\d+-\d+)\.?\s*(.*)$/);
    if (m) acts[m[1]] = { id: m[1], title: m[2], type: h.closest("section").dataset.type || "", fields: [] };
  });
  const fieldLabel = el => {
    if (el.id) { const l = doc.querySelector(`label[for="${el.id}"]`); if (l) return clean(l.textContent); }
    const lab = el.closest("label"); if (lab) return clean(lab.textContent);
    const td = el.closest("td");
    if (td) {
      const tr = td.parentElement, i = Array.from(tr.children).indexOf(td);
      const head = (tr.closest("table").querySelector("tr") || {}).children;
      const rowH = clean(tr.children[0].textContent), colH = head && head[i] ? clean(head[i].textContent) : "";
      return td === tr.children[0] ? rowH : clean(rowH + (colH ? " / " + colH : ""));
    }
    const box = el.closest("li, p, div, fieldset");
    if (box) { const c = box.cloneNode(true); c.querySelectorAll("textarea, input, select, details, .q-level").forEach(x => x.remove()); const t = clean(c.textContent); if (t) return t; }
    let p = el.previousElementSibling; while (p) { const c = p.cloneNode(true); c.querySelectorAll(".q-level").forEach(x => x.remove()); const t = clean(c.textContent); if (t) return t; p = p.previousElementSibling; }
    return "";
  };
  const fields = [];
  doc.querySelectorAll("main textarea, main input, main select").forEach(el => {
    const k = el.dataset.k; if (!k) return;
    const f = { k, type: el.tagName === "TEXTAREA" ? "textarea" : el.tagName === "SELECT" ? "select" : el.type, group: el.name || "", label: fieldLabel(el).slice(0, 80) };
    if (el.type === "radio" || el.type === "checkbox") f.value = el.value || "";
    f.el = el;
    fields.push(f);
  });
  const ids = [], etc = [];
  fields.forEach(f => {
    // 소속 활동: DOM에서 가장 가까운 section.activity 의 번호 → 없으면 키 접두사(N-k-) → 기타
    const sec = f.el.closest("section.activity"), h = sec && sec.querySelector("h3");
    const hm = h && clean(h.textContent).match(/^활동\s*(\d+-\d+)/), km = f.k.match(/^(\d+-\d+)-/);
    const aid = hm ? hm[1] : km ? km[1] : null;
    delete f.el;
    if (f.k.startsWith("id-")) ids.push(f);
    else if (aid && acts[aid]) acts[aid].fields.push(f);
    else etc.push(f);
  });
  if (etc.length) acts["etc"] = { id: "etc", title: "기타 입력칸", type: "", fields: etc };
  meta[page] = { page, title, ids, activities: Object.values(acts) };
}
const tpl = fs.readFileSync(path.join(__dirname, "..", "assets", "student_viewer.template.html"), "utf8");
const out = path.join(root, "teacher", "student_viewer.html");
fs.writeFileSync(out, tpl.replace("/*META*/null", JSON.stringify(meta)));
console.log("wrote", out, Object.values(meta).map(m => m.page + ":" + m.activities.length + "활동").join(" "));
