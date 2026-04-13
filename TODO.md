# BHAVEN ERP — TODO

> 기획서 대비 구현 현황 및 잔여 작업 목록
> 마지막 업데이트: 2026-04-05
> 종합 완성도: **100/100** (카카오 알림톡 제외 기준)

---

## 🔴 P0 — 이게 없으면 실제로 못 쓴다

- [ ] **카카오 알림톡 API 실제 발송 구현**
  - 승인/생산시작/취소/출고 시 고객에게 카카오톡 발송
  - ⚠️ 선행 조건: 카카오 비즈니스 채널 개설 + 알림톡 서비스 신청 (심사 1~2주) → 사용자 직접 진행
  - 준비 후: `lib/kakao.ts` + 각 이벤트 API route에 호출 추가

---

## ✅ 완료된 항목 (전체)

### 이번 세션 (최종 마무리 2차)
- [x] 고객 취소 3일 전 서버 검증 (`cancel/route.ts` 날짜 체크 추가)
- [x] 날짜 변경 시 고객 인앱 알림 (`reschedule/route.ts` createNotification 추가)
- [x] 신규 예약 시 직원 알림 (`reservations/route.ts POST` notifyWorkersScheduleChange 추가)
- [x] container_size 고객 예약 상세 표시 (`reservations/[id]/page.tsx`)
- [x] container_size 관리자 예약 상세 표시 (`admin/reservations/[id]/page.tsx`)
- [x] reservations/my API container_size 필드 포함 수정

### 이번 세션 (최종 마무리 1차)
- [x] 생산 시작 시 고객 인앱 알림 (`status/route.ts` IN_PROGRESS → createNotification)
- [x] 예약 오픈 주기 정확한 수정 (`reservation/new/page.tsx` maxDate → 다음달 말일)
- [x] container_size DB 컬럼 추가 (products 테이블 ALTER TABLE)
- [x] container_size API 연동 (reservations POST handler)
- [x] container_size 폼 POST body 전송 (reservation/new/page.tsx)
- [x] 관리자 캘린더 모달 필터 일관성 (기기 필터 모달에도 적용)

### 이전 세션
- [x] 출고 완료 → 고객 인앱 알림
- [x] 미처리 예약 방치 알림 (pg_cron — 매일 00:00, 3일 이상 PENDING 시 관리자 알림)
- [x] 생산 시작 시 고객 알림 (pg_cron — 매일 11:59)
- [x] 날짜별 기기 잔여 용량 팝업 (고객 캘린더 날짜 클릭)
- [x] 고객 캘린더 휴무일 시각화 (회색 배경 + 토스트)
- [x] 고객 대시보드 강화 (이번달 생산량·출고완료·최근 알림)
- [x] 회원가입 → 관리자 승인 대기 플로우 (is_approved + 승인 API)
- [x] 모바일 반응형 레이아웃 (햄버거 메뉴 + 슬라이드 드로어)
- [x] 관리자 캘린더 기기별 필터 (드롭다운 + getDayReservs 필터링)
- [x] 예약 상세 NaN 버그 수정 (expected_output_liter null fallback)
- [x] 긴급 생산 슬롯 관리자 UI (문의 상세 → 긴급 생산 섹션)
- [x] 긴급 생산 API (`/api/v1/admin/emergency`)
- [x] 고객 캘린더 모바일 셀 최적화 (minHeight 60px, 뱃지 1개)
- [x] 데드존(21~24kg) 자동 분할 배정
- [x] MAINTENANCE 기기 마스킹
- [x] 소형 기기 4슬롯 다중 고객 공유
- [x] 수율 자동 기억 (제품명 기반)
- [x] 인앱 알림 벨 (30초 폴링, 읽음 처리)
- [x] 통계 대시보드 (기기별/업체별 월간 생산량)
- [x] 관리자 캘린더 기기별 상세 뷰 (날짜 클릭 모달)
- [x] 기기 CAP 수정 불가 원칙
- [x] 스케줄러 타이밍 수정 — pg_cron job #1, #3
- [x] 문의 자동 전환 (슬롯 부족 시)
- [x] 예약 승인/반려/신청 시 인앱 알림
- [x] 작업자 권한 승격 (Employees 페이지)
- [x] Next.js 14 마이그레이션

---

## 🔧 2차 고도화 — 기술 부채 정리

### Supabase Auth + public.users UUID 마이그레이션
- **현재**: Supabase Auth(비밀번호 인증) + `public.users`(integer PK, 역할/업체정보)가 분리 운영
- **문제**: `public.users.user_id`가 integer이라 Supabase Auth의 UUID와 불일치. RLS 적용 불가.
- **목표**: `public.users`를 `public.profiles`로 전환, PK를 Supabase Auth UUID로 통일
- **작업 범위**:
  - [ ] `public.profiles` 테이블 생성 (PK = auth.users.id UUID)
  - [ ] reservations, notifications, inquiries 등 모든 FK를 UUID로 마이그레이션
  - [ ] API 전체 (30+개 라우트) user_id → UUID 대응
  - [ ] 프론트엔드 user_id 참조 전체 수정
  - [ ] `public.users.password` 컬럼 제거 (Supabase Auth가 관리)
  - [ ] Supabase RLS 정책 적용 (행 수준 보안)
  - [ ] auth trigger: 회원가입 시 `public.profiles` 자동 생성
- **리스크**: 전체 DB 스키마 변경 — 반드시 별도 브랜치에서 진행, QA 필수
- **시기**: Go-Live 이후 안정화 단계에서 진행 권장

### 긴급 생산 등록 시 잔여 용량 표시
- **현재**: 관리자 긴급 생산 등록 시 해당 기기의 잔여 용량 체크 없이 등록됨
- **목표**: 등록 전 해당 날짜/기기의 잔여 용량을 UI에 표시 + 초과 시 경고 (차단은 안 함, 관리자 재량)
- **작업**: `/admin/inquiries/[id]` 긴급 생산 세팅에서 기기 선택 시 해당 날짜 잔여 용량 조회 → 경고 배너 표시

### notifications 테이블 정규화
- **현재**: `is_read` (boolean) 단일 필드로 읽음 처리
- **목표**: 카카오 알림톡 발송 상태와 인앱 알림 상태를 분리 관리
- **작업**: `channel` (in_app/kakao/sms), `delivery_status` (pending/sent/failed/read) 컬럼 추가

## 🔮 추후 확장 예정 (별도 프로젝트)

- **BI 통계 대시보드** — 기기별/업체별 월간 차트, Recharts 도입. 현재 텍스트 표 통계는 운영 가능 수준.
- **데이터 1년 아카이빙** — pg_cron 잡으로 연 1회 archive 테이블 이동
