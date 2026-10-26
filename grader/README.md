# SOLID 학습지 AI 채점기

학생이 학습지에서 저장한 JSON을 올리면 Gemini(`gemini-3.5-flash-lite`)가 활동별로 채점하고 피드백을 씁니다. 결과는 PDF로 내려받습니다.

- 로그인: Firebase Auth, Google 계정, `@ts.hs.kr`만 허용(화면 + Functions에서 모두 검사)
- 서버: `functions/` (Cloud Functions 2세대, 서울). Gemini 키는 Secret Manager의 `GEMINI_API_KEY`
- 정답·채점 기준: `functions/rubric/`(git 제외). `solid_course/teacher/`가 원본이며 고친 뒤 `node grader/scripts/build_rubric.js` 후 재배포
- 화면: `public/`(Firebase Hosting). 웹 앱 설정값은 `public/firebase-config.js`

## 배포
```
firebase functions:secrets:set GEMINI_API_KEY      # 키 붙여 넣기
node scripts/build_rubric.js
firebase deploy
```
채점 가능한 교사를 제한하려면 `functions/.env.<프로젝트ID>`에 `TEACHER_EMAILS=a@ts.hs.kr,b@ts.hs.kr`.
