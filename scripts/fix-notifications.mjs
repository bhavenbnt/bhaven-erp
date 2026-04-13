import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldoljbmspqbzwsupavyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb2xqYm1zcHFiendzdXBhdnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1NzY2MiwiZXhwIjoyMDkwNTMzNjYyfQ.pAh7JmbSucpRIDm8aczQrzOfedmQZ-_JLQfmVx1Rrd4'
);

const SUPABASE_URL = 'https://ldoljbmspqbzwsupavyz.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb2xqYm1zcHFiendzdXBhdnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1NzY2MiwiZXhwIjoyMDkwNTMzNjYyfQ.pAh7JmbSucpRIDm8aczQrzOfedmQZ-_JLQfmVx1Rrd4';

async function runSQL(sql) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return resp;
}

async function fix() {
  console.log('🔧 Fixing notifications table...\n');

  // Drop old table and recreate with correct schema
  // Using raw SQL via Supabase SQL endpoint
  const sql = `
    DROP TABLE IF EXISTS notifications CASCADE;
    CREATE TABLE notifications (
      notification_id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(user_id),
      reservation_id BIGINT REFERENCES reservations(reservation_id),
      title VARCHAR(200) NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      noti_type VARCHAR(50) NOT NULL DEFAULT 'info',
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_notifications_user ON notifications(user_id);
  `;

  // Try via pg_net or direct
  const resp = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!resp.ok) {
    console.log('Direct SQL failed, using workaround...');

    // Workaround: drop via REST API
    // First delete all rows
    await supabase.from('notifications').delete().neq('notification_id', 0);

    // Since we can't ALTER via REST, let's try the Supabase Management API
    // Actually, let's use the SQL Editor API
    const sqlResp = await fetch(`https://api.supabase.com/v1/projects/ldoljbmspqbzwsupavyz/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!sqlResp.ok) {
      console.log('Management API also failed. Need to recreate via Supabase Dashboard.');
      console.log('SQL to run in Dashboard SQL Editor:');
      console.log(sql);
      console.log('\nAfter running the SQL, run this script again with --seed flag.');
      return;
    }
  }

  console.log('✅ Table recreated');
  await seedNotifications();
}

async function seedNotifications() {
  console.log('\n📋 Seeding notifications...');

  const notifications = [
    { user_id: 6, title: '예약 승인', message: '4월 15일 에티오피아 예가체프 20kg 생산 예약이 승인되었습니다.', noti_type: 'approval', is_read: false, reservation_id: 15 },
    { user_id: 6, title: '생산 시작', message: '4월 14일 콜롬비아 수프리모 10kg 생산이 시작되었습니다.', noti_type: 'schedule', is_read: false, reservation_id: 16 },
    { user_id: 6, title: '생산 완료', message: '4월 10일 프리미엄 콜드브루 5kg 생산이 완료되었습니다. 출고 준비 중입니다.', noti_type: 'info', is_read: false, reservation_id: 1 },
    { user_id: 6, title: '예약 반려', message: '4월 22일 과테말라 안티구아 30kg 예약이 반려되었습니다. 사유: 해당 날짜 대형 기기 정비 예정', noti_type: 'cancellation', is_read: true, reservation_id: 17 },
    { user_id: 6, title: '일정 변경 안내', message: '4월 21일 예약 일정이 4월 23일로 변경되었습니다. 원두 입고 지연에 따른 조정입니다.', noti_type: 'schedule', is_read: true },
    { user_id: 6, title: '예약 접수 확인', message: '4월 28일 브라질 산토스 40kg 생산 예약이 접수되었습니다. 관리자 승인을 기다리고 있습니다.', noti_type: 'reservation', is_read: true, reservation_id: 18 },
    { user_id: 6, title: '시스템 점검 안내', message: '4월 20일(일) 02:00~06:00 시스템 정기 점검이 예정되어 있습니다.', noti_type: 'info', is_read: true },
  ];

  const { data, error } = await supabase.from('notifications').insert(notifications).select();
  if (error) {
    console.log('❌ Insert failed:', error.message);
    console.log('Table may need manual recreation. Run this SQL in Supabase Dashboard:');
    console.log(`
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  reservation_id BIGINT REFERENCES reservations(reservation_id),
  title VARCHAR(200) NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  noti_type VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
    `);
  } else {
    console.log(`✅ ${data.length}개 알림 추가`);
  }
}

// Check if --seed flag
if (process.argv.includes('--seed')) {
  seedNotifications().catch(console.error);
} else {
  fix().catch(console.error);
}
