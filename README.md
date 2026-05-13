# G2B Bid Report

나라장터 입찰공고 자동 수집 및 메일 리포트용 Next.js 내부 도구입니다.

## 현재 포함 기능
- 이메일/비밀번호 기반 로그인
- 첫 관리자 계정 생성
- 사용자별 키워드, 수신자, 스케줄 설정 저장
- g2bplus 기반 입찰공고 수집, 결과 저장
- 수집 결과 Excel 다운로드
- SMTP 기반 메일 발송과 발송 이력 저장
- 저장된 스케줄 기준 내부 스케줄러 실행 옵션
- Prisma + SQLite 기반 로컬 데이터 저장
- `/api/health` 상태 확인 API

## 실행 방법
```bash
npm install
npm run db:migrate
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## 메일/스케줄러 환경변수
```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=bot@example.com
SMTP_PASS=app-password
MAIL_FROM=bot@example.com
ENABLE_INTERNAL_SCHEDULER=true
```

- SMTP 설정이 없으면 메일은 실제 발송하지 않고, 발송 이력에 `skipped` 상태만 남깁니다.
- `ENABLE_INTERNAL_SCHEDULER=true` 일 때만 앱 프로세스 내부에서 매분 스케줄을 확인합니다.

## 주요 스크립트
- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드 검증
- `npm run lint`: ESLint 검사
- `npm run db:generate`: Prisma Client 생성
- `npm run db:migrate`: 배포용 마이그레이션 적용
- `npm run db:push`: 스키마를 DB에 바로 반영

## 헬스 체크
`GET /api/health`

정상일 때 예시:
```json
{
  "ok": true,
  "database": "connected",
  "counts": {
    "users": 0,
    "keywords": 0,
    "recipients": 0
  }
}
```

테이블이 아직 없으면 503과 함께 `npm run db:migrate` 안내를 반환합니다.

## 데이터베이스 경로
기본 SQLite 파일은 프로젝트 루트의 `dev.db`를 사용합니다.
`DATABASE_URL=file:./dev.db` 기준으로 런타임과 Prisma CLI가 같은 파일을 바라보도록 맞춰두었습니다.

## 주요 화면/동작
- `/settings`: 키워드, 수신자, 수집/발송 시간 설정
- `/results`: 수동 수집, Excel 다운로드, 신규 결과 메일 발송, 발송 이력 확인
- `/api/results/export`: 로그인 사용자 기준 Excel 파일 다운로드

## 다음 작업 후보
- 제외 키워드와 상세 필터 추가
- 외부 배치/워커로 스케줄러 분리
- 메일 템플릿 고도화와 실패 재시도
