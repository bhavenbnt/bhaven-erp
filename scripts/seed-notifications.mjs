import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldoljbmspqbzwsupavyz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb2xqYm1zcHFiendzdXBhdnl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1NzY2MiwiZXhwIjoyMDkwNTMzNjYyfQ.pAh7JmbSucpRIDm8aczQrzOfedmQZ-_JLQfmVx1Rrd4'
);

async function findConstraints() {
  // Check constraint definitions via pg_catalog
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass"
  });

  if (error) {
    console.log('RPC failed, trying raw approach...');

    // Try common ERP notification types
    const allTypes = [
      'APPROVED', 'REJECTED', 'CANCELLED', 'CREATED', 'UPDATED',
      'approved', 'rejected', 'cancelled', 'created',
      'NEW_RESERVATION', 'RESERVATION_APPROVED', 'RESERVATION_REJECTED',
      'PRODUCTION_STARTED', 'PRODUCTION_COMPLETED', 'SCHEDULE_CHANGED',
    ];
    const allStatuses = [
      'PENDING', 'SENT', 'READ', 'FAILED', 'DELIVERED',
      'pending', 'sent', 'read', 'failed',
      'NEW', 'OPENED', 'CLOSED',
      'new', 'opened', 'closed',
    ];

    // Test each combination one-by-one
    for (const type of allTypes) {
      const { error: e1 } = await supabase.from('notifications').insert({
        user_id: 6, type, message: '__test__', status: 'PENDING'
      });
      if (!e1) {
        console.log(`✅ type='${type}' + status='PENDING' works!`);
        await supabase.from('notifications').delete().eq('message', '__test__');
        continue;
      }
      // If PENDING status failed, try without status
      if (e1.message.includes('status_check')) {
        // type is valid, status is wrong
        console.log(`  type='${type}' valid, testing statuses...`);
        for (const status of allStatuses) {
          const { error: e2 } = await supabase.from('notifications').insert({
            user_id: 6, type, message: '__test__', status
          });
          if (!e2) {
            console.log(`  ✅ status='${status}' works with type='${type}'!`);
            await supabase.from('notifications').delete().eq('message', '__test__');
            break;
          }
        }
      }
    }
  } else {
    console.log('Constraints:', data);
  }
}

findConstraints().catch(console.error);
