import { randomInt } from 'crypto';

/**
 * クーポン redeem code ユーティリティ（Phase 10）
 *
 * - `redeem_code` は 6桁の数字（店頭で口頭伝達しやすい短縮コード）
 * - DB側 `coupon_issues.redeem_code` は `UNIQUE` 制約付き
 * - 発行はサーバーサイドのみ（RLSでクライアント書き込み不可）なので HMAC改ざん検証は不要
 *   ∵ DB一意制約＋非公開ID（`issue_id`）参照の二段構え
 *
 * 6桁数字は 10^6 = 100万通り。MVP規模（月4回×12店舗）では衝突確率は十分低いが、
 * 念のため挿入時の unique violation → 再生成リトライ（最大 8 回）で吸収する。
 */

const CODE_LEN = 6;
export const REDEEM_CODE_LENGTH = CODE_LEN;

export function generateRedeemCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LEN; i += 1) {
    out += String(randomInt(0, 10));
  }
  return out;
}

export function normalizeRedeemCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LEN);
}

export function isValidRedeemCode(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LEN}}$`).test(code);
}
