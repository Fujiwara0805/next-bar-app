'use client';

import Link from 'next/link';
import { ArrowLeft, Star, Zap, Sparkles, MapPin, Phone, Ticket, Users, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';

const COLORS = {
  background: '#0A1628',
  surface: '#162447',
  accent: '#C9A86C',
  accentLight: '#E8D5B7',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
};

const releaseTranslations = {
  ja: [
    {
      version: '1.2.0',
      date: '2025年6月',
      changes: [
        { icon: Ticket, title: 'クーポン＆ボーナス特典', desc: 'お店のクーポンを取得可能に。さらにGoogle口コミ投稿やInstagramフォローで追加特典がもらえるようになりました。' },
        { icon: Users, title: 'コンシェルジュ機能', desc: 'あなたの好みに合わせてAIがおすすめのお店を提案。雰囲気・予算・客層などの条件で最適な店舗を見つけられます。' },
        { icon: MessageCircle, title: 'お問い合わせフォーム', desc: 'サービスに関するご質問やご要望をお問い合わせフォームから送信できるようになりました。' },
      ],
    },
    {
      version: '1.1.0',
      date: '2025年3月',
      changes: [
        { icon: Phone, title: '自動音声予約機能', desc: '到着時間・人数を入力するだけで、自動音声がお店に電話して席をキープ。電話が苦手な方でも簡単に予約できます。' },
        { icon: MapPin, title: 'エリアガイド追加', desc: '大分・都町エリアと中央町エリアのおすすめ店舗ガイドを追加。シーン別の夜の過ごし方もご紹介。' },
        { icon: Sparkles, title: '多言語対応（4言語）', desc: '日本語・英語・韓国語・中国語に対応。海外からの観光客やビジネス出張者もスムーズに利用できます。' },
      ],
    },
    {
      version: '1.0.0',
      date: '2025年1月30日',
      changes: [
        { icon: Star, title: '初回リリース', desc: 'NIKENME+の正式リリース。大分市内の店舗の空席情報をリアルタイムで確認できるようになりました。' },
        { icon: Zap, title: 'リアルタイム更新機能', desc: '店舗の空席情報がリアルタイムで地図上に反映されます。' },
        { icon: MapPin, title: '位置情報連携', desc: '現在地からの距離を表示し、近くの店舗を簡単に見つけられます。' },
      ],
    },
  ],
  en: [
    {
      version: '1.2.0',
      date: 'June 2025',
      changes: [
        { icon: Ticket, title: 'Coupons & Bonus Rewards', desc: 'Get coupons from partner stores. Earn extra bonuses by posting Google reviews or following store Instagram accounts.' },
        { icon: Users, title: 'Concierge Feature', desc: 'AI recommends stores based on your preferences. Find the perfect venue by atmosphere, budget, crowd type, and more.' },
        { icon: MessageCircle, title: 'Contact Form', desc: 'You can now submit questions and requests about the service through the contact form.' },
      ],
    },
    {
      version: '1.1.0',
      date: 'March 2025',
      changes: [
        { icon: Phone, title: 'Auto-Voice Reservation', desc: 'Just enter arrival time and party size. Auto-voice calls the store and reserves your seat - no awkward phone calls needed.' },
        { icon: MapPin, title: 'Area Guide Added', desc: 'Added recommended store guides for Miyako-machi and Chuo-machi areas in Oita, with scene-based nightlife suggestions.' },
        { icon: Sparkles, title: 'Multi-language Support (4 languages)', desc: 'Now supporting Japanese, English, Korean, and Chinese. International tourists and business travelers can use the service seamlessly.' },
      ],
    },
    {
      version: '1.0.0',
      date: 'January 30, 2025',
      changes: [
        { icon: Star, title: 'Initial Release', desc: 'Official release of NIKENME+. Real-time vacancy checking for stores in Oita City is now available.' },
        { icon: Zap, title: 'Real-time Updates', desc: 'Store vacancy information is reflected on the map in real-time.' },
        { icon: MapPin, title: 'Location Integration', desc: 'Shows distance from your current location for easy store discovery.' },
      ],
    },
  ],
  ko: [
    {
      version: '1.2.0',
      date: '2025년 6월',
      changes: [
        { icon: Ticket, title: '쿠폰 & 보너스 특전', desc: '가맹점 쿠폰을 받을 수 있게 되었습니다. Google 리뷰 작성이나 Instagram 팔로우로 추가 특전도 받을 수 있습니다.' },
        { icon: Users, title: '컨시어지 기능', desc: '당신의 취향에 맞게 AI가 추천 매장을 제안합니다. 분위기·예산·손님층 등의 조건으로 최적의 매장을 찾을 수 있습니다.' },
        { icon: MessageCircle, title: '문의 양식', desc: '서비스에 관한 질문이나 요청을 문의 양식에서 보낼 수 있게 되었습니다.' },
      ],
    },
    {
      version: '1.1.0',
      date: '2025년 3월',
      changes: [
        { icon: Phone, title: '자동 음성 예약 기능', desc: '도착 시간과 인원을 입력하면 자동 음성이 매장에 전화하여 좌석을 예약합니다. 전화가 부담스러운 분도 쉽게 예약할 수 있습니다.' },
        { icon: MapPin, title: '에어리어 가이드 추가', desc: '오이타·미야코마치 지역과 주오마치 지역의 추천 매장 가이드를 추가했습니다.' },
        { icon: Sparkles, title: '다국어 지원 (4개국어)', desc: '일본어·영어·한국어·중국어를 지원합니다. 해외 관광객이나 출장자도 편리하게 이용할 수 있습니다.' },
      ],
    },
    {
      version: '1.0.0',
      date: '2025년 1월 30일',
      changes: [
        { icon: Star, title: '초기 릴리스', desc: 'NIKENME+ 정식 출시. 오이타시 내 매장의 좌석 정보를 실시간으로 확인할 수 있게 되었습니다.' },
        { icon: Zap, title: '실시간 업데이트 기능', desc: '매장의 좌석 정보가 실시간으로 지도에 반영됩니다.' },
        { icon: MapPin, title: '위치 정보 연동', desc: '현재 위치에서의 거리를 표시하여 가까운 매장을 쉽게 찾을 수 있습니다.' },
      ],
    },
  ],
  zh: [
    {
      version: '1.2.0',
      date: '2025年6月',
      changes: [
        { icon: Ticket, title: '优惠券和奖励特典', desc: '可以获取加盟店的优惠券。通过发表Google评价或关注Instagram还可以获得额外特典。' },
        { icon: Users, title: '礼宾功能', desc: 'AI根据您的喜好推荐合适的店铺。可以通过氛围、预算、客层等条件找到最佳店铺。' },
        { icon: MessageCircle, title: '联系表单', desc: '现在可以通过联系表单发送关于服务的问题和请求。' },
      ],
    },
    {
      version: '1.1.0',
      date: '2025年3月',
      changes: [
        { icon: Phone, title: '自动语音预约功能', desc: '只需输入到达时间和人数，自动语音即会致电店铺为您预留座位。不擅长打电话的人也可以轻松预约。' },
        { icon: MapPin, title: '地区指南追加', desc: '追加了大分·都町地区和中央町地区的推荐店铺指南，以及各种场景的夜间游玩方式。' },
        { icon: Sparkles, title: '多语言支持（4种语言）', desc: '支持日语、英语、韩语和中文。海外游客和商务出差人员也可以流畅使用。' },
      ],
    },
    {
      version: '1.0.0',
      date: '2025年1月30日',
      changes: [
        { icon: Star, title: '首次发布', desc: 'NIKENME+正式上线。现在可以实时查看大分市内店铺的座位信息。' },
        { icon: Zap, title: '实时更新功能', desc: '店铺座位信息实时反映在地图上。' },
        { icon: MapPin, title: '位置信息联动', desc: '显示与当前位置的距离，轻松找到附近的店铺。' },
      ],
    },
  ],
};

export default function ReleaseNotesPage() {
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
