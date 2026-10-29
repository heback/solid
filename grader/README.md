# SOLID 평가 답안 제출·채점기

SOLID 평가(`solid_course/assessment/exam.html`) 전용입니다. 학생이 평가 화면에서 저장한 답안 JSON을 제출하면, 교사가 Gemini(`gemini-3.5-flash-lite`)로 채점하고 피드백 보고서를 학생에게 전송합니다.

| 화면 | 주소 | 사용자 | 기능 |
|---|---|---|---|
| 학생 | `/` (`index.html`) | `@ts.hs.kr` 계정 | 답안 파일 제출(다시 제출하면 덮어씀), 제출일시·채점 여부·피드백 보고서 링크 |
| 교사 | `/teacher.html` | `TEACHER_EMAILS`의 계정 | 제출 현황, 일괄·개별 채점(재채점은 덮어씀), 결과 조회·수정, 피드백 일괄·개별 전송 |
| 보고서 | `/report.html` | 본인(학생) 또는 교사 | 전송된 피드백 보고서(인쇄·PDF) |

## 데이터
- `exam_submissions/{uid}`: 제출 기록(학생이 읽을 수 있음). 파일은 Storage `exam/{uid}.json`(브라우저 접근 불가)
- `exam_results/{uid}`: 채점 결과(교사 전용). 전송 전에는 학생이 볼 수 없음
- `exam_reports/{uid}`: 전송 시점의 결과 복사본(학생이 읽는 보고서). 점수를 고친 뒤에는 다시 전송해야 학생 화면에 반영됨
- 학생이 다시 제출하면 이전 채점 결과와 전송한 보고서는 삭제됨

## 설정·배포
- 교사 계정: `functions/.env.<프로젝트ID>`의 `TEACHER_EMAILS`와 `firestore.rules`의 `isTeacher()` 이메일을 **둘 다** 맞춘다
- 정답·채점 기준: `functions/rubric/exam.json`(git 제외). `solid_course/assessment/answers.html`이 원본이며 고친 뒤 `node scripts/build_rubric.js`
```
firebase functions:secrets:set GEMINI_API_KEY      # 키 붙여 넣기
node scripts/build_rubric.js
firebase deploy
```
- Authentication에서 Google 로그인을 켜고, 승인된 도메인에 호스팅 주소를 추가한다
- 채점은 AI가 답안 텍스트와 코드를 읽고 하므로 코드를 실행하지는 않는다. 코드 문항은 교사가 결과 조회에서 확인·수정한다

## 이전 채점기 데이터
이전(학습지용) 채점기가 만든 Firestore `submissions` 컬렉션과 Storage `submissions/` 파일은 이 앱이 사용하지 않는다. 필요 없으면 Firebase 콘솔에서 삭제한다.
