// ============================================
// POST /api/auth/line-exchange
// LIFF の id_token を受け取り、LINE で検証後、
// Supabase Auth ユーザーを作成/ルックアップして
// クライアントが session を確立するための magiclink hashed_token を返す。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyLineIdToken } from '@/lib/line/verify-id-token';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * LINEが email を返さないケース向けのプレースホルダ email。
 * Supabase Auth は email が必須のため、LINE userId 由来の一意な値を合成する。
 * 実メールアドレスはユーザーがあとで補完できる（抽選応募時に必須化）。
 */
function placeholderEmail(lineUserId: string): string {
  return `line_${lineUserId}@line.nikenme.local`;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'server_misconfigured', message: 'Supabase service role key is not set' },
      { status: 500 }
    );
  }

  let idToken: string | undefined;
  try {
    const body = await request.json();
    idToken = typeof body?.idToken === 'string' ? body.idToken : undefined;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: 'id_token_required' }, { status: 400 });
  }

  // Step 1: LINEでid_tokenを検証
  let payload: Awaited<ReturnType<typeof verifyLineIdToken>>;
  try {
    payload = await verifyLineIdToken(idToken);
  } catch (err) {
    console.error('[line-exchange] verify failed:', err);
    return NextResponse.json(
      { error: 'line_verify_failed', message: (err as Error).message },
      { status: 401 }
    );
  }

  const lineUserId = payload.sub;
  const lineName = payload.name ?? '';
  const linePicture = payload.picture ?? null;
  const lineEmail = payload.email ?? null;

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 2: usersテーブルを line_user_id で検索
  const { data: existingByLine, error: lookupErr } = await admin
    .from('users')
    .select('id, email, line_user_id')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[line-exchange] users lookup error:', lookupErr);
    return NextResponse.json({ error: 'db_lookup_failed' }, { status: 500 });
  }

  let authUserEmail: string | null = existingByLine?.email ?? null;

  if (!existingByLine) {
    // Step 3a: LINEが email を提供している場合、同じ email の既存ユーザーにLINE紐付け
    if (lineEmail) {
      const { data: existingByEmail } = await admin
        .from('users')
        .select('id, email, line_user_id')
        .eq('email', lineEmail)
        .maybeSingle();

      if (existingByEmail && !existingByEmail.line_user_id) {
        await admin
          .from('users')
          .update({
            line_user_id: lineUserId,
            line_display_name: lineName || null,
            line_picture_url: linePicture,
            line_linked_at: new Date().toISOString(),
          })
          .eq('id', existingByEmail.id);
        authUserEmail = existingByEmail.email;
      }
    }

    // Step 3b: 既存紐付けが見つからなければ新規作成
    if (!authUserEmail) {
      const newEmail = lineEmail ?? placeholderEmail(lineUserId);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: newEmail,
        email_confirm: true,
        user_metadata: {
          display_name: lineName || 'LINEユーザー',
          line_user_id: lineUserId,
        },
      });

      if (createErr || !created?.user) {
        // 既に auth.users に同じ email がある場合は listUsers で取得して紐付け
        if (createErr?.message?.includes('already') || createErr?.status === 422) {
          const { data: listed } = await admin.auth.admin.listUsers();
          const match = listed?.users.find((u) => u.email === newEmail);
          if (match) {
            authUserEmail = match.email ?? newEmail;
          } else {
            return NextResponse.json(
              { error: 'create_user_failed', message: createErr.message },
              { status: 500 }
            );
          }
        } else {
          console.error('[line-exchange] createUser error:', createErr);
          return NextResponse.json(
            { error: 'create_user_failed', message: createErr?.message },
            { status: 500 }
          );
        }
      } else {
        authUserEmail = created.user.email ?? newEmail;
      }

      // public.users は handle_new_user トリガで自動作成される想定。
      // LINE列は別途 UPDATE して埋める。
      await admin
        .from('users')
        .update({
          line_user_id: lineUserId,
          line_display_name: lineName || null,
          line_picture_url: linePicture,
          line_linked_at: new Date().toISOString(),
        })
        .eq('email', authUserEmail);
    }
  } else {
    // Step 4: 既存LINE紐付けユーザーのプロフィール情報を最新化
    await admin
      .from('users')
      .update({
        line_display_name: lineName || null,
        line_picture_url: linePicture,
      })
      .eq('id', existingByLine.id);
  }

  if (!authUserEmail) {
    return NextResponse.json({ error: 'email_resolution_failed' }, { status: 500 });
  }

  // Step 5: magiclink hashed_token を生成してクライアントへ返却
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authUserEmail,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[line-exchange] generateLink error:', linkErr);
    return NextResponse.json(
      { error: 'generate_link_failed', message: linkErr?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email: authUserEmail,
    hashedToken: linkData.properties.hashed_token,
  });
}
