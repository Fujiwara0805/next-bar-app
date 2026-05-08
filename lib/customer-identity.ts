import type { ProfileAttrs } from '@/lib/types/store-customer';

export type CustomerIdentityAttrs = ProfileAttrs & {
  customer_device_ids?: unknown;
};

export type CustomerIdentityUser = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  line_display_name?: string | null;
  avatar_url?: string | null;
  line_picture_url?: string | null;
  line_user_id?: string | null;
  role?: string | null;
  profile_attributes?: unknown;
  created_at?: string | null;
};

export const CUSTOMER_IDENTITY_SELECT =
  'id, email, display_name, line_display_name, avatar_url, line_picture_url, line_user_id, role, profile_attributes, created_at';

export function normalizeCustomerDeviceId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(value)) return null;
  return value;
}

export function getCustomerDeviceIds(attrs: unknown): string[] {
  if (!attrs || typeof attrs !== 'object') return [];
  const raw = (attrs as CustomerIdentityAttrs).customer_device_ids;
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.map(normalizeCustomerDeviceId).filter((id): id is string => Boolean(id)))
  );
}

export function isRealCustomerEmail(email: string | null | undefined): boolean {
  return Boolean(email && !email.endsWith('@line.nikenme.local'));
}

function isCustomerRole(user: CustomerIdentityUser): boolean {
  return !user.role || user.role === 'customer' || user.role === 'user';
}

function createdAtMs(user: CustomerIdentityUser): number {
  const ms = user.created_at ? new Date(user.created_at).getTime() : NaN;
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

export function pickCanonicalCustomer(
  users: CustomerIdentityUser[],
  preferredId: string
): CustomerIdentityUser | null {
  const candidates = users.filter(isCustomerRole);
  const preferred = candidates.find((u) => u.id === preferredId);

  if (preferred && isRealCustomerEmail(preferred.email)) {
    return preferred;
  }

  const realEmailUsers = candidates
    .filter((u) => isRealCustomerEmail(u.email))
    .sort((a, b) => createdAtMs(a) - createdAtMs(b));
  if (realEmailUsers[0]) return realEmailUsers[0];

  if (preferred) return preferred;

  return candidates.sort((a, b) => createdAtMs(a) - createdAtMs(b))[0] ?? null;
}

export async function attachCustomerDeviceId(
  admin: any,
  userId: string,
  deviceId: string
): Promise<void> {
  const { data: row, error } = await admin
    .from('users')
    .select('profile_attributes')
    .eq('id', userId)
    .maybeSingle();

  if (error || !row) return;

  const currentAttrs =
    row.profile_attributes &&
    typeof row.profile_attributes === 'object' &&
    !Array.isArray(row.profile_attributes)
      ? (row.profile_attributes as Record<string, unknown>)
      : {};
  const currentIds = getCustomerDeviceIds(currentAttrs);
  if (currentIds.includes(deviceId)) return;

  await admin
    .from('users')
    .update({
      profile_attributes: {
        ...currentAttrs,
        customer_device_ids: [deviceId, ...currentIds].slice(0, 5),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function fetchCustomersByDeviceId(
  admin: any,
  deviceId: string
): Promise<CustomerIdentityUser[]> {
  const { data } = await admin
    .from('users')
    .select(CUSTOMER_IDENTITY_SELECT)
    .contains('profile_attributes', { customer_device_ids: [deviceId] });
  return (data ?? []) as CustomerIdentityUser[];
}

export async function expandCustomerIdentityUsers(
  admin: any,
  users: CustomerIdentityUser[]
): Promise<CustomerIdentityUser[]> {
  const byId = new Map<string, CustomerIdentityUser>();
  for (const user of users) byId.set(user.id, user);

  const deviceIds = Array.from(
    new Set(users.flatMap((user) => getCustomerDeviceIds(user.profile_attributes)))
  );

  for (const deviceId of deviceIds) {
    const linked = await fetchCustomersByDeviceId(admin, deviceId);
    for (const user of linked) byId.set(user.id, user);
  }

  return Array.from(byId.values());
}

export function resolveCanonicalCustomerId(
  users: CustomerIdentityUser[],
  preferredId: string
): string {
  const preferred = users.find((u) => u.id === preferredId);
  if (!preferred) return preferredId;

  const deviceIds = getCustomerDeviceIds(preferred.profile_attributes);
  if (deviceIds.length === 0) return preferredId;

  const related = users.filter((user) => {
    const ids = getCustomerDeviceIds(user.profile_attributes);
    return ids.some((id) => deviceIds.includes(id));
  });

  return pickCanonicalCustomer(related, preferredId)?.id ?? preferredId;
}
