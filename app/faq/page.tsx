'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/context';

const COLORS = {
  background: '#0A1628',
  surface: '#162447',
  surfaceLight: '#1F4068',
  accent: '#C9A86C',
  accentLight: '#E8D5B7',
  accentDark: '#B8956E',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
};

const faqTranslations = {
  ja: [
    { question: 'NIKENME+とは何ですか？', answer: 'NIKENME+（ニケンメプラス）は、大分県大分市で2軒目・バー・スナック・居酒屋を探す際に便利な空席情報マップサービスです。リアルタイムで店舗の空席状況を地図上で確認でき、ログイン不要で今すぐ使えます。' },
    { question: '利用料金はかかりますか？', answer: '完全無料です。ログインや会員登録も不要で、アクセスするだけですぐに利用できます。' },
    { question: '位置情報を許可する必要がありますか？', answer: '位置情報の許可は必須ではありませんが、許可していただくと現在地周辺の店舗を表示でき、距離も確認できるためより便利にご利用いただけます。位置情報はサーバーに保存されず、ブラウザ上でのみ一時的に使用されます。' },
    { question: '空席情報はリアルタイムで更新されますか？', answer: 'はい、店舗オーナーが更新した空席情報はリアルタイムで反映されます。常に最新の情報を確認できるため、無駄な移動や待ち時間を減らせます。' },
    { question: '対応エリアはどこですか？', answer: '現在は大分県大分市を中心にサービスを提供しています。今後、他のエリアへの展開も検討しています。' },
    { question: 'スマートフォンでも使えますか？', answer: 'はい、スマートフォン、タブレット、PCなど、あらゆるデバイスで利用できます。レスポンシブデザインにより、どのデバイスでも快適にご利用いただけます。' },
    { question: '予約はどうやってしますか？', answer: '気になるお店の詳細ページから「席をキープ」ボタンを押して、到着時間・人数・お名前・電話番号を入力するだけ。自動音声がお店に電話してあなたの代わりに予約します。電話が苦手な方でも安心です。' },
    { question: 'クーポンはありますか？', answer: 'はい、加盟店が提供するクーポンを店舗詳細ページから取得できます。さらに、Google口コミ投稿やInstagramフォローで追加特典がもらえるお店もあります。' },
    { question: 'コンシェルジュ機能とは何ですか？', answer: 'あなたの好みや条件（雰囲気・予算・客層など）に合わせて、おすすめのお店をAIが提案する機能です。店舗リスト画面から利用できます。' },
    { question: '店舗を登録するにはどうすればいいですか？', answer: '店舗オーナーの方は、画面右上の「店舗ログイン」ボタンから登録ページにアクセスできます。必要な情報を入力して登録申請を行ってください。' },
    { question: 'お店の情報が間違っている場合はどうすればいいですか？', answer: 'お問い合わせフォームより、該当店舗名と修正内容をお知らせください。確認の上、速やかに対応いたします。' },
  ],
  en: [
    { question: 'What is NIKENME+?', answer: 'NIKENME+ is a vacancy information map service convenient for finding your second stop, bars, snacks, and izakayas in Oita City, Oita Prefecture. You can check real-time vacancy status on the map without logging in.' },
    { question: 'Is there a fee?', answer: 'It is completely free. No login or registration required - just access and start using immediately.' },
    { question: 'Do I need to allow location access?', answer: 'Location permission is not required, but allowing it enables showing nearby stores and distance information for a better experience. Location data is not saved to servers and is only temporarily used in your browser.' },
    { question: 'Is vacancy information updated in real-time?', answer: 'Yes, vacancy information updated by store owners is reflected in real-time. You can always check the latest information, reducing unnecessary travel and wait times.' },
    { question: 'What areas are covered?', answer: 'Currently, we provide services mainly in Oita City, Oita Prefecture. We are considering expansion to other areas in the future.' },
    { question: 'Can I use it on my smartphone?', answer: 'Yes, you can use it on smartphones, tablets, PCs, and any device. The responsive design ensures comfortable use on any device.' },
    { question: 'How do I make a reservation?', answer: 'Tap the "Keep a Seat" button on the store detail page, enter your arrival time, party size, name, and phone number. An automated voice call will reserve for you - perfect for those uncomfortable with phone calls.' },
    { question: 'Are there coupons available?', answer: 'Yes, you can get coupons offered by partner stores from the store detail page. Some stores also offer extra bonuses for posting Google reviews or following their Instagram.' },
    { question: 'What is the Concierge feature?', answer: 'The Concierge feature uses AI to recommend stores based on your preferences (atmosphere, budget, crowd type, etc.). Access it from the store list screen.' },
    { question: 'How do I register my store?', answer: 'Store owners can access the registration page from the "Store Login" button at the top right of the screen. Enter the required information to submit your registration.' },
    { question: 'What if store information is incorrect?', answer: 'Please contact us through the inquiry form with the store name and correction details. We will verify and respond promptly.' },
  ],
  ko: [
    { question: 'NIKENME+란 무엇인가요?', answer: 'NIKENME+는 오이타현 오이타시에서 2차, 바, 스낵, 이자카야를 찾을 때 편리한 빈자리 정보 지도 서비스입니다. 실시간으로 매장의 빈자리 상황을 지도에서 확인할 수 있으며, 로그인 없이 바로 사용할 수 있습니다.' },
    { question: '이용 요금이 있나요?', answer: '완전 무료입니다. 로그인이나 회원 등록도 필요 없이 접속만 하면 바로 이용할 수 있습니다.' },
    { question: '위치 정보를 허용해야 하나요?', answer: '위치 정보 허용은 필수가 아니지만, 허용하시면 현재 위치 주변의 매장을 표시하고 거리도 확인할 수 있어 더 편리하게 이용하실 수 있습니다. 위치 정보는 서버에 저장되지 않고 브라우저에서만 일시적으로 사용됩니다.' },
    { question: '빈자리 정보는 실시간으로 업데이트되나요?', answer: '네, 매장 오너가 업데이트한 빈자리 정보는 실시간으로 반영됩니다. 항상 최신 정보를 확인할 수 있어 불필요한 이동이나 대기 시간을 줄일 수 있습니다.' },
    { question: '지원 지역은 어디인가요?', answer: '현재는 오이타현 오이타시를 중심으로 서비스를 제공하고 있습니다. 향후 다른 지역으로의 확장도 검토하고 있습니다.' },
    { question: '스마트폰에서도 사용할 수 있나요?', answer: '네, 스마트폰, 태블릿, PC 등 모든 기기에서 이용할 수 있습니다. 반응형 디자인으로 어떤 기기에서도 편안하게 이용하실 수 있습니다.' },
    { question: '예약은 어떻게 하나요?', answer: '매장 상세 페이지에서 "좌석 예약" 버튼을 누르고, 도착 시간·인원·이름·전화번호를 입력하면 됩니다. 자동 음성이 매장에 전화하여 대신 예약합니다.' },
    { question: '쿠폰이 있나요?', answer: '네, 가맹점이 제공하는 쿠폰을 매장 상세 페이지에서 받을 수 있습니다. Google 리뷰 작성이나 Instagram 팔로우로 추가 특전을 받을 수 있는 매장도 있습니다.' },
    { question: '컨시어지 기능이란 무엇인가요?', answer: '당신의 취향이나 조건(분위기·예산·손님층 등)에 맞게 AI가 추천 매장을 제안하는 기능입니다. 매장 리스트 화면에서 이용할 수 있습니다.' },
    { question: '매장을 등록하려면 어떻게 해야 하나요?', answer: '매장 오너분은 화면 오른쪽 위의 "매장 로그인" 버튼에서 등록 페이지에 접속할 수 있습니다. 필요한 정보를 입력하여 등록 신청해 주세요.' },
    { question: '매장 정보가 잘못된 경우 어떻게 하나요?', answer: '문의 양식을 통해 해당 매장명과 수정 내용을 알려주세요. 확인 후 신속하게 대응하겠습니다.' },
  ],
  zh: [
    { question: '什么是NIKENME+？', answer: 'NIKENME+是一个方便在大分县大分市寻找下一家店、酒吧、小酒馆、居酒屋时使用的空位信息地图服务。您可以在地图上实时查看店铺的空位情况，无需登录即可立即使用。' },
    { question: '需要付费吗？', answer: '完全免费。无需登录或注册会员，只需访问即可立即使用。' },
    { question: '需要允许位置信息吗？', answer: '位置信息的许可不是必须的，但如果允许，可以显示当前位置附近的店铺并确认距离，使用起来更加方便。位置信息不会保存到服务器，仅在浏览器中临时使用。' },
    { question: '空位信息是实时更新的吗？', answer: '是的，店铺老板更新的空位信息会实时反映。您可以随时查看最新信息，减少不必要的移动和等待时间。' },
    { question: '支持哪些地区？', answer: '目前主要在大分县大分市提供服务。今后也在考虑向其他地区扩展。' },
    { question: '可以在智能手机上使用吗？', answer: '是的，您可以在智能手机、平板电脑、电脑等任何设备上使用。响应式设计确保在任何设备上都能舒适使用。' },
    { question: '如何预约？', answer: '在店铺详情页点击"预留座位"按钮，输入到达时间、人数、姓名和电话号码即可。自动语音会代替您致电店铺进行预约，不擅长打电话的人也可以放心使用。' },
    { question: '有优惠券吗？', answer: '是的，您可以在店铺详情页获取加盟店提供的优惠券。部分店铺还为发表Google评价或关注Instagram的用户提供额外优惠。' },
    { question: '礼宾功能是什么？', answer: '礼宾功能根据您的喜好和条件（氛围、预算、客层等），由AI推荐合适的店铺。可以在店铺列表页面使用。' },
    { question: '如何注册店铺？', answer: '店铺老板可以从屏幕右上角的"店铺登录"按钮访问注册页面。输入必要信息后提交注册申请。' },
    { question: '如果店铺信息有误怎么办？', answer: '请通过联系表单告知相关店铺名称和修正内容。我们将核实后迅速处理。' },
  ],
};

