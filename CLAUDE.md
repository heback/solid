# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 하네스: 파이썬 SOLID 수업자료 제작

**목표:** 파이썬 기반 SOLID 원칙 수업자료(개념+상황+주석 코드+박스 설명란+이해 점검) 제작

**트리거:** SOLID/객체지향 수업자료 제작·수정·재실행 요청 시 `solid-lesson-orchestrator` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-10-09 | 초기 구성 | 전체 | - |
| 2026-10-09 | 산출물 형식 Markdown → HTML | skills 3종, agents 3종 | 사용자 요청(html 파일로 제작) |
| 2026-10-09 | 퀴즈 유형 '개념 적용' 추가 | skills/solid-quiz-design | 첫 실행 QA에서 표에 없는 유형 사용 발견 |
| 2026-10-21 | 산출물을 개념기반탐구학습지(3차시) + 교사 가이드 + 별도 정답 파일로 전환. 기존 7장 교재는 사전 읽기 자료로 보존 | skills/solid-lesson-orchestrator(개정), skills/solid-inquiry-worksheet·solid-teacher-guide(신규), agents/worksheet-writer·teacher-guide-writer(신규), curriculum-designer·qa-reviewer·quiz-designer(수정) | 사용자 요청(개념기반탐구학습지, 학생 활동 극대화, 3차시, 교사 가이드·정답 분리) |
| 2026-10-21 | 학습지 시작 코드 점검은 '구체 타입 힌트로 우회'하는 오답을 잡는지 검증, 정의 박스는 일반화 후 열람(details)으로 규칙화 | skills/solid-inquiry-worksheet | 첫 실행 QA에서 점검 구멍·정의 선공개 발견 |
| 2026-10-21 | 학습지 입력 JSON 저장/불러오기(학습지당 파일 하나, 고정 파일명) 추가, 교사용 학생 제출 뷰어(student_viewer) 추가 | assets/worksheet.js, skills/solid-teacher-guide(scripts·assets 추가) | 사용자 요청(학생 데이터 JSON 저장·불러오기, 교사가 학생 파일 불러오기) |
| 2026-10-22 | 학습지 입력칸 전체(1~3차시)의 예시 정답 JSON 추가(학습지 `📂 JSON 불러오기`로 불러올 수 있는 형식, 교사용·비공개) | teacher/sample_answers/session_N_예시정답.json | 사용자 요청(교사 참조용 예시 정답, 학습지에서 불러오기) |
| 2026-10-22 | 시작 코드 내려받기 링크(개별 파일 + 배포 시 생성되는 zip)와 실행 안내 수정, 학습지 머리말에 링크 추가 | index.html, worksheets/session_1~3.html, .github/workflows/pages.yml | 사용자 요청(학생에게 solid_course 폴더가 제공되지 않음) |
| 2026-10-23 | 대상 Python 버전 3.10+ → 3.12+ 로 표기 통일(index, 학습지 머리말, 시작 코드 docstring, 교사 가이드·정답 파일, skills 3종). 3.12·3.13에서 시작 코드·정답 코드·교재 코드 전부 실행 확인 | index.html, worksheets/*, teacher/*, skills/solid-lesson-writing·solid-inquiry-worksheet·solid-teacher-guide | 사용자 요청(Python 3.12 이상 기준) |
| 2026-10-24 | 학습지 안 파이썬 편집기 추가: 시작 코드 10개를 활동 안에서 수정·실행(Pyodide v0.29.5 / Python 3.13, Web Worker, 15초 시간 제한·중지 버튼, 편집 내용은 자동 저장·JSON에 포함). 시작 코드를 고친 뒤에는 `node scripts/embed_pyedit.js`로 학습지 안 원본을 갱신 | assets/pyedit.js·worksheet.css, scripts/embed_pyedit.js, worksheets/session_1~3.html, index.html, skills/solid-inquiry-worksheet | 사용자 요청(코드 수정이 필요한 곳에 파이썬 편집기, 브라우저에서 pyodide) |
| 2026-10-24 | 편집기에 💡 예시 코드 버튼 추가(누르면 팝업 레이어로 정답 코드 표시, 닫기 버튼·배경 클릭·Esc로 닫음, 비밀번호 없음). 정답은 worksheets/solutions.json으로 배포되어 학생도 열람 가능. 정답을 고친 뒤에는 `node scripts/build_solutions.js` 재실행 | assets/pyedit.js·worksheet.css, scripts/build_solutions.js, worksheets/solutions.json | 사용자 요청(예시 코드 코드를 팝업으로 제시, 비밀번호는 제거) |
| 2026-10-25 | 편집기·예시 코드 팝업에 파이썬 신택스 하이라이팅 추가(하이라이트 층 pre + 투명 글자 textarea 겹침, 라이트/다크 색 변수 `--tk-*`) | assets/pyedit.js·worksheet.css | 사용자 요청(편집기 코드 신택스 하이라이팅) |
| 2026-10-25 | 학습지 본문 코드 블록(pre>code) 전체 하이라이팅 자동 적용, 줄 번호 흐리게. 모든 코드 하이라이팅을 스킬 규칙으로 명시 | assets/pyedit.js·worksheet.css, skills/solid-inquiry-worksheet·solid-lesson-writing·solid-teacher-guide | 사용자 요청(학습지 모든 코드·앞으로의 모든 코드 하이라이팅) |
| 2026-10-25 | 하이라이팅을 공용 assets/highlight.js로 분리(색 변수·자동 적용 포함)하고 교재 7장·교사용 answer_key/teacher_guide·학습지에 연결. 실행 결과·그림 블록은 `<code class="out">`으로 제외 | assets/highlight.js(신규)·pyedit.js·worksheet.css, chapter_00~06, worksheets, teacher/*, skills 3종 | 사용자 요청(교재 7장·교사용 파일 하이라이팅) |
| 2026-10-29 | SOLID 평가 문항 출제 경로 추가: 개념·분석·구현 5문항 + 도움 자료(힌트) + 모범 정답을 별도 파일(exam/hints/answers)로 제작 | skills/solid-assessment-design(신규), agents/quiz-designer(수정), skills/solid-lesson-orchestrator(Phase 6, description) | 사용자 요청(SOLID 개념·코드 분석·구현 능력 측정 문제 5개) |
| 2026-10-29 | 채점기를 학습지용에서 SOLID 평가 전용으로 전면 교체: 학생 제출 화면(제출일시·채점 여부·보고서 링크), 교사 화면(제출 현황, 일괄·개별 채점·재채점 덮어쓰기, 결과 조회·수정, 피드백 일괄·개별 전송), 전송 전 결과 비공개(exam_results → exam_reports 복사). 정답은 `node grader/scripts/build_rubric.js`로 assessment/answers.html에서 번들 | grader/* | 사용자 요청(학생 답안 제출, 평가 전용 채점·피드백) |
| 2026-10-30 | 디자인 시스템 설계·적용: 토큰(assets/tokens.css: 색·글자·간격·모서리·그림자, 라이트/다크, 구버전 변수 별칭)과 공통·학습지 컴포넌트(style.css·worksheet.css) 전면 개선(종이색 바탕+남색 강조, Pretendard, 활동 카드 윗띠, 부유형 도구 모음, 모바일 표 가로 스크롤). 규칙 문서 design-system.html 추가 | assets/tokens.css(신규)·style.css·worksheet.css, design-system.html(신규), index.html, skills/solid-inquiry-worksheet | 사용자 요청(학습활동 자료 디자인 개선, 디자인 시스템 설계) |
| 2026-10-30 | 학습지 3종에 정답 표시 추가: 입력칸 아래 정답 박스·정답 선택지 표시·편집기 아래 정답 코드, T 키(또는 도구 모음 버튼)로 숨김/표시(상태는 브라우저에 기억). 정답은 worksheets/answers.json(예시 정답 JSON에서 생성). 예시 정답을 고친 뒤에는 `node scripts/build_answers.js` 재실행 | assets/answers.js(신규)·worksheet.css, scripts/build_answers.js(신규), worksheets/answers.json(신규), worksheets/session_1~3.html | 사용자 요청(학습지에 정답, T 키 토글) |
