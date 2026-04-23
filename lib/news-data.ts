/**
 * お知らせデータ（多言語対応）
 *
 * 新しいお知らせを追加する場合:
 * 1. newsTranslations の各言語（ja, en, ko, zh）に同じインデックスで追加
 * 2. 配列の先頭が最新のお知らせ（降順）
 * 3. 各エントリには date, title, body を定義
 * 4. 外部リンクがある場合は link / linkLabel を追加
 *
 * LP画面には最新3件が自動表示されます。
 */

export interface NewsItem {
  date: string;
  title: string;
  body: string;
  link?: string;
  linkLabel?: string;
}

export const newsTranslations: Record<string, NewsItem[]> = {
  ja: [
    {
      date: '2026.04.23',
      title: 'LINEクーポン発行機能をリリースしました',
      body: '店舗がLINE公式アカウントから直接、リッチなFlexメッセージでクーポンを配信できる機能をリリースしました。割引率・定額引き・無料特典の3種類に対応し、店舗フォロワー／近くのフォロワー／全OAを対象に配信できます。お客様はLIFFでクーポンを受け取り、6桁の消込コードを店舗で提示するだけで使用できます。店舗側は「分析」画面で発行数・消込率(CVR)・来店者属性（年代・性別・大分県内外・初来店/リピート）を確認できます。',
    },
    {
      date: '2026.04.22',
      title: 'ログイン画面を刷新しました（LINEログイン / パスワードリセット対応）',
      body: 'お客様向けログインと運営者・店舗向けログインを別画面に分離しました。お客様はLINEアカウント、またはメールアドレス＋パスワードでログインできます。また、パスワードをお忘れの場合に再設定できる「パスワードリセット」機能を新たに追加しました。ログイン画面の「パスワードを忘れた方」から、ご登録メールアドレス宛にリセット用リンクをお送りします。',
    },
    {
      date: '2026.04.22',
      title: 'おごり酒・クーポン機能の提供を終了しました',
      body: '「おごり酒（オンライン購入＆チケット受け取り）」機能およびアプリ内「クーポン表示」機能の提供を終了しました。より店舗とお客様が直接つながる体験をご提供するため、次フェーズでは店舗側がLINEから必要に応じてクーポン（FlexメッセージによるリッチなクーポンUI）を発行できる仕組みを開発予定です。',
    },
    {
      date: '2026.04.21',
      title: '店舗管理画面 / 空席マップのデザインを刷新しました',
      body: 'サービス全体のカラーパレットをブランドカラー（Brewer Navy系）へ統一し、店舗管理画面の「配信」と「分析」を1画面に統合しました。店舗QRコード発行画面もリデザインし、より見やすく・使いやすくなりました。加えて、アプリ内QRスキャナと12時間スタンプラリー機能も先日リリースしています。',
    },
    {
      date: '2026.04.09',
      title: '空席通知（プッシュ通知）機能をリリースしました',
      body: 'マップページから近くのバー・スナック・居酒屋の空席が出たときにプッシュ通知を受け取れる機能が追加されました。マップ左側のベルアイコンからON/OFFを切り替えてご利用ください。',
    },
    {
      date: '2026.03.03',
      title: 'PR TIMESにてNIKENME+が紹介されました',
      body: '「もう一軒、行こうか」— その一言が、街の未来を変える。大分の夜の街を救うリアルタイム空席マップ「NIKENME+」の記事がPR TIMESに掲載されました。',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'PR TIMESの記事を読む',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 正式リリース',
      body: 'NIKENME+が正式にリリースされました。大分の夜を楽しむための新しいサービスをぜひお試しください。',
    },
  ],
  en: [
    {
      date: '2026.04.23',
      title: 'LINE Coupon Distribution Released',
      body: 'Stores can now distribute rich Flex Message coupons directly from their LINE Official Account. Three coupon types are supported (percent-off, amount-off, free item) with targeting by store followers, nearby followers, or the entire OA audience. Customers receive coupons inside LIFF and redeem them in-store by showing a 6-digit code. Store consoles show issue count, redemption CVR, and a breakdown by age, gender, inside-Oita / outside-Oita, and first-visit / repeat.',
    },
    {
      date: '2026.04.22',
      title: 'Redesigned Login (LINE Login & Password Reset Added)',
      body: 'The customer login screen is now separated from the operator / store login screen. Customers can sign in with a LINE account or with an email address and password. We have also added a new "Forgot password" flow — tap "Forgot password?" on the login screen and we will email you a secure link to set a new password.',
    },
    {
      date: '2026.04.22',
      title: 'Ogori (Treat-a-Drink) and In-App Coupons Discontinued',
      body: 'The "Ogori" (online drink purchase & ticket pickup) feature and the in-app "Coupon" feature have been discontinued. To deliver a more direct connection between stores and customers, the next phase will enable store operators to issue coupons on demand via LINE (using rich Flex Message coupon UI).',
    },
    {
      date: '2026.04.21',
      title: 'Store Console & Vacancy Map Redesigned',
      body: 'We unified the product-wide color palette around our brand color (Brewer Navy) and merged the "Broadcast" and "Analytics" screens in the store console into a single view. The store QR code page has also been redesigned for better readability. In addition, the in-app QR scanner and 12-hour stamp rally feature went live recently.',
    },
    {
      date: '2026.04.09',
      title: 'Vacancy Notifications (Push Notifications) Now Available',
      body: 'You can now receive push notifications when seats become available at nearby bars and restaurants on the map. Toggle the bell icon on the left side of the map to enable or disable notifications.',
    },
    {
      date: '2026.03.03',
      title: 'NIKENME+ Featured on PR TIMES',
      body: '"Where to next?" — A single question that changes the future of the city. An article about NIKENME+, the real-time vacancy map for Oita\'s nightlife, has been published on PR TIMES.',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'Read the PR TIMES article',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ Officially Launched',
      body: 'NIKENME+ has officially launched. Try our new service for enjoying nightlife in Oita.',
    },
  ],
  ko: [
    {
      date: '2026.04.23',
      title: 'LINE 쿠폰 발행 기능 출시',
      body: '매장이 LINE 공식 계정에서 직접 리치 Flex 메시지로 쿠폰을 배포할 수 있는 기능을 출시했습니다. 할인율·정액 할인·무료 제공 3종류를 지원하며, 매장 팔로워·근처 팔로워·전체 OA를 대상으로 배포할 수 있습니다. 고객은 LIFF에서 쿠폰을 받고 6자리 사용 코드를 매장에 제시하기만 하면 됩니다. 매장은 "분석" 화면에서 발행 수·사용률(CVR)·방문자 속성(연령대·성별·오이타 안/밖·첫 방문/재방문)을 확인할 수 있습니다.',
    },
    {
      date: '2026.04.22',
      title: '로그인 화면을 개편했습니다 (LINE 로그인 / 비밀번호 재설정 지원)',
      body: '고객용 로그인과 운영자·매장용 로그인을 별도의 화면으로 분리했습니다. 고객은 LINE 계정 또는 이메일 주소와 비밀번호로 로그인할 수 있습니다. 또한 비밀번호를 잊으셨을 경우 재설정할 수 있는 "비밀번호 재설정" 기능을 새로 추가했습니다. 로그인 화면의 "비밀번호를 잊으셨나요?"에서 등록하신 이메일 주소로 재설정 링크를 보내드립니다.',
    },
    {
      date: '2026.04.22',
      title: '오고리 사케 및 쿠폰 기능 제공을 종료했습니다',
      body: '"오고리 사케(온라인 구매 & 티켓 수령)" 기능과 앱 내 "쿠폰 표시" 기능 제공을 종료했습니다. 매장과 고객이 더욱 직접적으로 이어지는 경험을 제공하기 위해, 다음 단계에서는 매장에서 필요에 따라 LINE에서 쿠폰(Flex 메시지를 이용한 리치 쿠폰 UI)을 발급할 수 있는 시스템을 개발할 예정입니다.',
    },
    {
      date: '2026.04.21',
      title: '매장 관리 화면 / 빈자리 지도 디자인을 개편했습니다',
      body: '서비스 전체의 컬러 팔레트를 브랜드 컬러(Brewer Navy 계열)로 통일하고, 매장 관리 화면의 "발신"과 "분석"을 하나의 화면으로 통합했습니다. 매장 QR 코드 발급 화면도 다시 디자인하여 더 보기 쉽고 사용하기 편해졌습니다. 또한 앱 내 QR 스캐너와 12시간 스탬프 랠리 기능도 최근 출시했습니다.',
    },
    {
      date: '2026.04.09',
      title: '빈자리 알림(푸시 알림) 기능을 출시했습니다',
      body: '지도 페이지에서 근처 바·스낵바·이자카야에 빈자리가 생겼을 때 푸시 알림을 받을 수 있는 기능이 추가되었습니다. 지도 왼쪽의 벨 아이콘에서 ON/OFF를 전환하여 이용해 주세요.',
    },
    {
      date: '2026.03.03',
      title: 'PR TIMES에 NIKENME+가 소개되었습니다',
      body: '「한 잔 더 할까?」— 그 한마디가 거리의 미래를 바꿉니다. 오이타의 밤거리를 구하는 실시간 빈자리 지도 「NIKENME+」 기사가 PR TIMES에 게재되었습니다.',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'PR TIMES 기사 읽기',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 정식 출시',
      body: 'NIKENME+가 정식으로 출시되었습니다. 오이타의 밤을 즐기기 위한 새로운 서비스를 이용해 보세요.',
    },
  ],
  zh: [
    {
      date: '2026.04.23',
      title: 'LINE 优惠券发放功能上线',
      body: '店铺现可通过LINE官方账号直接发送富Flex消息优惠券。支持折扣率、定额减免、免费赠送三种类型，可按店铺粉丝、附近粉丝或全部OA粉丝进行发放。用户在LIFF内领取优惠券，到店时出示6位核销码即可使用。店铺可在"分析"页面查看发放数、核销率(CVR)以及到店者属性（年龄段、性别、大分县内/外、首次到店/回头客）。',
    },
    {
      date: '2026.04.22',
      title: '登录界面已重新设计（支持LINE登录 / 密码重置）',
      body: '我们将用户登录与运营者·店铺登录分为两个独立界面。用户可以使用LINE账号或邮箱+密码登录。同时新增了忘记密码时的"密码重置"功能。在登录界面点击"忘记密码？"，我们会将重置链接发送至您注册的邮箱。',
    },
    {
      date: '2026.04.22',
      title: '请客清酒及优惠券功能已停止提供',
      body: '我们已停止提供"请客清酒（在线购买&门票领取）"功能以及应用内"优惠券显示"功能。为了让店铺与用户之间建立更直接的联系，我们计划在下个阶段开发新功能，使店铺可以根据需要通过LINE发放优惠券（使用Flex消息的富交互优惠券UI）。',
    },
    {
      date: '2026.04.21',
      title: '店铺管理界面 / 空位地图已重新设计',
      body: '我们将整个服务的配色方案统一为品牌色（Brewer Navy系），并将店铺管理界面的"发送"和"分析"整合到同一个页面。店铺二维码发放界面也经过重新设计，更加清晰易用。此外，近期还上线了应用内二维码扫描器与12小时印章集章活动功能。',
    },
    {
      date: '2026.04.09',
      title: '空位通知（推送通知）功能正式上线',
      body: '您现在可以在地图页面接收附近酒吧、居酒屋有空位时的推送通知。点击地图左侧的铃铛图标可以开启或关闭通知。',
    },
    {
      date: '2026.03.03',
      title: 'NIKENME+被PR TIMES报道',
      body: '「再去一家吧」— 这句话将改变城市的未来。关于大分夜生活实时空位地图「NIKENME+」的文章已发布在PR TIMES上。',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: '阅读PR TIMES文章',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 正式上线',
      body: 'NIKENME+已正式上线。请试用我们为大分夜生活打造的全新服务。',
    },
  ],
};
