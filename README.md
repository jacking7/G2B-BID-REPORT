# G2B Bid Report

나라장터 입찰공고 자동 수집 및 메일 리포트용 Next.js 내부 도구입니다.

## 현재 포함 기능
- 이메일/비밀번호 기반 로그인
- 첫 관리자 계정 생성
- 사용자별 키워드, 수신자, 스케줄 설정 저장
- Prisma + SQLite 기반 로컬 데이터 저장
- `/api/health` 상태 확인 API

## 실행 방법
```bash
npm install
npm run db:migrate
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

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

## 다음 작업 후보
- 나라장터 수집 API 연동
- 결과 화면 및 Excel 다운로드
- 메일 발송 및 발송 이력 관리
- 스케줄러 연결
