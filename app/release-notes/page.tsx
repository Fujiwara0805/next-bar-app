'use client';

import Link from 'next/link';
import { ArrowLeft, Star, Zap, Sparkles, MapPin, Phone, Users, MessageCircle, LogIn, Ticket, Palette, QrCode, ScanLine, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';
import { useAppMode } from '@/lib/app-mode-context';

const releaseTranslations = {
  ja: [
    {
      version: '1.4.0',
      date: '2026年4月',
      changes: [
        { icon: Ticket, title: 'LINEクーポン発行機能', desc: '店舗がLINE公式アカウントからリッチなFlexメッセージでクーポンを配信できるようになりました。割引率・定額引き・無料特典に対応し、店舗フォロワー／近くのフォロワー／全OAを対象に配信できます。' },
        { icon: ScanLine, title: '6桁コードによる店舗消込', desc: 'お客様はLIFFで受け取ったクーポンの6桁コードを提示するだけで使用できます。店舗側は専用の消込画面で素早く消込処理ができ、二重消込も防止します。' },
        { icon: BarChart3, title: 'クーポン効果分析（属性内訳付き）', desc: '「分析」画面に発行数・消込率(CVR)・クーポン別内訳に加え、来店者属性（年代・性別・大分県内外・初来店/リピート）のブレイクダウンを追加しました。' },
      ],
    },
    {
      version: '1.3.0',
      date: '2026年4月',
      changes: [
        { icon: LogIn, title: 'ログイン画面の分離 & LINEログイン対応', desc: 'お客様ログインと運営者・店舗ログインを別画面に分離しました。お客様はLINEアカウント、またはメールアドレス＋パスワードでログインできます。' },
        { icon: QrCode, title: 'アプリ内QRスキャナ & 12時間スタンプラリー', desc: '来店時に店舗QRを読み取って来店記録を残せる機能をリリース。12時間以内に3〜5店舗を回るとスタンプラリー抽選に応募できます。' },
        { icon: Sparkles, title: 'パスワードリセット機能を追加', desc: 'ログイン画面の「パスワードを忘れた方」から、ご登録メールアドレス宛にリセット用リンクをお送りします。届いたリンクから新しいパスワードを設定できます。' },
        { icon: Palette, title: 'カラーパレットをブランドカラーに統一', desc: 'サービス全体の配色をBrewer Navy系のブランドカラーへ統一。店舗管理画面の「配信」と「分析」を1画面に統合し、QRコード発行画面もリデザインしました。' },
        { icon: Ticket, title: 'おごり酒・クーポン機能の終了', desc: 'おごり酒（オンライン購入＆チケット受取）機能と、アプリ内のクーポン表示機能の提供を終了しました。次フェーズでは、店舗側がLINEから必要に応じてクーポンを発行できる機能を開発予定です。' },
      ],
    },
    {
      version: '1.2.0',
      date: '2026年2月',
      changes: [
        { icon: Users, title: 'コンシェルジュ機能', desc: 'あなたの好みに合わせてAIがおすすめのお店を提案。雰囲気・予算・客層などの条件で最適な店舗を見つけられます。' },
        { icon: MessageCircle, title: 'お問い合わせフォーム', desc: 'サービスに関するご質問やご要望をお問い合わせフォームから送信できるようになりました。' },
      ],
    },
    {
      version: '1.1.0',
      date: '2025年12月',
      changes: [
        { icon: Phone, title: '自動音声予約機能', desc: '到着時間・人数を入力するだけで、自動音声がお店に電話して席をキープ。電話が苦手な方でも簡単に予約できます。' },
        { icon: MapPin, title: 'エリアガイド追加', desc: '大分・都町エリアと中央町エリアのおすすめ店舗ガイドを追加。シーン別の夜の過ごし方もご紹介。' },
        { icon: Sparkles, title: '多言語対応（4言語）', desc: '日本語・英語・韓国語・中国語に対応。海外からの観光客やビジネス出張者もスムーズに利用できます。' },
      ],
    },
    {
      version: '1.0.0',
      date: '2025年11月01日',
      changes: [
        { icon: Star, title: '初回リリース', desc: 'NIKENME+の正式リリース。大分市内の店舗の空席情報をリアルタイムで確認できるようになりました。' },
        { icon: Zap, title: 'リアルタイム更新機能', desc: '店舗の空席情報がリアルタイムで地図上に反映されます。' },
        { icon: MapPin, title: '位置情報連携', desc: '現在地からの距離を表示し、近くの店舗を簡単に見つけられます。' },
      ],
    },
  ],
  en: [
    {
      version: '1.4.0',
      date: 'April 2026',
      changes: [
        { icon: Ticket, title: 'LINE Coupon Distribution', desc: 'Stores can now distribute rich Flex Message coupons from their LINE Official Account. Three coupon types are supported (percent-off, amount-off, free item) with targeting by store followers, nearby followers, or the entire OA audience.' },
        { icon: ScanLine, title: 'In-Store Redemption via 6-Digit Code', desc: 'Customers simply show the 6-digit code from the coupon they received in LIFF. The dedicated redemption screen lets staff process coupons quickly while preventing double-redemption.' },
        { icon: BarChart3, title: 'Coupon Analytics with Audience Breakdown', desc: 'The Analytics screen now shows issued count, redemption CVR, and per-coupon rows — plus a redeemer breakdown by age, gender, inside-Oita / outside-Oita, and first-visit / repeat.' },
      ],
    },
    {
      version: '1.3.0',
      date: 'April 2026',
      changes: [
        { icon: LogIn, title: 'Separate Login Screens & LINE Login', desc: 'Customer login is now on a dedicated screen, separated from the operator / store login. Customers can sign in with a LINE account or with email + password.' },
        { icon: QrCode, title: 'In-App QR Scanner & 12-hour Stamp Rally', desc: 'You can now scan a store QR code in-app to record your visit. Visit 3–5 stores within a 12-hour window to qualify for the stamp rally drawing.' },
        { icon: Sparkles, title: 'Password Reset Feature Added', desc: 'Tap "Forgot password?" on the login screen and we will email a secure link to your registered address so you can set a new password.' },
        { icon: Palette, title: 'Unified Brand Color Palette', desc: 'The product-wide color palette is now unified around the Brewer Navy brand theme. In the store console, "Broadcast" and "Analytics" are merged into one screen, and the QR code page has been redesigned.' },
        { icon: Ticket, title: 'Ogori & Coupon Features Discontinued', desc: 'The "Ogori" (online drink purchase & ticket pickup) feature and the in-app coupon display have been discontinued. In the next phase, store operators will be able to issue coupons on demand via LINE.' },
      ],
    },
    {
      version: '1.2.0',
      date: 'February 2026',
      changes: [
        { icon: Users, title: 'Concierge Feature', desc: 'AI recommends stores based on your preferences. Find the perfect venue by atmosphere, budget, crowd type, and more.' },
        { icon: MessageCircle, title: 'Contact Form', desc: 'You can now submit questions and requests about the service through the contact form.' },
      ],
    },
    {
      version: '1.1.0',
      date: 'December 2025',
      changes: [
        { icon: Phone, title: 'Auto-Voice Reservation', desc: 'Just enter arrival time and party size. Auto-voice calls the store and reserves your seat - no awkward phone calls needed.' },
        { icon: MapPin, title: 'Area Guide Added', desc: 'Added recommended store guides for Miyako-machi and Chuo-machi areas in Oita, with scene-based nightlife suggestions.' },
        { icon: Sparkles, title: 'Multi-language Support (4 languages)', desc: 'Now supporting Japanese, English, Korean, and Chinese. International tourists and business travelers can use the service seamlessly.' },
      ],
    },
    {
      version: '1.0.0',
      date: 'November 01, 2025',
      changes: [
        { icon: Star, title: 'Initial Release', desc: 'Official release of NIKENME+. Real-time vacancy checking for stores in Oita City is now available.' },
        { icon: Zap, title: 'Real-time Updates', desc: 'Store vacancy information is reflected on the map in real-time.' },
        { icon: MapPin, title: 'Location Integration', desc: 'Shows distance from your current location for easy store discovery.' },
      ],
    },
  ],
  ko: [
    {
      version: '1.4.0',
      date: '2026년 4월',
      changes: [
        { icon: Ticket, title: 'LINE 쿠폰 발행 기능', desc: '매장이 LINE 공식 계정에서 리치 Flex 메시지로 쿠폰을 배포할 수 있게 되었습니다. 할인율·정액 할인·무료 제공에 대응하며, 매장 팔로워·근처 팔로워·전체 OA를 대상으로 배포할 수 있습니다.' },
        { icon: ScanLine, title: '6자리 코드 매장 사용 처리', desc: '고객은 LIFF에서 받은 쿠폰의 6자리 코드를 제시하기만 하면 됩니다. 매장은 전용 사용 처리 화면에서 빠르게 처리할 수 있으며, 중복 사용도 방지합니다.' },
        { icon: BarChart3, title: '쿠폰 효과 분석 (속성 브레이크다운 포함)', desc: '"분석" 화면에 발행 수·사용률(CVR)·쿠폰별 내역과 함께 방문자 속성(연령대·성별·오이타 안/밖·첫 방문/재방문) 브레이크다운을 추가했습니다.' },
      ],
    },
    {
      version: '1.3.0',
      date: '2026년 4월',
      changes: [
        { icon: LogIn, title: '로그인 화면 분리 & LINE 로그인 지원', desc: '고객 로그인과 운영자·매장 로그인을 별도의 화면으로 분리했습니다. 고객은 LINE 계정 또는 이메일 주소와 비밀번호로 로그인할 수 있습니다.' },
        { icon: QrCode, title: '앱 내 QR 스캐너 & 12시간 스탬프 랠리', desc: '매장 방문 시 매장 QR 코드를 스캔해 방문 기록을 남길 수 있습니다. 12시간 이내에 3~5곳을 방문하시면 스탬프 랠리 추첨에 응모할 수 있습니다.' },
        { icon: Sparkles, title: '비밀번호 재설정 기능 추가', desc: '로그인 화면의 "비밀번호를 잊으셨나요?"에서 등록하신 이메일 주소로 재설정 링크를 보내드립니다. 링크에서 새로운 비밀번호를 설정하실 수 있습니다.' },
        { icon: Palette, title: '컬러 팔레트를 브랜드 컬러로 통일', desc: '서비스 전체의 색상을 Brewer Navy 계열의 브랜드 컬러로 통일했습니다. 매장 관리 화면의 "발신"과 "분석"을 하나의 화면으로 통합하고 QR 코드 발급 화면도 다시 디자인했습니다.' },
        { icon: Ticket, title: '오고리 사케 및 쿠폰 기능 종료', desc: '오고리 사케(온라인 구매 & 티켓 수령) 기능과 앱 내 쿠폰 표시 기능 제공을 종료했습니다. 다음 단계에서는 매장이 필요에 따라 LINE에서 쿠폰을 발급할 수 있는 기능을 개발할 예정입니다.' },
      ],
    },
    {
      version: '1.2.0',
      date: '2026년 2월',
      changes: [
        { icon: Users, title: '컨시어지 기능', desc: '당신의 취향에 맞게 AI가 추천 매장을 제안합니다. 분위기·예산·손님층 등의 조건으로 최적의 매장을 찾을 수 있습니다.' },
        { icon: MessageCircle, title: '문의 양식', desc: '서비스에 관한 질문이나 요청을 문의 양식에서 보낼 수 있게 되었습니다.' },
      ],
    },
    {
      version: '1.1.0',
      date: '2025년 12월',
      changes: [
        { icon: Phone, title: '자동 음성 예약 기능', desc: '도착 시간과 인원을 입력하면 자동 음성이 매장에 전화하여 좌석을 예약합니다. 전화가 부담스러운 분도 쉽게 예약할 수 있습니다.' },
        { icon: MapPin, title: '에어리어 가이드 추가', desc: '오이타·미야코마치 지역과 주오마치 지역의 추천 매장 가이드를 추가했습니다.' },
        { icon: Sparkles, title: '다국어 지원 (4개국어)', desc: '일본어·영어·한국어·중국어를 지원합니다. 해외 관광객이나 출장자도 편리하게 이용할 수 있습니다.' },
      ],
    },
    {
      version: '1.0.0',
      date: '2025년 11월 01일',
      changes: [
        { icon: Star, title: '초기 릴리스', desc: 'NIKENME+ 정식 출시. 오이타시 내 매장의 좌석 정보를 실시간으로 확인할 수 있게 되었습니다.' },
        { icon: Zap, title: '실시간 업데이트 기능', desc: '매장의 좌석 정보가 실시간으로 지도에 반영됩니다.' },
        { icon: MapPin, title: '위치 정보 연동', desc: '현재 위치에서의 거리를 표시하여 가까운 매장을 쉽게 찾을 수 있습니다.' },
      ],
    },
  ],
  zh: [
    {
      version: '1.4.0',
      date: '2026年4月',
      changes: [
        { icon: Ticket, title: 'LINE 优惠券发放功能', desc: '店铺现可通过LINE官方账号发送富Flex消息优惠券。支持折扣率、定额减免、免费赠送三种类型，可按店铺粉丝、附近粉丝或全部OA粉丝进行发放。' },
        { icon: ScanLine, title: '通过6位码到店核销', desc: '用户在LIFF中收到优惠券后，只需出示6位核销码即可使用。店铺可在专用核销界面快速处理，并防止重复核销。' },
        { icon: BarChart3, title: '优惠券效果分析（含属性细分）', desc: '"分析"页面新增发放数、核销率(CVR)、按优惠券细分的指标，以及核销者属性（年龄段、性别、大分县内/外、首次到店/回头客）的细分。' },
      ],
    },
    {
      version: '1.3.0',
      date: '2026年4月',
      changes: [
        { icon: LogIn, title: '登录界面分离 & 支持LINE登录', desc: '将用户登录与运营者·店铺登录分为两个独立界面。用户可以使用LINE账号或邮箱+密码登录。' },
        { icon: QrCode, title: '应用内二维码扫描器 & 12小时印章集章', desc: '到店时可在应用内扫描店铺二维码以记录到访。在12小时内访问3~5家店铺即可参与印章集章抽奖。' },
        { icon: Sparkles, title: '新增密码重置功能', desc: '在登录界面点击"忘记密码？"，我们会将重置链接发送至您注册的邮箱。您可以通过链接设置新密码。' },
        { icon: Palette, title: '配色方案统一为品牌色', desc: '将整个服务的配色方案统一为Brewer Navy系的品牌色。店铺管理界面的"发送"和"分析"整合到同一个页面，二维码发放界面也已重新设计。' },
        { icon: Ticket, title: '请客清酒及优惠券功能已停止提供', desc: '"请客清酒（在线购买 & 门票领取）"功能和应用内优惠券显示功能已停止提供。下个阶段将开发店铺可以根据需要通过LINE发放优惠券的功能。' },
      ],
    },
    {
      version: '1.2.0',
      date: '2026年2月',
      changes: [
        { icon: Users, title: '礼宾功能', desc: 'AI根据您的喜好推荐合适的店铺。可以通过氛围、预算、客层等条件找到最佳店铺。' },
        { icon: MessageCircle, title: '联系表单', desc: '现在可以通过联系表单发送关于服务的问题和请求。' },
      ],
    },
    {
      version: '1.1.0',
      date: '2025年12月',
      changes: [
        { icon: Phone, title: '自动语音预约功能', desc: '只需输入到达时间和人数，自动语音即会致电店铺为您预留座位。不擅长打电话的人也可以轻松预约。' },
        { icon: MapPin, title: '地区指南追加', desc: '追加了大分·都町地区和中央町地区的推荐店铺指南，以及各种场景的夜间游玩方式。' },
        { icon: Sparkles, title: '多语言支持（4种语言）', desc: '支持日语、英语、韩语和中文。海外游客和商务出差人员也可以流畅使用。' },
      ],
    },
    {
      version: '1.0.0',
      date: '2025年11月01日',
      changes: [
        { icon: Star, title: '首次发布', desc: 'NIKENME+正式上线。现在可以实时查看大分市内店铺的座位信息。' },
        { icon: Zap, title: '实时更新功能', desc: '店铺座位信息实时反映在地图上。' },
        { icon: MapPin, title: '位置信息联动', desc: '显示与当前位置的距离，轻松找到附近的店铺。' },
      ],
    },
  ],
};

export default function ReleaseNotesPage() {
  const { colorsA: COLORS } = useAppMode();
  const { t, language } = useLanguage();
  const releases = releaseTranslations[language] || releaseTranslations.ja;

  return (
    <div className="min-h-screen" style={{ background: COLORS.luxuryGradient }}>
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: `${COLORS.background}CC`, borderBottom: `1px solid ${COLORS.borderGold}` }}>
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105" style={{ color: COLORS.accent }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t('static_pages.back')}</span>
          </Link>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full"
            style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.borderGold}` }}
          >
            <Star className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: COLORS.accent }}>Updates</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: COLORS.text }}>{t('release_notes_page.title')}</h1>
          <p className="text-base" style={{ color: COLORS.textMuted }}>{t('release_notes_page.subtitle')}</p>
        </div>

        <div className="space-y-8">
          {releases.map((release, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative pl-6"
              style={{ borderLeft: `2px solid ${COLORS.accent}` }}
            >
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full" style={{ background: COLORS.goldGradient, boxShadow: `0 0 10px ${COLORS.accent}60` }} />

              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl sm:text-2xl font-bold" style={{ color: COLORS.text }}>v{release.version}</span>
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: `${COLORS.accent}15`, color: COLORS.accent, border: `1px solid ${COLORS.borderGold}` }}>
                  {release.date}
                </span>
                {index === 0 && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: COLORS.goldGradient, color: COLORS.background }}>
                    Latest
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {release.changes.map((change, changeIndex) => {
                  const Icon = change.icon;
                  return (
                    <motion.div
                      key={changeIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: (index * 0.1) + (changeIndex * 0.05) }}
                      className="flex gap-3 p-4 rounded-xl"
                      style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderSubtle}` }}
                    >
                      <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS.accent}15` }}>
                        <Icon className="w-4 h-4" style={{ color: COLORS.accent }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1" style={{ color: COLORS.text }}>{change.title}</h3>
                        <p className="text-xs leading-relaxed" style={{ color: COLORS.textMuted }}>{change.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.main>
    </div>
  );
}
