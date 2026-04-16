# 나라장터 입찰공고 자동 수집·메일 발송 서비스 설계

## 목표
- **나라장터 입찰공고정보서비스 API**를 이용해 **키워드 기반 신규 공고**를 수집
- **매일 18:00 수집**, **매일 09:00 이메일 발송**
- **Excel(.xlsx) 다운로드** 제공
- **관리화면/결과화면 반응형 UI**
- **로그인(다중 사용자) 지원**
- 로컬 실행 우선, 추후 서버 배포 가능

---

## 핵심 요구사항
- 키워드: `AI, 인공지능, 구축, 플랫폼` (수정 가능)
- 신규 공고만 전송 (사전공고/공고 기준)
- 기본 수신자: `bca@sunyoutech.com` (추가 가능)
- SMTP: `smtps.hiworks.com:465` (SSL)
- 표시명: `렘짱`
- 요약 필드: 공고명 / 발주기관 / **공고일** / 마감일 / 기초금액 / 링크

---

## 시스템 구성(확장형)
### 1) 백엔드
- **Next.js App Router**
- **API Routes**: 데이터 수집, 필터, 엑셀 생성, 메일 발송
- **DB**: 초기 로컬(SQLite) → 추후 Postgres/MySQL
- **Scheduler**: node-cron 또는 서버 cron

### 2) 프론트엔드(반응형)
- **관리화면**
  - 키워드 관리
  - 수신자 목록 관리
  - 수집/발송 시간 설정
  - 저장 버튼
- **결과화면**
  - 공고 리스트 테이블
  - 날짜/키워드 필터
  - Excel 다운로드 버튼

---

## 폴더 구조(예시)
```
/g2b-bid-report
  /src
    /app
      /login
      /admin     (관리화면)
      /results   (결과화면)
      /api
        /auth
        /bids
        /export
        /mail
    /lib
      db.ts
      g2b.ts
      mailer.ts
      scheduler.ts
  /.env
```

---

## 환경변수(.env) 예시
```
G2B_API_KEY=***
SMTP_USER=bca@sunyoutech.com
SMTP_PASS=***
SMTP_HOST=smtps.hiworks.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_FROM_NAME=렘짱
DEFAULT_RECIPIENTS=bca@sunyoutech.com
KEYWORDS=AI,인공지능,구축,플랫폼
TIMEZONE=Asia/Seoul
```

---

## 데이터 흐름
1. **18:00 수집 스케줄러 실행**
2. API 호출 → 키워드 필터 → 신규만 저장
3. **09:00 이메일 발송 스케줄러 실행**
4. 저장된 신규 공고를 이메일 요약으로 발송

---

## 필요한 패키지(예시)
- next
- prisma (또는 drizzle)
- sqlite3 (초기)
- nodemailer
- node-cron
- xlsx
- zod

---

## 향후 배포 고려
- env 분리 (dev/prod)
- DB 외부화(Postgres)
- SMTP/메일 발송 별도 서비스 분리 가능

---

## 다음 단계
1) 프로젝트 생성 확인
2) Prisma 스키마 확정
3) 로그인(다중 사용자) 구현
4) 입찰 공고 수집 API 연동
5) 스케줄러 연결
6) 반응형 UI 구현
7) Excel 다운로드 기능 추가
8) 메일 발송 기능 구현
9) 테스트 후 로컬 실행
10) GitHub 반영

---

## 추가 설계 문서
- `g2b-bid-report-architecture.md` 파일에 아키텍처, 데이터 모델, 화면 구성, API 구성 초안을 별도로 정리함

---

## 비고
- Word 파일(.docx) 변환은 **내부 접속 가능 시** 자동 변환(Pandoc)으로 제공 가능
