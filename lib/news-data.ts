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
      date: '2026.06.30',
      title: 'デザインと新ロゴをリニューアル',
      body: '明るく見やすいライト基調のデザインへ刷新し、新しいロゴをアプリ全体に反映しました。',
    },
    {
      date: '2026.06.26',
      title: 'イベント＆スタンプラリー機能をリリース',
      body: '対象店をめぐってチェックインするとスタンプがたまり、特典と交換できます。',
    },
    {
      date: '2026.06.20',
      title: 'マイページに会員証QR・来店履歴を追加',
      body: '会員証QRを提示してチェックイン。来店履歴やスタンプの進み具合も確認できます。',
    },
    {
      date: '2026.06.13',
      title: '空席マップをフルスクリーン化・鮮度表示を強化',
      body: '地図を全画面表示にし、空席情報の新しさ（鮮度）が一目でわかるようになりました。',
    },
    {
      date: '2026.04.23',
      title: 'LINEクーポン発行機能をリリース',
      body: '店舗がLINE公式アカウントからクーポンを直接配信できるようになりました。お客様はLIFFで受け取り、6桁コードを店舗で提示するだけで使用できます。',
    },
    {
      date: '2026.04.22',
      title: 'ログイン画面を刷新（LINEログイン・パスワードリセット対応）',
      body: 'お客様向けと運営・店舗向けのログイン画面を分離。LINEログインに加え、メール＋パスワードでの再設定にも対応しました。',
    },
    {
      date: '2026.04.22',
      title: 'おごり酒・クーポン機能の提供を終了',
      body: '「おごり酒」とアプリ内「クーポン表示」機能を終了しました。今後は店舗がLINEから直接クーポンを発行できる仕組みへ移行します。',
    },
    {
      date: '2026.04.21',
      title: '店舗管理画面・空席マップのデザインを刷新',
      body: 'ブランドカラー（Brewer Navy）に統一し、店舗管理画面の「配信」と「分析」を1画面に統合。QRコード発行画面も見やすく改善しました。',
    },
    {
      date: '2026.04.09',
      title: '空席通知（プッシュ通知）機能をリリース',
      body: '近くの店舗に空席が出たときにプッシュ通知を受け取れるようになりました。マップ左のベルアイコンからON/OFFを切り替えてご利用ください。',
    },
    {
      date: '2026.03.03',
      title: 'PR TIMESにNIKENME+が掲載',
      body: '大分の夜を支えるリアルタイム空席マップ「NIKENME+」の記事が、PR TIMESに掲載されました。',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'PR TIMESの記事を読む',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 正式リリース',
      body: '大分の夜を楽しむための新サービス「NIKENME+」が正式リリースされました。ぜひお試しください。',
    },
  ],
  en: [
    {
      date: '2026.06.30',
      title: 'Refreshed Design & New Logo',
      body: 'We rolled out a brighter, easier-to-read light theme and applied a new logo across the app.',
    },
    {
      date: '2026.06.26',
      title: 'Events & Stamp Rally Released',
      body: 'Check in at participating venues to collect stamps and redeem them for rewards.',
    },
    {
      date: '2026.06.20',
      title: 'Membership QR & Visit History on My Page',
      body: 'Show your membership QR to check in, and track your visit history and stamp progress.',
    },
    {
      date: '2026.06.13',
      title: 'Full-Screen Vacancy Map with Freshness',
      body: 'The map is now full-screen, and you can see at a glance how fresh each vacancy update is.',
    },
    {
      date: '2026.04.23',
      title: 'LINE Coupon Distribution Released',
      body: 'Stores can now send coupons directly from their LINE Official Account. Customers receive them in LIFF and redeem in-store by showing a 6-digit code.',
    },
    {
      date: '2026.04.22',
      title: 'Login Redesigned (LINE Login & Password Reset)',
      body: 'Customer login is now separated from operator/store login. LINE sign-in is supported, and you can reset your password via a secure email link.',
    },
    {
      date: '2026.04.22',
      title: 'Ogori & In-App Coupons Discontinued',
      body: 'The "Ogori" and in-app "Coupon" features have ended. Coupons will now be issued directly from stores via LINE going forward.',
    },
    {
      date: '2026.04.21',
      title: 'Store Console & Vacancy Map Redesigned',
      body: 'Unified the brand color (Brewer Navy) and merged "Broadcast" and "Analytics" into one screen. The store QR code page has also been refreshed.',
    },
    {
      date: '2026.04.09',
      title: 'Vacancy Push Notifications Released',
      body: 'Get a push notification when seats open up at nearby venues. Toggle on/off from the bell icon on the left side of the map.',
    },
    {
      date: '2026.03.03',
      title: 'NIKENME+ Featured on PR TIMES',
      body: 'An article about NIKENME+, the real-time vacancy map for Oita\'s nightlife, has been published on PR TIMES.',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'Read the PR TIMES article',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ Officially Launched',
      body: 'NIKENME+ is now live — a new service for enjoying nightlife in Oita. Give it a try.',
    },
  ],
  ko: [
    {
      date: '2026.06.30',
      title: '디자인과 새 로고 리뉴얼',
      body: '밝고 보기 편한 라이트 테마로 디자인을 개편하고 새 로고를 앱 전체에 반영했습니다.',
    },
    {
      date: '2026.06.26',
      title: '이벤트 & 스탬프 랠리 기능 출시',
      body: '참여 매장을 돌며 체크인하면 스탬프가 쌓이고 특전과 교환할 수 있습니다.',
    },
    {
      date: '2026.06.20',
      title: '마이페이지에 회원증 QR·방문 이력 추가',
      body: '회원증 QR을 제시해 체크인하고, 방문 이력과 스탬프 진행 상황도 확인할 수 있습니다.',
    },
    {
      date: '2026.06.13',
      title: '빈자리 지도 전체화면·신선도 표시 강화',
      body: '지도를 전체화면으로 표시하고, 빈자리 정보의 최신 정도(신선도)를 한눈에 알 수 있게 했습니다.',
    },
    {
      date: '2026.04.23',
      title: 'LINE 쿠폰 발행 기능 출시',
      body: '매장이 LINE 공식 계정에서 직접 쿠폰을 배포할 수 있게 되었습니다. 고객은 LIFF에서 받아 6자리 코드를 매장에 제시하면 사용할 수 있습니다.',
    },
    {
      date: '2026.04.22',
      title: '로그인 화면 개편 (LINE 로그인 · 비밀번호 재설정 지원)',
      body: '고객용과 운영자·매장용 로그인 화면을 분리하고, LINE 로그인 및 이메일을 통한 비밀번호 재설정 기능을 추가했습니다.',
    },
    {
      date: '2026.04.22',
      title: '오고리 사케 · 쿠폰 기능 종료',
      body: '"오고리 사케"와 앱 내 "쿠폰 표시" 기능 제공을 종료했습니다. 앞으로는 매장이 LINE에서 직접 쿠폰을 발급하는 방식으로 전환됩니다.',
    },
    {
      date: '2026.04.21',
      title: '매장 관리 화면 · 빈자리 지도 디자인 개편',
      body: '브랜드 컬러(Brewer Navy)로 통일하고 매장 관리 화면의 "발신"과 "분석"을 하나로 통합했습니다. QR 코드 발급 화면도 보기 쉽게 개선했습니다.',
    },
    {
      date: '2026.04.09',
      title: '빈자리 알림(푸시 알림) 출시',
      body: '근처 매장에 빈자리가 생기면 푸시 알림을 받을 수 있게 되었습니다. 지도 왼쪽 벨 아이콘에서 ON/OFF를 전환해 주세요.',
    },
    {
      date: '2026.03.03',
      title: 'PR TIMES에 NIKENME+ 게재',
      body: '오이타의 밤거리를 지키는 실시간 빈자리 지도 「NIKENME+」 기사가 PR TIMES에 게재되었습니다.',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'PR TIMES 기사 읽기',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 정식 출시',
      body: '오이타의 밤을 즐기기 위한 새로운 서비스 「NIKENME+」가 정식으로 출시되었습니다. 꼭 이용해 보세요.',
    },
  ],
  zh: [
    {
      date: '2026.06.30',
      title: '设计与全新Logo焕新',
      body: '全面改用更明亮易读的浅色主题，并在整个应用启用全新Logo。',
    },
    {
      date: '2026.06.26',
      title: '活动＆集章打卡功能上线',
      body: '到参与店铺打卡即可累积印章，并可兑换专属奖励。',
    },
    {
      date: '2026.06.20',
      title: '个人页新增会员码与到店记录',
      body: '出示会员二维码即可打卡，并可查看到店记录与集章进度。',
    },
    {
      date: '2026.06.13',
      title: '空位地图全屏显示·强化鲜度提示',
      body: '地图改为全屏显示，空位信息的新鲜程度一目了然。',
    },
    {
      date: '2026.04.23',
      title: 'LINE优惠券发放功能上线',
      body: '店铺可通过LINE官方账号直接发放优惠券。用户在LIFF内领取，到店出示6位核销码即可使用。',
    },
    {
      date: '2026.04.22',
      title: '登录界面重新设计（支持LINE登录·密码重置）',
      body: '将用户登录与运营者·店铺登录拆分为独立界面，新增LINE登录及通过邮箱进行密码重置的功能。',
    },
    {
      date: '2026.04.22',
      title: '请客清酒·优惠券功能已停止',
      body: '"请客清酒"及应用内"优惠券显示"功能已停止提供。今后将由店铺通过LINE直接发放优惠券。',
    },
    {
      date: '2026.04.21',
      title: '店铺管理界面·空位地图重新设计',
      body: '整体配色统一为品牌色（Brewer Navy），并将店铺管理界面的"发送"和"分析"整合为同一页面。二维码发放界面也更易使用。',
    },
    {
      date: '2026.04.09',
      title: '空位推送通知功能上线',
      body: '附近店铺出现空位时可收到推送通知。点击地图左侧的铃铛图标即可开启或关闭。',
    },
    {
      date: '2026.03.03',
      title: 'PR TIMES报道NIKENME+',
      body: '关于大分夜生活实时空位地图「NIKENME+」的报道已发布在PR TIMES。',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: '阅读PR TIMES文章',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 正式上线',
      body: '为大分夜生活打造的全新服务「NIKENME+」已正式上线，欢迎体验。',
    },
  ],
};
