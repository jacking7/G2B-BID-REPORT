# G2B Bid Report 배포 전 점검표

## 1. 필수 환경변수
- `DATABASE_URL`
- `AUTH_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `INTERNAL_JOB_TOKEN`

## 2. 기본 검증
```bash
npm install
npm run db:migrate
npm run lint
npm run build
```

## 3. 앱 기능 확인
- `/g2breport/login`에서 관리자 계정 생성 또는 로그인
- `/g2breport/settings`에서 포함 키워드, 제외 키워드, 수신자, 스케줄 저장
- `/g2breport/results`에서 실제 수집 실행
- 결과 필터, Excel 다운로드 확인
- 메일 발송 또는 재시도 버튼 확인
- `/g2breport/api/health` 응답 확인

## 4. 운영 스케줄 방식 선택
### 옵션 A. 앱 내부 스케줄러
- `ENABLE_INTERNAL_SCHEDULER=true`
- 장기 운영은 단일 프로세스/중복 실행 주의

### 옵션 B. 외부 cron 권장
예시:
```bash
export INTERNAL_JOB_TOKEN='your-token'
./scripts/run-job.sh https://your-domain.com collect
./scripts/run-job.sh https://your-domain.com send
```

crontab 예시:
```cron
0 18 * * * cd /path/to/g2b-bid-report && INTERNAL_JOB_TOKEN=your-token ./scripts/run-job.sh https://your-domain.com collect >> /tmp/g2b-collect.log 2>&1
0 9 * * * cd /path/to/g2b-bid-report && INTERNAL_JOB_TOKEN=your-token ./scripts/run-job.sh https://your-domain.com send >> /tmp/g2b-send.log 2>&1
```

## 5. 운영 권장사항
- SQLite 장기 운영 시 정기 백업
- SMTP 앱 비밀번호 사용
- `INTERNAL_JOB_TOKEN`은 충분히 긴 랜덤 문자열 사용
- 외부 공개 시 HTTPS 뒤에 두기
- 장기적으로는 SQLite 대신 Postgres 고려

## 6. 보안 점검
- 로그인, 소셜 로그인 시작, 인증번호/비밀번호 재설정 요청에 rate limit 적용 확인
- 비밀번호는 bcrypt salted hash로만 저장되고 신규/변경 비밀번호는 강도 정책을 통과해야 함
- 세션 쿠키는 운영 HTTPS에서 `HttpOnly`, `Secure`, `SameSite=Lax` 확인
- 인증 토큰, 세션, 민감 사용자 데이터는 `localStorage`에 저장하지 않음
- DB 접근은 Prisma ORM 바인딩을 사용하고 raw SQL 문자열 조합 금지
- Excel/CSV류 export는 `=`, `+`, `-`, `@` 시작값을 수식으로 실행하지 않도록 중립화
- `/robots.txt`는 전체 차단, 알려진 AI/search crawler UA는 프록시에서 403 차단
- `/robots.txt`가 n8n 등 다른 upstream HTML로 빠지지 않도록 edge/nginx에서 fallback 라우트보다 먼저 G2B 앱으로 라우팅
- 모든 응답에 `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` 확인
- 운영 health/API 오류 응답은 stack trace, framework debug, server version을 노출하지 않음
- nginx 사용 시 `server_tokens off;` 설정
- nginx error page는 커스텀 페이지를 사용하되 `404`, `500`, `502`, `503`, `504` 상태코드를 유지
- 보안 관련 변경 후 `npm run test`, `npm run build`, `/robots.txt`, 헤더, crawler 403 smoke 확인

nginx 예시:

```nginx
server_tokens off;
proxy_hide_header X-Powered-By;

location = /robots.txt {
  proxy_pass http://127.0.0.1:3000;
}

error_page 404 /404.html;
error_page 500 502 503 504 /50x.html;
```
