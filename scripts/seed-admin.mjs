import pg from 'pg';

const connectionString =
  process.env.SUPABASE_DB_URL ||
  'postgres://postgres.rtpurefxxkosfkrbrwyf:wX0txKjE1OjkrlBx@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function seedAdmin() {
  await client.connect();
  const userId = '70000000-0000-0000-0000-000000000403';
  const email = 'admin@gmail.com';
  const password = '123';

  console.log(`Seeding admin user [${email}] into Supabase Auth...`);

  // 1. Delete if already exists
  await client.query('DELETE FROM auth.identities WHERE user_id = $1::uuid;', [userId]);
  await client.query('DELETE FROM auth.users WHERE email = $1 OR id = $2::uuid;', [email, userId]);

  // 2. Insert into auth.users without generated column confirmed_at
  const appMetadata = JSON.stringify({
    provider: 'email',
    providers: ['email'],
    role: 'admin',
    permissions: ['Wf02.Moderate'],
  });
  const userMetadata = JSON.stringify({
    sub: userId,
    name: 'Admin',
    full_name: 'Quản trị viên',
    email: email,
    email_verified: true,
    phone_verified: false,
  });

  await client.query(
    `
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, phone_change, phone_change_token, email_change_token_current,
      reauthentication_token, email_change_confirm_status, is_sso_user, is_anonymous
    ) VALUES (
      $1::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, crypt($3, gen_salt('bf')),
      now(), now(),
      $4::jsonb, $5::jsonb,
      now(), now(),
      '', '', '',
      '', '', '', '',
      '', 0, false, false
    );
  `,
    [userId, email, password, appMetadata, userMetadata]
  );

  // 3. Insert into auth.identities
  const identityData = JSON.stringify({
    sub: userId,
    email: email,
    email_verified: true,
    phone_verified: false,
  });

  await client.query(
    `
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1::uuid, $1::text, $2::jsonb, 'email', now(), now(), now()
    );
  `,
    [userId, identityData]
  );

  // 4. Insert or update public.app_users for admin@gmail.com
  await client.query(
    `
    INSERT INTO public.app_users (
      id, display_name, role, is_active, reputation_score, reputation_tier,
      reputation_policy_version, created_at_utc, updated_at_utc
    ) VALUES (
      $1::uuid, 'Quản trị viên', 3, true, 1000, 'Admin', 'wf02-provisional-v1', now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = 'Quản trị viên',
      role = 3,
      is_active = true,
      reputation_tier = 'Admin',
      updated_at_utc = now();
  `,
    [userId]
  );

  // 5. Also grant Admin role to quocdat2601@gmail.com in app_users if exists
  await client.query(`
    UPDATE public.app_users
    SET role = 3, is_active = true, reputation_tier = 'Admin', updated_at_utc = now()
    WHERE id = '9ee9105a-e995-4256-a0af-86b6a25882cd';
  `);

  console.log(`✅ Thành công! Đã tạo tài khoản quản trị: ${email} | Mật khẩu: ${password}`);
  await client.end();
}

seedAdmin().catch((err) => {
  console.error('Lỗi seed admin:', err);
  process.exit(1);
});
