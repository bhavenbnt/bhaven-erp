import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldoljbmspqbzwsupavyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb2xqYm1zcHFiendzdXBhdnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1NzY2MiwiZXhwIjoyMDkwNTMzNjYyfQ.pAh7JmbSucpRIDm8aczQrzOfedmQZ-_JLQfmVx1Rrd4'
);

async function fix() {
  console.log('🔧 Fixing corrupted data...\n');

  // 1. Fix users
  const userFixes = [
    { user_id: 1, name: '관리자', company_name: '비해이븐' },
    { user_id: 2, name: '테스트 고객', company_name: '프리미엄 커피 팩토리' },
    { user_id: 6, name: '테스트 고객', company_name: '테스트 회사' },
    { user_id: 8, name: '테스트 작업자', company_name: '비해이븐' },
    { user_id: 9, name: '테스트 관리자2', company_name: '비해이븐' },
  ];

  for (const fix of userFixes) {
    const { error } = await supabase
      .from('users')
      .update({ name: fix.name, company_name: fix.company_name })
      .eq('user_id', fix.user_id);
    console.log(`  user_id=${fix.user_id}: ${error ? '❌ ' + error.message : '✅ ' + fix.name}`);
  }

  // 2. Fix product
  const { error: pErr } = await supabase
    .from('products')
    .update({ product_name: '프리미엄 콜드브루' })
    .eq('product_id', 1);
  console.log(`\n  product_id=1: ${pErr ? '❌ ' + pErr.message : '✅ 프리미엄 콜드브루'}`);

  // 3. Remove duplicate products (7~16)
  const { error: dErr } = await supabase
    .from('products')
    .delete()
    .gte('product_id', 7);
  console.log(`  duplicates: ${dErr ? '❌ ' + dErr.message : '✅ product_id 7~16 삭제'}`);

  // 4. Verify
  console.log('\n📋 Verification:');
  const { data: users } = await supabase.from('users').select('user_id, name, company_name');
  users.forEach(u => console.log(`  user ${u.user_id}: ${u.name} (${u.company_name})`));

  const { data: products } = await supabase.from('products').select('product_id, product_name');
  products.forEach(p => console.log(`  product ${p.product_id}: ${p.product_name}`));

  console.log('\n✅ Done!');
}

fix().catch(console.error);
