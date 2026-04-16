# G2B-BID-REPORT 아키텍처 및 개발 설계

## 1. 프로젝트 목적
나라장터 입찰공고 OpenAPI를 기반으로 신규 공고를 수집하고, 키워드 기반 필터링 결과를 웹 화면과 이메일, Excel 파일로 제공하는 다중 사용자용 서비스.

---

## 2. 주요 기능
- 다중 사용자 로그인
- 키워드/수신자/스케줄 관리
- 신규 공고 자동 수집
- 결과 목록 조회 및 검색
- Excel 다운로드
- 이메일 요약 발송
- 추후 서버 배포 가능한 구조

---

## 3. 기술 스택
- Frontend: Next.js (App Router), TypeScript
- Backend: Next.js API Routes / Server Actions
- DB: Prisma + SQLite (초기), 추후 Postgres 전환 가능
- Auth: NextAuth 또는 커스텀 Credential 로그인
- Mail: Nodemailer (Hiworks SMTP)
- Scheduler: node-cron
- Export: xlsx
- Validation: zod

---

## 4. 데이터 모델 초안
### User
- id
- email
- passwordHash
- name
- role (admin/user)
- createdAt
- updatedAt

### Recipient
- id
- email
- name
- active
- userId

### KeywordRule
- id
- keyword
- type (include/exclude)
- active
- userId

### BidNotice
- id
- bidNtceNo
- bidNtceOrd
- title
- organization
- noticeDate
- closeDate
- baseAmount
- detailUrl
- rawJson
- createdAt

### CollectedResult
- id
- bidNoticeId
- matchedKeyword
- collectedAt
- emailedAt
- status

### ScheduleSetting
- id
- collectTime
- sendTime
- timezone
- active
- userId

### MailHistory
- id
- recipient
- subject
- sentAt
- status
- errorMessage

---

## 5. 화면 구성

### 5.1 로그인 화면
- 이메일
- 비밀번호
- 로그인 버튼

### 5.2 대시보드
- 오늘 수집 건수
- 오늘 발송 건수
- 최근 오류
- 바로가기 카드

### 5.3 설정 화면
- 키워드 추가/삭제
- 제외 키워드 설정
- 수신자 추가/삭제
- 수집 시각 / 발송 시각 설정
- SMTP/발송자 정보 확인

### 5.4 결과 화면
- 공고 목록 테이블
- 컬럼: 공고명 / 기관 / 공고일 / 마감일 / 기초금액 / 링크
- 검색 및 정렬
- 날짜 필터
- Excel 다운로드 버튼

### 5.5 발송 이력 화면
- 발송 일시
- 수신자
- 상태
- 실패 원인

---

## 6. API 구성 초안
### 인증
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/session

### 설정
- GET /api/settings
- POST /api/settings
- PUT /api/settings/:id

### 키워드
- GET /api/keywords
- POST /api/keywords
- DELETE /api/keywords/:id

### 수신자
- GET /api/recipients
- POST /api/recipients
- DELETE /api/recipients/:id

### 공고
- GET /api/bids
- POST /api/bids/collect
- GET /api/bids/:id

### 내보내기
- GET /api/export/xlsx

### 메일
- POST /api/mail/send-daily
- GET /api/mail/history

---

## 7. 스케줄 동작
### 매일 18:00
- 나라장터 API 조회
- 신규 공고 저장
- 키워드 매칭 결과 저장

### 매일 09:00
- 전일 수집 결과 중 미발송 건 조회
- 수신자별 이메일 생성
- Excel 첨부 또는 링크 포함
- 발송 후 이력 저장

---

## 8. 배포 확장 고려사항
- SQLite → Postgres 마이그레이션 가능하게 Prisma 유지
- 환경변수 분리 (.env.local / production)
- SMTP 및 API 키는 서버 환경변수 사용
- GitHub Actions 추가 가능

---

## 9. 개발 우선순위
1. Prisma 스키마 확정
2. 로그인/세션 구현
3. 설정 화면 구현
4. 나라장터 수집 모듈 구현
5. 결과 화면 구현
6. Excel 다운로드 구현
7. 메일 발송 구현
8. 스케줄러 연결
9. GitHub 반영 및 문서화

---

## 10. 주의사항
- `.env` 절대 GitHub 업로드 금지
- 공공 API 응답 로그에 민감정보가 섞이지 않도록 raw 저장 범위 제한
- 중복 공고 기준은 bidNtceNo + bidNtceOrd 조합으로 처리
