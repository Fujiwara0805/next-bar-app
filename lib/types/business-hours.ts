// 店舗の営業時間（曜日 → 開店/閉店/定休）の型。
//
// 注意: 以前は Supabase 自動生成の `lib/supabase/types.ts` に手書きで継ぎ足していたが、
// 型の再生成でファイルが丸ごと上書きされる度に消えて import エラーになっていた。
// 再生成の影響を受けない専用ファイルとして切り出している。
export type BusinessHours = {
  [key in
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday']?: {
    open: string;
    close: string;
    closed?: boolean;
  };
};
