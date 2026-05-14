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
- `/login`에서 관리자 계정 생성 또는 로그인
- `/settings`에서 포함 키워드, 제외 키워드, 수신자, 스케줄 저장
- `/results`에서 실제 수집 실행
- 결과 필터, Excel 다운로드 확인
- 메일 발송 또는 재시도 버튼 확인
- `/api/health` 응답 확인

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
