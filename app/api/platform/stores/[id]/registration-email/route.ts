import { NextRequest, NextResponse } from 'next/server';
import { assertPlatformAdmin, resolveManageAuth } from '@/lib/api/manage-auth';
import { buildStoreRegistrationEmail } from '@/lib/email/store-registration-template';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SendBody = {
  initialPassword?: unknown;
  requestId?: unknown;
};

function validHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertPlatformAdmin(auth.ctx);
  if (forbidden) return forbidden;

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const initialPassword = typeof body.initialPassword === 'string' ? body.initialPassword : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (initialPassword.length < 6 || initialPassword.length > 200 || !/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: store, error: storeError } = await auth.ctx.admin
    .from('stores')
    .select('id, name, email')
    .eq('id', params.id)
    .maybeSingle();

  if (storeError) {
    console.error('[registration-email] store fetch failed', storeError);
    return NextResponse.json({ error: 'store_fetch_failed' }, { status: 500 });
  }
  if (!store?.email) {
    return NextResponse.json({ error: 'store_email_missing' }, { status: 404 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'email_not_configured' }, { status: 501 });
  }

  const manualUrl = validHttpsUrl(process.env.STORE_REGISTRATION_MANUAL_URL);
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nikenme.jp'}/login`;
  const email = buildStoreRegistrationEmail({
    storeName: store.name,
    loginEmail: store.email,
    initialPassword,
    loginUrl,
    includesManual: Boolean(manualUrl),
  });

  const resendBody: Record<string, unknown> = {
    from,
    to: [store.email],
    reply_to: process.env.RESEND_REPLY_TO ?? 'sobota@nobody-info.com',
    subject: email.subject,
    text: email.text,
    html: email.html,
    tags: [{ name: 'category', value: 'store_registration' }],
  };
  if (manualUrl) {
    resendBody.attachments = [
      {
        path: manualUrl,
        filename: 'NIKENME+_操作マニュアル.pdf',
      },
    ];
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NIKENME+/1.0',
      'Idempotency-Key': `store-registration-${params.id}-${requestId}`,
    },
    body: JSON.stringify(resendBody),
  });
  const resendResult = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    console.error('[registration-email] Resend failed', {
      status: resendResponse.status,
      name: resendResult?.name,
      message: resendResult?.message,
    });
    return NextResponse.json(
      { error: 'email_send_failed', message: resendResult?.message ?? null },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, emailId: resendResult?.id ?? null });
}
