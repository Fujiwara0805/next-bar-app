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
      date: '2026.03.03',
      title: 'PR TIMESにてNIKENME+が紹介されました',
      body: '「もう一軒、行こうか」— その一言が、街の未来を変える。大分の夜の街を救うリアルタイム空席マップ「NIKENME+」の記事がPR TIMESに掲載されました。',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'PR TIMESの記事を読む',
    },
    {
      date: '2026.03.01',
      title: 'NIKENME+ v1.2 リリース',
      body: 'クーポン機能が追加されました。加盟店のクーポンを取得して、お得に楽しめます。',
    },
    {
      date: '2026.02.15',
      title: 'キャンペーン参加店舗が追加されました',
      body: '新たにキャンペーンに参加する店舗が追加されました。お得な特典をお見逃しなく。',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 正式リリース',
      body: 'NIKENME+が正式にリリースされました。大分の夜を楽しむための新しいサービスをぜひお試しください。',
    },
  ],
  en: [
    {
      date: '2026.03.03',
      title: 'NIKENME+ Featured on PR TIMES',
      body: '"Where to next?" — A single question that changes the future of the city. An article about NIKENME+, the real-time vacancy map for Oita\'s nightlife, has been published on PR TIMES.',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'Read the PR TIMES article',
    },
    {
      date: '2026.03.01',
      title: 'NIKENME+ v1.2 Released',
      body: 'Coupon feature has been added. Get coupons from partner stores and enjoy great deals.',
    },
    {
      date: '2026.02.15',
      title: 'New Campaign Partner Stores Added',
      body: 'New stores have joined the campaign. Don\'t miss out on exclusive offers.',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ Officially Launched',
      body: 'NIKENME+ has officially launched. Try our new service for enjoying nightlife in Oita.',
    },
  ],
  ko: [
    {
      date: '2026.03.03',
      title: 'PR TIMES에 NIKENME+가 소개되었습니다',
      body: '「한 잔 더 할까?」— 그 한마디가 거리의 미래를 바꿉니다. 오이타의 밤거리를 구하는 실시간 빈자리 지도 「NIKENME+」 기사가 PR TIMES에 게재되었습니다.',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: 'PR TIMES 기사 읽기',
    },
    {
      date: '2026.03.01',
      title: 'NIKENME+ v1.2 출시',
      body: '쿠폰 기능이 추가되었습니다. 가맹점 쿠폰을 받아 알뜰하게 즐기세요.',
    },
    {
      date: '2026.02.15',
      title: '캠페인 참여 매장이 추가되었습니다',
      body: '새로운 매장이 캠페인에 참여했습니다. 특별 혜택을 놓치지 마세요.',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 정식 출시',
      body: 'NIKENME+가 정식으로 출시되었습니다. 오이타의 밤을 즐기기 위한 새로운 서비스를 이용해 보세요.',
    },
  ],
  zh: [
    {
      date: '2026.03.03',
      title: 'NIKENME+被PR TIMES报道',
      body: '「再去一家吧」— 这句话将改变城市的未来。关于大分夜生活实时空位地图「NIKENME+」的文章已发布在PR TIMES上。',
      link: 'https://prtimes.jp/main/html/rd/p/000000003.000177933.html',
      linkLabel: '阅读PR TIMES文章',
    },
    {
      date: '2026.03.01',
      title: 'NIKENME+ v1.2 发布',
      body: '新增优惠券功能。获取加盟店优惠券，享受更多优惠。',
    },
    {
      date: '2026.02.15',
      title: '新增活动参与店铺',
      body: '新的店铺加入了活动。请不要错过独家优惠。',
    },
    {
      date: '2026.02.01',
      title: 'NIKENME+ 正式上线',
      body: 'NIKENME+已正式上线。请试用我们为大分夜生活打造的全新服务。',
    },
  ],
};
