# G2B Bid Report

나라장터 입찰공고를 키워드 기준으로 수집하고, 결과를 웹 화면·Excel·이메일로 확인하는 내부 운영 콘솔입니다.

## 현재 상태

- Next.js 16 App Router 기반 웹 앱
- Prisma + SQLite 기반 데이터 저장
- 이메일/비밀번호 로그인
- 사용자별 포함 키워드, 제외 키워드, 수신자, 수집/발송 시간 관리
- g2bplus 공개 화면 기반 최신 입찰공고 수집
- 수집 결과 조회, 날짜/상태/키워드 필터, Excel 다운로드
- SMTP 메일 발송 및 발송 이력 저장
- 내부 스케줄러 또는 외부 cron 작업 API 지원
- Dracula / White 테마 전환
- 접을 수 있는 좌측 메뉴

중요: 현재 구현은 공식 나라장터 Open API가 아니라 `scripts/collect-g2bplus.cjs`의 g2bplus 화면 수집 방식입니다. 공식 나라장터 API로 전환하려면 `src/lib/bid-collector.ts`의 수집 어댑터를 교체하면 됩니다.

## 수집 동작 기준

수집은 로그인 사용자별 설정을 기준으로 동작합니다.

1. 활성 포함 키워드가 1개 이상 있어야 수집합니다.
2. g2bplus 최신 공고를 가져옵니다.
3. 공고일과 마감일 사이에 오늘 날짜가 포함된 공고만 처리합니다.
4. 공고명 + 기관명에 포함 키워드가 있으면 후보가 됩니다.
5. 후보 공고에 제외 키워드가 있으면 저장하지 않습니다.
6. `BidNotice`는 공고번호/차수 기준으로 upsert 합니다.
7. `CollectedResult`는 사용자 + 공고 기준으로 중복 저장하지 않습니다.
8. 실제 수집이 실패하면 샘플 데이터로 대체할 수 있지만, 샘플도 오늘 기준 기간 필터를 통과해야 저장됩니다.

오늘 기준 필터는 KST 기준입니다.

```ts
noticeDate <= 오늘 23:59:59.999 KST
closeDate >= 오늘 00:00:00.000 KST
```

## 주요 화면

- `/login`: 로그인, 첫 관리자 계정 생성
- `/settings`: 포함/제외 키워드, 수신자, 수집/발송 시간 설정
- `/results`: 수동 수집, 결과 필터, Excel 다운로드, 신규 결과 메일 발송, 메일 이력 확인
- `/api/health`: DB 연결 상태 확인

## 빠른 시작

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run playwright:install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

`.env.example`을 기준으로 `.env`를 준비합니다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | SQLite DB 경로. 기본값은 `file:./dev.db` |
| `AUTH_SECRET` | 로그인 쿠키 서명용 긴 랜덤 문자열 |
| `AUTH_COOKIE_SECURE` | HTTPS면 `true`, HTTP 배포면 `false` |
| `SMTP_HOST` | SMTP 서버 주소 |
| `SMTP_PORT` | SMTP 포트. `465`면 SSL 사용 |
| `SMTP_USER` | SMTP 계정 |
| `SMTP_PASS` | SMTP 비밀번호 또는 앱 비밀번호 |
| `MAIL_FROM` | 발신자 이메일 |
| `ENABLE_INTERNAL_SCHEDULER` | 앱 내부 스케줄러 사용 여부 |
| `INTERNAL_JOB_TOKEN` | 외부 작업 API 인증 토큰 |
| `APP_BASE_URL` | `npm run job:*`에서 사용할 앱 URL |

Hiworks SMTP 예시:

```bash
SMTP_HOST="smtps.hiworks.com"
SMTP_PORT="465"
SMTP_USER="bot@example.com"
SMTP_PASS="app-password"
MAIL_FROM="bot@example.com"
```

SMTP 설정이 비어 있으면 실제 메일은 보내지 않고 `MailHistory`에 `skipped` 이력을 남깁니다.

## 주요 명령

```bash
npm run dev                 # 개발 서버
npm run test                # lint + TypeScript 검사
npm run build               # production build
npm run playwright:install  # Chromium 설치
npm run db:generate         # Prisma Client 생성
npm run db:migrate          # Prisma migration 적용
npm run db:push             # 스키마를 DB에 직접 반영
npm run job:collect         # 외부 collect API 호출
npm run job:send            # 외부 send API 호출
```

