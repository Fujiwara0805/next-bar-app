// ============================================
// LINE関連の型定義（LIFF Mini App用）
// ============================================

/** LINEユーザープロフィール */
export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/** LiffContext の状態型 */
export interface LiffContextType {
  /** LIFF SDKの初期化が完了したか */
  isLiffReady: boolean;
  /** LINEアプリ内で動作しているか */
  isInLine: boolean;
  /** LINEログイン済みか */
  isLineLoggedIn: boolean;
  /** LINEプロフィール */
  lineProfile: LineProfile | null;
  /** LIFF初期化エラー */
  liffError: string | null;
  /** LINEログインを実行 */
  liffLogin: () => Promise<void>;
  /** LINEログアウトを実行 */
  liffLogout: () => Promise<void>;
  /** LINE IDトークンを取得 */
  getIdToken: () => string | null;
}