export default function FAQPage() {
  const { t, language } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = faqTranslations[language] || faqTranslations.ja;

  return (
    <div className="min-h-screen" style={{ background: COLORS.luxuryGradient }}>
      {/* Header */}
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
        {/* Title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full"
            style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.borderGold}` }}
          >
            <HelpCircle className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: COLORS.accent }}>FAQ</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: COLORS.text }}>{t('static_pages.faq_title')}</h1>
          <p className="text-base" style={{ color: COLORS.textMuted }}>{t('static_pages.faq_subtitle')}</p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="rounded-xl overflow-hidden"
              style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderSubtle}` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-all"
                style={{ color: COLORS.text }}
              >
                <h3 className="font-semibold text-sm sm:text-base pr-4 leading-relaxed">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-5 h-5" style={{ color: COLORS.accent }} />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5" style={{ borderTop: `1px solid ${COLORS.borderSubtle}` }}>
                      <p className="text-sm leading-relaxed pt-4" style={{ color: COLORS.textMuted }}>{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 p-6 sm:p-8 rounded-2xl text-center"
          style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderGold}` }}
        >
          <MessageCircle className="w-8 h-8 mx-auto mb-3" style={{ color: COLORS.accent }} />
          <h3 className="font-bold text-lg mb-2" style={{ color: COLORS.text }}>{t('static_pages.faq_more_questions')}</h3>
          <p className="text-sm mb-5" style={{ color: COLORS.textMuted }}>{t('static_pages.faq_more_questions_desc')}</p>
          <Link href="/contact">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 rounded-full font-semibold text-sm transition-all"
              style={{ background: COLORS.goldGradient, color: COLORS.background }}
            >
              {t('static_pages.contact')}
            </motion.button>
          </Link>
        </motion.div>
      </motion.main>
    </div>
  );
}
