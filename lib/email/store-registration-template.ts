export type StoreRegistrationEmailParams = {
  storeName: string;
  loginEmail: string;
  initialPassword: string;
  loginUrl?: string;
  includesManual?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildStoreRegistrationEmail({
  storeName,
  loginEmail,
  initialPassword,
  loginUrl = 'https://nikenme.jp/login',
  includesManual = false,
}: StoreRegistrationEmailParams) {
  const manualText = includesManual ? 'および操作マニュアル' : '';
  const subject = `【NIKENME+】${storeName}様 店舗登録完了とログイン情報のご案内`;
  const text = `${storeName} 様

平素より大変お世話になっております。
株式会社Nobodyの藤原でございます。

この度は「NIKENME+」にご登録いただき、誠にありがとうございます。
ログイン情報${manualText}を送付いたしますので、ご確認をお願い申し上げます。

また、あわせてご登録内容のご確認もお願いいたします。
本サービスはGoogleマップと連携しており、NIKENME+を通じてGoogleレビューの向上を図ることを目的としております。

【ログインID】
${loginEmail}

【初期パスワード】
${initialPassword}

【ログイン画面】
${loginUrl}

上記の情報でログインが可能です。
セキュリティ保護のため、初回ログイン後は速やかにパスワードを変更いただけますようお願いいたします。

お問い合わせいただいた料金につきましては、登録料および月額利用料ともに完全無料で提供しております。
貴店のホームページや集客ツールとしてぜひご活用ください。

現在、大分県内の自治体様のご協力のもと加盟店を拡大しております。
もしお知り合いに飲食店を運営されている方がいらっしゃいましたら、ぜひ「NIKENME+」をご紹介いただけますと幸いです。

操作方法やご不明な点がございましたら、InstagramのDM（https://www.instagram.com/nikenme_nobody）
または本メールアドレス（sobota@nobody-info.com）までお気軽にお問い合わせください。
※画面デザインや機能変更については、サービス内のお知らせページ、または公式Instagramにてご案内しております。

今後とも何卒よろしくお願い申し上げます。

────────────────────────────
藤原 泰樹 | Taiki FUJIWARA
代表取締役 / CEO
株式会社Nobody
株式会社Nobodyは大分大学発ベンチャー企業です。
MAIL: sobota@nobody-info.com
WEB : https://www.nobody-inc.jp/
────────────────────────────`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP',sans-serif;color:#13294b;line-height:1.8;max-width:680px;margin:0 auto">
      <p><strong>${escapeHtml(storeName)} 様</strong></p>
      <p>平素より大変お世話になっております。<br>株式会社Nobodyの藤原でございます。</p>
      <p>この度は「NIKENME+」にご登録いただき、誠にありがとうございます。<br>ログイン情報${manualText}を送付いたしますので、ご確認をお願い申し上げます。</p>
      <p>また、あわせてご登録内容のご確認もお願いいたします。<br>本サービスはGoogleマップと連携しており、NIKENME+を通じてGoogleレビューの向上を図ることを目的としております。</p>
      <div style="background:#f7f3e9;border-left:4px solid #ffc82c;border-radius:10px;padding:18px 20px;margin:24px 0">
        <p style="margin:0 0 12px"><strong>ログインID</strong><br>${escapeHtml(loginEmail)}</p>
        <p style="margin:0"><strong>初期パスワード</strong><br>${escapeHtml(initialPassword)}</p>
      </div>
      <p style="text-align:center;margin:24px 0"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#13294b;color:#ffc82c;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:10px">NIKENME+へログイン</a></p>
      <p>上記の情報でログインが可能です。<br><strong>セキュリティ保護のため、初回ログイン後は速やかにパスワードを変更してください。</strong></p>
      <p>お問い合わせいただいた料金につきましては、登録料および月額利用料ともに完全無料で提供しております。<br>貴店のホームページや集客ツールとしてぜひご活用ください。</p>
      <p>現在、大分県内の自治体様のご協力のもと加盟店を拡大しております。<br>もしお知り合いに飲食店を運営されている方がいらっしゃいましたら、ぜひ「NIKENME+」をご紹介いただけますと幸いです。</p>
      <p>操作方法やご不明な点がございましたら、<a href="https://www.instagram.com/nikenme_nobody">InstagramのDM</a>または本メールアドレス（<a href="mailto:sobota@nobody-info.com">sobota@nobody-info.com</a>）までお気軽にお問い合わせください。<br><small>※画面デザインや機能変更については、サービス内のお知らせページ、または公式Instagramにてご案内しております。</small></p>
      <p>今後とも何卒よろしくお願い申し上げます。</p>
      <hr style="border:0;border-top:1px solid #d8c99f;margin:28px 0">
      <p style="font-size:13px">藤原 泰樹 | Taiki FUJIWARA<br>代表取締役 / CEO<br>株式会社Nobody<br>株式会社Nobodyは大分大学発ベンチャー企業です。<br>MAIL: <a href="mailto:sobota@nobody-info.com">sobota@nobody-info.com</a><br>WEB: <a href="https://www.nobody-inc.jp/">https://www.nobody-inc.jp/</a></p>
    </div>`;

  return { subject, text, html };
}
