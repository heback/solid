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
