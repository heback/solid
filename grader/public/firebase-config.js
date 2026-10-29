// Firebase 웹 앱 설정값(공개되어도 되는 값). 보안은 Auth와 Functions의 계정 검사가 담당한다.
export const firebaseConfig = {
  apiKey: "AIzaSyBiKDXyO5mYdfPMp35fUU-efRyvz8Jnhk4",
  authDomain: "solid-grader-dshs.firebaseapp.com",
  projectId: "solid-grader-dshs",
  appId: "1:841438527421:web:56a5bd81d75da2294a9cd4",
};

// 교사 화면 표시용(화면 안내에만 쓰임). 실제 권한은 firestore.rules와 Functions의 TEACHER_EMAILS가 정한다.
export const TEACHER_EMAILS = ["heback@ts.hs.kr"];
