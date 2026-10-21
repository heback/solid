---
name: solid-quiz-design
description: SOLID 수업자료의 이해 수준 점검 문제(개념 확인, 위반 찾기, 리팩터링 실습, 서술형)와 해설, 종합 진단표 작성 규칙. 퀴즈·확인문제·평가 문항을 만들거나 고칠 때 사용.
---

# 이해 점검 설계 규칙

## 장별 퀴즈 구성 (4~6문항)
| 유형 | 수 | 목적 |
|------|----|------|
| 개념 확인 (OX/객관식) | 2 | 정의·용어 |
| 개념 적용 (선택) | 0~1 | 상황에 원칙 적용 판단 |
| 위반 찾기 (코드 제시) | 1~2 | 적용 판별 |
| 리팩터링 실습 | 1 | 직접 적용 |
| 서술형 | 1 | 이유 설명, 과잉 적용 판단 |

## 문항 형식 (HTML, 장 하단 `<section class="quiz">`)
```html
<div class="q" data-type="choice" data-answer="2">   <!-- choice | ox | open -->
  <h4>Q1. [개념 확인] (학습목표 1)</h4>
  <p>질문...</p>
  <ol class="options"><li>보기1</li><li>보기2</li><li>보기3</li></ol>
  <div class="explain">정답 / 왜 정답인가 / 왜 오답이 매력적인가</div>
</div>
```
- `choice`/`ox`: `assets/quiz.js`가 클릭 시 정오 표시 후 `.explain`을 연다. `data-answer`는 1부터 센 보기 번호(OX는 1=O, 2=X).
- `open`(위반 찾기·리팩터링·서술형): 보기 없음, "해설 보기" 버튼으로 `.explain` 토글.
- 문항마다 대응 학습목표 번호를 제목에 표기한다.

## 종합 진단표 (`solid_course/final_check.html`)
5원칙별 체크리스트("나는 ~를 설명할 수 있다") + 점수대별 다음 학습 안내.