## 로컬 검증 순서

운영 반영 전에는 로컬에서 먼저 확인합니다.

1. `npm run test`
2. `npm run build`
3. `npm run dev`
4. `/login`에서 테스트 계정 생성
5. `/settings`에서 포함 키워드, 수신자, 스케줄 저장
6. `/results`에서 실제 수집 실행
7. 결과 목록, 날짜 기본값, 필터, Excel 다운로드 확인
8. SMTP를 비운 상태에서 메일 발송을 눌러 `skipped` 이력 확인
9. 필요하면 `/api/jobs/collect`를 `userId`와 함께 호출해 외부 작업 API 확인

실제 메일 발송을 피하려면 로컬 dev 서버를 아래처럼 실행합니다.

```bash
SMTP_HOST= SMTP_USER= SMTP_PASS= MAIL_FROM= npm run dev
```

## 외부 작업 API

외부 cron 또는 worker에서 수집/발송 작업을 실행할 수 있습니다.

- `POST /api/jobs/collect`
- `POST /api/jobs/send`

요청 헤더:

```bash
Authorization: Bearer $INTERNAL_JOB_TOKEN
Content-Type: application/json
```

모든 활성 스케줄 사용자 실행:

```json
{}
```

단일 사용자 실행:

```json
{
  "userId": "user-id"
}
```

스크립트 예시:

```bash
export INTERNAL_JOB_TOKEN="your-token"
./scripts/run-job.sh http://localhost:3000 collect
./scripts/run-job.sh http://localhost:3000 send
```

## 헬스 체크

기본 확인:

```bash
curl http://localhost:3000/api/health
```

응답 예시:

```json
{
  "ok": true,
  "database": "connected",
  "checkedAt": "2026-05-18T10:00:00.000Z"
}
```

카운트 포함 상세 확인:

```bash
curl "http://localhost:3000/api/health?detailed=1" \
  -H "Authorization: Bearer $INTERNAL_JOB_TOKEN"
```

## 데이터 모델 요약

- `User`: 로그인 사용자
- `KeywordRule`: 사용자별 포함/제외 키워드
- `Recipient`: 사용자별 활성 수신자
- `ScheduleSetting`: 사용자별 수집/발송 시간
- `BidNotice`: 공고 원본 정보
- `CollectedResult`: 사용자별 수집 결과
- `MailHistory`: 메일 발송/실패/skipped 이력

## 배포 전 체크

1. `.env` 준비
2. `npm install`
3. `npm run db:migrate`
4. `npm run playwright:install`
5. `npm run test`
6. `npm run build`
7. 로컬 브라우저 기능 확인
8. GitHub push
9. 운영 서버 pull/build/restart
10. `/api/health` 확인

운영에서는 Playwright Chromium과 OS 의존성이 필요합니다.

```bash
npx playwright install chromium
sudo npx playwright install-deps chromium
```

## 문제 확인

### 수집 결과가 0건일 때

- 포함 키워드가 등록되어 있는지 확인합니다.
- 키워드가 최신 공고의 공고명 또는 기관명에 실제로 포함되는지 확인합니다.
- 제외 키워드에 의해 걸러졌는지 확인합니다.
- 오늘 날짜가 공고일과 마감일 사이에 포함되는지 확인합니다.
- Playwright Chromium이 설치되어 있는지 확인합니다.

### 로그인 후 설정 저장 시 튕길 때

- HTTP 배포면 `AUTH_COOKIE_SECURE=false`가 필요합니다.
- HTTPS 배포면 `AUTH_COOKIE_SECURE=true`를 사용할 수 있습니다.
- `AUTH_SECRET`이 설정되어 있는지 확인합니다.

### 메일이 안 나갈 때

- SMTP 설정이 비어 있으면 의도적으로 `skipped` 처리됩니다.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`을 확인합니다.
- Hiworks 465 포트는 SSL 연결입니다.

## 남은 개선 후보

- 공식 나라장터 Open API 기반 수집 어댑터 전환
- SQLite 백업 자동화 또는 Postgres 전환
- 수집 실패 원인 로그/관리 화면 추가
- 키워드별 통계와 최근 수집 요약 대시보드 추가
