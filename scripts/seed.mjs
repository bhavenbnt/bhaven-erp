import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldoljbmspqbzwsupavyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb2xqYm1zcHFiendzdXBhdnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1NzY2MiwiZXhwIjoyMDkwNTMzNjYyfQ.pAh7JmbSucpRIDm8aczQrzOfedmQZ-_JLQfmVx1Rrd4'
);

// ──────────────────────────────────────────────
// 1. 장비 (소형 3 + 중형 6 + 대형 14)
// ──────────────────────────────────────────────
const equipment = [
  // 소형 (1~10kg, 4분할) — SM-001은 기존에 있으므로 제외
  { name: '소형 2호', equipment_code: 'SM-002', type: 'small', min_capacity: 1, max_capacity: 10, divisions: 4, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '소형 3호', equipment_code: 'SM-003', type: 'small', min_capacity: 1, max_capacity: 10, divisions: 4, status: 'MAINTENANCE', registered_date: '2026-01-01' },
  // 중형 (10~20kg, 1분할)
  { name: '중형 1호', equipment_code: 'MD-001', type: 'medium', min_capacity: 10, max_capacity: 20, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '중형 2호', equipment_code: 'MD-002', type: 'medium', min_capacity: 10, max_capacity: 20, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '중형 3호', equipment_code: 'MD-003', type: 'medium', min_capacity: 10, max_capacity: 20, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '중형 4호', equipment_code: 'MD-004', type: 'medium', min_capacity: 10, max_capacity: 20, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '중형 5호', equipment_code: 'MD-005', type: 'medium', min_capacity: 10, max_capacity: 20, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '중형 6호', equipment_code: 'MD-006', type: 'medium', min_capacity: 10, max_capacity: 20, divisions: 1, status: 'BROKEN', registered_date: '2026-01-01' },
  // 대형 (25~60kg, 1분할)
  { name: '대형 1호',  equipment_code: 'LG-001', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 2호',  equipment_code: 'LG-002', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 3호',  equipment_code: 'LG-003', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 4호',  equipment_code: 'LG-004', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 5호',  equipment_code: 'LG-005', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 6호',  equipment_code: 'LG-006', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 7호',  equipment_code: 'LG-007', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 8호',  equipment_code: 'LG-008', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 9호',  equipment_code: 'LG-009', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'MAINTENANCE', registered_date: '2026-01-01' },
  { name: '대형 10호', equipment_code: 'LG-010', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 11호', equipment_code: 'LG-011', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 12호', equipment_code: 'LG-012', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 13호', equipment_code: 'LG-013', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
  { name: '대형 14호', equipment_code: 'LG-014', type: 'large', min_capacity: 25, max_capacity: 60, divisions: 1, status: 'NORMAL', registered_date: '2026-01-01' },
];

// ──────────────────────────────────────────────
// 2. 제품 (customer user_id=6 기준)
// ──────────────────────────────────────────────
const products = [
  { product_name: '에티오피아 예가체프', product_type: 'extract', yield_rate: 4.0, user_id: 6, container_size: '1L' },
  { product_name: '콜롬비아 수프리모',   product_type: 'extract', yield_rate: 4.0, user_id: 6, container_size: '1L' },
  { product_name: '브라질 산토스',       product_type: 'extract', yield_rate: 4.2, user_id: 6, container_size: '500ml' },
  { product_name: '케냐 AA',            product_type: 'extract', yield_rate: 3.8, user_id: 6, container_size: '1L' },
  { product_name: '과테말라 안티구아',   product_type: 'extract', yield_rate: 4.0, user_id: 6, container_size: '2L' },
];

// ──────────────────────────────────────────────
// 3. 예약 (다양한 날짜 + 상태)
// ──────────────────────────────────────────────
// equipment_id: 소형(1~3), 중형(4~9), 대형(10~23) → 기존 1번 제외하고 새로 넣은 것 기준
// 아래는 삽입 후 조회한 ID로 맞춰야 하므로 seed 후 동적으로 처리

async function seed() {
  console.log('🌱 Seeding bhaven database...\n');

  // ── 장비 삽입 (기존 1개 유지, 나머지 추가)
  console.log('📦 Inserting equipment...');
  const { data: equipmentData, error: eqErr } = await supabase
    .from('equipment')
    .insert(equipment)
    .select('equipment_id, name, type');

  if (eqErr) { console.error('Equipment error:', eqErr.message); }
  else { console.log(`  ✅ ${equipmentData.length}개 장비 추가`); }

  // ── 제품 삽입
  console.log('🫘 Inserting products...');
  const { data: productData, error: prErr } = await supabase
    .from('products')
    .insert(products)
    .select('product_id, product_name');

  if (prErr) { console.error('Products error:', prErr.message); }
  else { console.log(`  ✅ ${productData.length}개 제품 추가`); }

  // ── 장비 ID 조회 (기존 포함 전체)
  const { data: allEquipment } = await supabase
    .from('equipment')
    .select('equipment_id, type')
    .order('equipment_id');

  const small  = allEquipment.filter(e => e.type === 'small').map(e => e.equipment_id);
  const medium = allEquipment.filter(e => e.type === 'medium').map(e => e.equipment_id);
  const large  = allEquipment.filter(e => e.type === 'large').map(e => e.equipment_id);

  const { data: allProducts } = await supabase.from('products').select('product_id').limit(5);
  const pids = allProducts.map(p => p.product_id);

  // ── 예약 생성 (4월~5월 다양한 날짜)
  console.log('📅 Inserting reservations...');
  const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  const dates = [
    '2026-04-14','2026-04-15','2026-04-16','2026-04-17','2026-04-18',
    '2026-04-21','2026-04-22','2026-04-23','2026-04-24','2026-04-25',
    '2026-04-28','2026-04-29','2026-04-30',
    '2026-05-02','2026-05-06','2026-05-07','2026-05-08','2026-05-12',
    '2026-05-13','2026-05-14',
  ];

  const reservations = [];

  // 소형 예약 (1~10kg, slot_index 0~3)
  dates.slice(0, 10).forEach((date, i) => {
    const eqId = small[i % small.length];
    reservations.push({
      user_id: 6, product_id: pids[i % pids.length], equipment_id: eqId,
      kg_amount: [3, 5, 7, 10, 2, 4, 6, 8, 1, 9][i],
      expected_output_liter: [12, 20, 28, 40, 8, 16, 24, 32, 4, 36][i],
      status: statuses[i % 5], scheduled_date: date,
      slot_index: i % 4, created_by: 6,
      notes: i % 3 === 0 ? '긴급 생산 요청' : null,
    });
  });

  // 중형 예약 (10~20kg)
  dates.slice(5, 15).forEach((date, i) => {
    const eqId = medium[i % medium.length];
    reservations.push({
      user_id: 6, product_id: pids[i % pids.length], equipment_id: eqId,
      kg_amount: [10, 12, 15, 18, 20, 11, 13, 16, 19, 14][i],
      expected_output_liter: [40, 48, 60, 72, 80, 44, 52, 64, 76, 56][i],
      status: statuses[(i + 2) % 5], scheduled_date: date,
      slot_index: null, created_by: 6,
    });
  });

  // 대형 예약 (25~60kg)
  dates.slice(10, 20).forEach((date, i) => {
    const eqId = large[i % large.length];
    reservations.push({
      user_id: 6, product_id: pids[i % pids.length], equipment_id: eqId,
      kg_amount: [25, 30, 40, 50, 60, 35, 45, 55, 28, 38][i],
      expected_output_liter: [100, 120, 160, 200, 240, 140, 180, 220, 112, 152][i],
      status: statuses[(i + 1) % 5], scheduled_date: date,
      slot_index: null, created_by: 6,
    });
  });

  const { data: resData, error: resErr } = await supabase
    .from('reservations')
    .insert(reservations)
    .select('reservation_id');

  if (resErr) { console.error('Reservations error:', resErr.message); }
  else { console.log(`  ✅ ${resData.length}개 예약 추가`); }

  // ── 알림 (스키마 확인 후 추가 예정 — is_read vs status 불일치 수정 필요)
  console.log('🔔 Notifications: 스키마 불일치로 skip (is_read vs status 수정 필요)');

  console.log('\n✅ Seeding complete!');
}

seed().catch(console.error);
