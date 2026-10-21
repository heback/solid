---
name: solid-lesson-orchestrator
description: 파이썬 기반 SOLID 원칙(SRP·OCP·LSP·ISP·DIP) 수업자료를 개념기반탐구학습지(3차시, 학생 활동 중심) + 교사 가이드 + 별도 정답 파일로 제작하는 오케스트레이터. SOLID/객체지향 수업자료·학습지·탐구활동·교사용 가이드·정답지 제작, 다시 실행, 재실행, 수정, 보완, 특정 차시/원칙만 다시, 이전 결과 기반 개선, 퀴즈만 업데이트 요청 시 반드시 사용.
---

# SOLID 수업자료 오케스트레이터

**실행 모드:** 하이브리드 — 설계(서브) → 학습지 집필 3차시 병렬(서브) → 교사 가이드·정답(서브) → QA(서브, 차시 완성 직후 점진적). 모든 Agent 호출은 `model: "opus"`, 에이전트 정의 파일(`.claude/agents/`)의 역할을 prompt에 첨부한다. 팀 도구가 없는 환경에서는 파일 기반 전달로 동일하게 동작한다.

## Phase 0: 컨텍스트 확인
- `_workspace/01_designer_blueprint.md` 없음 → 초기 실행(기존 교재 `solid_course/chapter_*`는 사전 읽기 자료로 보존)
- 있음 + 부분 수정 요청(예: "2차시 활동 3 바꿔줘", "정답만 보완") → 해당 에이전트만 재호출
- 있음 + 새 요구(수업 시수·대상 변경) → `_workspace_prev/`로 이동 후 초기 실행

## Phase 1: 청사진 — curriculum-designer
`solid-inquiry-worksheet` 기준 3차시 청사진 → `_workspace/01_designer_blueprint.md`.

## Phase 2: 학습지 — worksheet-writer × 3 (차시별 병렬)
`solid_course/worksheets/session_N.html`, `worksheets/code/sN_*.py`, `_workspace/02_session{N}_*`. 공통 `assets/worksheet.css`·`worksheet.js`는 리더가 먼저 1회 작성하거나 writer 1이 작성 후 공유한다(충돌 방지: 리더가 선작성 권장).

## Phase 3: 교사 가이드·정답 — teacher-guide-writer (+ quiz-designer 퇴장권 채점기준)
`solid_course/teacher/{teacher_guide.html, answer_key.html, solutions/*.py}`.

## Phase 4: QA — qa-reviewer (차시 완성 직후 점진적, 최종 1회 교차)
`_workspace/04_qa_report_session{N}.md`. 문제는 담당 에이전트에 반려 후 재검수.

## Phase 5: 통합 — 리더
`solid_course/index.html`을 수업용 진입점으로 개정(학생: 학습지 3종·사전 읽기, 교사: 가이드/정답 링크는 `teacher/` 안내로만). CLAUDE.md 이력 갱신.

## 데이터 흐름
blueprint → 학습지·시작 코드·활동 인덱스·임시 풀이 → 가이드·정답·정답 코드 → QA 보고

## 에러 핸들링
- 코드 실행 실패: 1회 재시도 후 QA 보고에 명시하고 진행
- 정답 이견: 삭제하지 않고 근거 병기하여 qa가 담당자에 반려
- 학습지와 정답 불일치: 학습지를 기준으로 정답을 고친다(학습지 결함이면 writer 수정)

## 완료 후
결과 요약과 "개선할 부분이 있나요?" 피드백 요청. 반영 내용은 CLAUDE.md 변경 이력에 기록.

## 테스트 시나리오
- 정상: "SOLID 학습지 3차시로 만들어줘" → 학습지 3 + 가이드 1 + 정답 1, 모든 코드 실행 성공, 학습지에 정답 없음
- 에러: 정답 코드가 assert 실패 → 원인 분리 후 해당 담당자 수정 → QA 재통과
- 부분: "3차시 전이 활동만 더 어렵게" → worksheet-writer(3차시)만 재호출 후 정답 동기화
