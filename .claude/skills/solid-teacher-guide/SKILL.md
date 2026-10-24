---
name: solid-teacher-guide
description: SOLID 개념기반탐구학습지의 교사 가이드(차시별 운영 시나리오·발문·예상 반응·형성평가)와 별도 정답 파일(모범 답안·채점 기준·정답 코드)을 만드는 규칙. 교사용 가이드, 정답지, 채점기준, 루브릭, 지도안, 모범 답안 제작·수정 요청 시 반드시 사용.
---

# 교사 가이드 & 정답 파일 규칙

## 왜 두 파일로 분리하는가
정답이 학습지나 가이드에 섞이면 수업 중 화면 공유·인쇄 때 노출된다. 가이드(운영 방법)와 정답(채점 자료)을 따로 두어 교사가 필요한 것만 띄우게 한다.

## 파일
- `solid_course/teacher/teacher_guide.html` — 학습지·정답과 상호 링크 (정답 링크는 answer_key로만)
- `solid_course/teacher/answer_key.html` — 활동 번호 기준 정답
- `solid_course/teacher/solutions/sN_*_solution.py` — 정답 코드(실행 검증 필수)
- 공통 `assets/style.css`, `assets/teacher.css` 상대경로, 외부 CDN 금지. 상단에 "교사 전용" 배너, `@media print` 지원.

## 교사 가이드 구성
1. 전체 개요: 3차시 로드맵, 개념적 렌즈, 핵심 일반화, 차시별 학습목표, 준비물(PC·Python 3.12+), 사전 점검(사전 읽기 chapter_00)
2. 차시별(1~3) 시간표: 단계·활동 번호·형태·분·교사 역할 표
3. 활동별 운영 메모: 도입 발문 문구, **예상 학생 반응(정답형/오개념형)**, 오개념별 교정 질문(답을 말하지 않고 되묻기), 힌트 제공 시점
4. 모둠 편성·순회 지도 체크포인트, 막힐 때 개입 순서(힌트1 → 힌트2 → 짝 질문 → 교사)
5. 일반화 공개 멘트: 학생 진술을 정의와 대응시키는 방법
6. 형성평가·평가 계획: 퇴장권 해석표, 수행 평가 루브릭(상·중·하, 관찰 가능한 기준)
7. 시간 부족 시 줄이는 활동/더 하는 확장 활동(심화)
8. 문제 해결: 코드 실행 오류 FAQ

## 정답 파일 구성
- 활동 번호(예: 활동 2-3)로 학습지와 1:1 대응, 학습지에 있는 모든 입력칸에 정답/예시 답안.
- 열린 답: **모범 답안 + 허용 가능한 다른 답 + 감점 오답 유형**을 구분하고 채점 기준(2~3단계)을 둔다.
- 코드 TODO: 정답 코드 전문 + 왜 이렇게 쓰는지 한 줄 + 흔한 오답.
- 일반화 활동: 핵심 키워드 체크리스트(예: "변경 이유", "수정 없이 추가")와 점수 기준.
- 퇴장권 정답 및 오답별 진단.

## 검증
정답 코드는 `python3`로 실행해 학습지 시작 코드의 `assert`가 모두 통과함을 확인한다. 정답 파일 내용이 학습지 활동 번호/문항 수와 어긋나면 누락 목록을 qa-reviewer에게 알린다.

## 학생 제출 모아보기 (교사 뷰어)
- 학생은 학습지 하단 `💾 JSON 저장`으로 `session_N_학번_이름.json`(학습지당 파일 하나)을 내려받아 제출하고, `📂 JSON 불러오기`로 이어서 작업한다. 형식: `{format:"solid-worksheet", version:1, page, savedAt, fields:{data-k: 값}}`.
- 교사는 `solid_course/teacher/student_viewer.html`에 여러 파일을 끌어다 놓아 전체 현황(진행도), 활동별 나란히 비교, 학생별 보기, CSV 내보내기를 쓴다. 화면 공유용 "이름 숨기기" 제공. 파일은 브라우저 안에서만 처리된다.
- 뷰어는 `scripts/build_student_viewer.js`가 학습지에서 활동·입력칸 메타를 뽑아 `assets/student_viewer.template.html`에 넣어 생성한다. **학습지의 data-k나 활동 제목을 바꾸면 반드시 다시 빌드한다**: 임시 폴더에서 `npm i jsdom` 후 `NODE_PATH=<그 폴더>/node_modules node .claude/skills/solid-teacher-guide/scripts/build_student_viewer.js solid_course`.
- 학습지 `data-k`는 입력칸마다 고유해야 하며 저장 JSON의 키가 된다(바꾸면 기존 제출 파일과 호환이 깨진다).

## 코드 신택스 하이라이팅 (필수)

교사 가이드·정답 파일에 나오는 코드도 신택스 하이라이팅이 되어야 한다. `solid-inquiry-worksheet` 스킬의 '코드 신택스 하이라이팅' 규칙을 따른다. 교사용 HTML은 `<script src="../assets/highlight.js" defer></script>`를 포함한다.
