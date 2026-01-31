/**
 * ============================================
 * ファイルパス: app/(ad)/ad-lp/page.tsx
 * 
 * 機能: SNS広告流入専用ランディングページ
 *       - ディープネイビー × シャンパンゴールドの高級感
 *       - 飲食店オーナー向け加盟店登録促進
 *       - 既存LP準拠の最高級デザイン
 *       - レスポンシブ対応
 * ============================================
 */

'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Beer,
  Check,
  ChevronDown,
  Globe,
  Heart,
  Instagram,
  MapPin,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================
// 統一カラーパレット（既存LP準拠）
// ============================================
const colors = {
  // ベースカラー（60%）- 背景・余白
  background: '#0A1628',        // Deep Navy
  surface: '#162447',           // Midnight Blue
  surfaceLight: '#1F4068',      // Royal Navy
  cardBackground: '#FDFBF7',    // Ivory
  
  // メインカラー（30%）- 装飾・セクション
  primary: '#1F4068',           // Royal Navy
  charcoal: '#2D3436',
  warmGray: '#636E72',
  
  // アクセントカラー（10%）- CTA・重要要素
  accent: '#C9A86C',            // Champagne Gold
  accentLight: '#E8D5B7',       // Pale Gold
  accentDark: '#B8956E',        // Antique Gold
  
  // テキストカラー
  text: '#FDFBF7',              // Ivory
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
  
  // ボーダー・シャドウ
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
  shadowGold: '0 8px 30px rgba(201, 168, 108, 0.4)',
  shadowDeep: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

// ============================================
// 外部リンク定義
// ============================================
const LINKS = {
  googleForm: 'https://docs.google.com/forms/d/e/1FAIpQLSceOuH6VBiSjYhJuly0SI6bZDaQrqxJ15vpMxGxT-CAXS2I4Q/viewform',
  instagram: 'https://instagram.com/nikenme_nobody',
};

// ============================================
// アセット（ad-lp専用：明るく温かみのある画像でLPと差別化）
// ============================================
const ASSETS = {
  logo: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
  // 温かみのあるバー・カウンター照明（Unsplash）
  heroBackground: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1920&q=80',
  // OUR VISION カード画像
  visionCard1: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769856687/Gemini_Generated_Image_akgwg8akgwg8akgw_qvtshv.png',
  visionCard2: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769846555/Gemini_Generated_Image_zf386wzf386wzf38_gx0w2z.png',
  visionCard3: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769846555/Gemini_Generated_Image_cna9bocna9bocna9_tjgx9a.png',
  // HOW IT WORKS カード画像
  howItWorks1: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769847283/Gemini_Generated_Image_bb2iplbb2iplbb2i_pzcvnj.png',
  howItWorks2: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769846555/Gemini_Generated_Image_73dbk173dbk173db_sv3wdi.png',
  howItWorks3: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769846555/Gemini_Generated_Image_numtmcnumtmcnumt_dwbl0y.png',
  howItWorks4: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1769846554/Gemini_Generated_Image_uagpjpuagpjpuagp_cjfjwb.png',
};

// ============================================
// 共通コンポーネント
// ============================================

/** ゴールド装飾ディバイダー（既存LP準拠） */
const GoldDivider = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center justify-center gap-3 my-6 ${className}`}>
    <div 
      className="h-px flex-1 max-w-16" 
      style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40)` }} 
    />
    <div 
      className="w-1.5 h-1.5 rotate-45" 
      style={{ backgroundColor: colors.accent }} 
    />
    <div 
      className="h-px flex-1 max-w-16" 
      style={{ background: `linear-gradient(90deg, ${colors.accent}40, transparent)` }} 
    />
  </div>
);

/** セクションタイトル */
const SectionTitle = ({ 
  tag, 
  title, 
  subtitle,
}: { 
  tag: string; 
  title: React.ReactNode; 
  subtitle?: string;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    whileInView={{ opacity: 1, y: 0 }} 
    viewport={{ once: true }}
    className="text-center mb-12 md:mb-16"
  >
    <GoldDivider />
    <span 
      className="block text-xs font-medium tracking-[0.3em] uppercase mb-4"
      style={{ color: colors.accent }}
    >
      {tag}
    </span>
    <h2 
      className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
      style={{ color: colors.text }}
    >
      {title}
    </h2>
    {subtitle && (
      <p 
        className="text-base sm:text-lg max-w-xl mx-auto"
        style={{ color: colors.textMuted }}
      >
        {subtitle}
      </p>
    )}
  </motion.div>
);

/** CTAボタン（シマーエフェクト付き） */
const CTAButton = ({ 
  children, 
  size = 'default',
  className = '',
}: { 
  children: React.ReactNode;
  size?: 'default' | 'large';
  className?: string;
}) => (
  <motion.a
    href={LINKS.googleForm}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ scale: 1.03, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className={`
      inline-flex items-center gap-2 font-semibold rounded-full relative overflow-hidden group
      ${size === 'large' ? 'px-8 sm:px-12 py-5 sm:py-7 text-base sm:text-xl' : 'px-6 sm:px-10 py-4 sm:py-6 text-sm sm:text-lg'}
      ${className}
    `}
    style={{
      background: colors.goldGradient,
      color: colors.background,
      boxShadow: colors.shadowGold,
    }}
  >
    <span className="relative z-10 flex items-center gap-2">{children}</span>
    <motion.div 
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} 
      animate={{ x: ['-100%', '200%'] }} 
      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} 
    />
  </motion.a>
);

/** フェードインセクション */
const FadeInSection = ({ 
  children, 
  className = '',
  delay = 0,
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, ease: 'easeOut', delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/** 改行レンダリング */
const renderWithLineBreaks = (text: string) => {
  return text.split('\n').map((line, index, array) => (
    <span key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </span>
  ));
};

// ============================================
// メインコンポーネント
// ============================================
export default function AdLandingPage() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.05]);

  // 3つの柱データ
  const pillars = [
    {
      icon: BarChart3,
      num: '01',
      title: '「なんとなく」の経営から\n「データで勝つ」経営へ',
      titleEn: 'Data-Driven Growth',
      desc: 'クーポン利用データで「新規 or リピーター」「県内 or 県外」を自動分析。勘や経験だけに頼らない、数字に基づく次の一手が見えてきます。',
    },
    {
      icon: TrendingUp,
      num: '02',
      title: '検索されるお店になる。\n選ばれるお店になる。',
      titleEn: 'Digital Presence',
      desc: 'Googleマップの口コミ促進、Instagramフォロワー獲得を自然にサポート。「大分 飲食店」で検索されたとき、あなたのお店が上位に表示される未来へ。',
    },
    {
      icon: Users,
      num: '03',
      title: '一店舗では難しいことも、\nエリア全体なら実現できる',
      titleEn: 'Regional Synergy',
      desc: '地域イベントの受け皿として、エリア全体でお客様を回遊。広告費を抑えながら、周辺店舗と共に繁盛する「共存共栄」の仕組みを提供します。',
    },
  ];

  // 導入ステップデータ（画像URL付き）
  const steps = [
    {
      num: '01',
      image: ASSETS.howItWorks1,
      title: 'たった3分で申し込み完了',
      titleEn: 'Quick Start',
      desc: '「加盟店募集」ボタンからフォーム入力するだけ。提供いただいた情報をもとにGoogleマップ情報の最新化もお手伝いします。登録完了後、IDとPW発行をお渡しします。※パスワードは変更できます。',
    },
    {
      num: '02',
      image: ASSETS.howItWorks3,
      title: '空席状況の更新はワンタップで完結',
      titleEn: 'Zero Burden',
      desc: '営業時間はGoogleマップと自動同期。店内の状況に合わせて「空席あり」「満席」をポチッと切り替られる。忙しい時は、無理に更新しなくても大丈夫。あなたのペースで使い続けられます。',
    },
    {
      num: '03',
      image: ASSETS.howItWorks2,
      title: '席のキープ予約にも対応',
      titleEn: 'Your Digital Home',
      desc: '自動音声からの席のキープ予約もキーパット操作で数秒で完結。これまでのお客様からの電話連絡にかかっていた時間を削減できます。',
    },
    {
      num: '04',
      image: ASSETS.howItWorks4,
      title: 'クーポンが、最強の武器になる',
      titleEn: 'Smart Coupon',
      desc: '日常使いのクーポン券から、地域イベント限定の特別クーポンまで自由自在。誰がいつ使ったか、すべてデータ化。次の集客施策が自然と見えてきます。',
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: colors.background }}>
      {/* ========================================
          背景装飾エフェクト
      ======================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute w-[700px] h-[700px] rounded-full" 
          style={{ 
            background: `radial-gradient(circle, ${colors.accent}10 0%, transparent 60%)`, 
            top: '-250px', 
            right: '-250px', 
            filter: 'blur(80px)' 
          }} 
          animate={{ opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} 
        />
        <motion.div 
          className="absolute w-[500px] h-[500px] rounded-full" 
          style={{ 
            background: `radial-gradient(circle, ${colors.surfaceLight}20 0%, transparent 60%)`, 
            bottom: '10%', 
            left: '-150px', 
            filter: 'blur(60px)' 
          }} 
          animate={{ opacity: [0.2, 0.35, 0.2] }} 
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }} 
        />
      </div>

      {/* ========================================
          ヒーローセクション
      ======================================== */}
      <section className="relative min-h-screen flex items-center justify-center pt-8 pb-20 px-4 overflow-hidden">
        {/* 背景画像 + 明るめオーバーレイ（ad-lpの温かみを活かす） */}
        <motion.div 
          className="absolute inset-0 z-0" 
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ 
              backgroundImage: `url('${ASSETS.heroBackground}')`, 
              opacity: 0.4 
            }} 
          />
          <div 
            className="absolute inset-0" 
            style={{ 
              background: `radial-gradient(ellipse at 50% 40%, rgba(253,251,247,0.12) 0%, transparent 50%), radial-gradient(ellipse at center bottom, ${colors.background}EE 0%, ${colors.background} 70%)` 
            }} 
          />
          <div 
            className="absolute inset-0" 
            style={{ 
              background: `linear-gradient(to bottom, ${colors.background}40 0%, ${colors.background}90 50%, ${colors.background} 100%)` 
            }} 
          />
        </motion.div>

        {/* 浮遊パーティクル */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div 
              key={i} 
              className="absolute w-1 h-1 rounded-full" 
              style={{ 
                left: `${10 + (i * 12) % 80}%`, 
                top: `${20 + (i * 11) % 60}%`, 
                background: colors.accent, 
                boxShadow: `0 0 15px ${colors.accent}80` 
              }} 
              animate={{ opacity: [0.2, 0.6, 0.2], y: [0, -15, 0] }} 
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.6 }} 
            />
          ))}
        </div>

        {/* コンテンツ */}
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }} 
            className="text-center"
          >
            {/* ロゴ */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.6 }} 
              className="flex justify-center mb-6 sm:mb-8"
            >
              <div className="relative">
                <motion.div 
                  className="absolute inset-0 -m-8" 
                  animate={{ opacity: [0.3, 0.6, 0.3] }} 
                  transition={{ duration: 4, repeat: Infinity }} 
                  style={{ 
                    background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`, 
                    filter: 'blur(40px)' 
                  }} 
                />
                <img 
                  src={ASSETS.logo} 
                  alt="NIKENME+" 
                  className="relative h-24 sm:h-28 md:h-36 w-auto object-contain" 
                  style={{ filter: `drop-shadow(0 0 30px ${colors.accent}60)` }} 
                />
              </div>
            </motion.div>

            {/* サブタイトルバッジ */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.3 }} 
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full" 
              style={{ 
                background: `${colors.accent}10`, 
                border: `1px solid ${colors.borderGold}` 
              }}
            >
              <motion.div 
                animate={{ opacity: [1, 0.5, 1] }} 
                transition={{ duration: 2, repeat: Infinity }} 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ background: colors.accent }} 
              />
              <span 
                className="text-[10px] font-medium tracking-[0.25em] uppercase" 
                style={{ color: colors.accent }}
              >
                大分県の飲食店オーナー様へ
              </span>
            </motion.div>

            {/* メインコピー */}
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight px-2"
              style={{ color: colors.text }}
            >
              10年後、あなたのお店は
              <br />
              <span
                style={{
                  background: colors.goldGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                誰かの「帰る場所」
              </span>
              <br className="sm:hidden" />
              になっていますか。
            </h1>

            {/* サブコピー */}
            <p 
              className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6"
              style={{ color: colors.textMuted }}
            >
              集客も、ファン作りも、データ分析も。
              <br />
              <span style={{ color: colors.accent, fontWeight: 'bold' }}>今だけ全て無料</span>で、今日から始められます。
            </p>
            <p 
              className="text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4"
              style={{ color: colors.textMuted }}
            >
              NIKENME+は、大分県内の飲食店と
              <br className="sm:hidden" />
              お客様をつなぐ新しいプラットフォーム。
              <br />
              あなたの店を、もっと多くの人に届けます。
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
              <CTAButton size="large">
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>無料で加盟店登録する</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </CTAButton>
            </div>
            <p 
              className="text-xs sm:text-sm mt-4"
              style={{ color: colors.textSubtle }}
            >
              初期費用0円 ｜ 最短即日スタート ｜ いつでも解約OK
            </p>

            {/* スクロールインジケーター */}
            <motion.div 
              className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span 
                className="text-[10px] tracking-wider"
                style={{ color: `${colors.accent}99` }}
              >
                SCROLL
              </span>
              <ChevronDown 
                className="w-5 h-5"
                style={{ color: `${colors.accent}99` }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* セクション下部のゴールドライン */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-px" 
          style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}60, transparent)` }} 
          initial={{ scaleX: 0 }} 
          whileInView={{ scaleX: 1 }} 
          viewport={{ once: true }} 
          transition={{ duration: 1.5, ease: 'easeOut' }} 
        />
      </section>

      {/* ========================================
          ビジョンセクション（明るい背景でLPと差別化）
      ======================================== */}
      <section 
        className="relative py-16 sm:py-20 md:py-32 px-4 overflow-hidden"
        style={{ background: colors.cardGradient }}
      >
        <div className="container mx-auto max-w-4xl">
          <SectionTitle 
            tag="OUR VISION" 
            title={<span style={{ color: colors.background }}>なぜ、私たちが<br className="sm:hidden" />このサービスを作ったのか</span>}
          />
          
          {/* メインストーリー（画像付きカード） */}
          <FadeInSection delay={0.1}>
            <Card 
              className="p-0 rounded-2xl mb-6 relative overflow-hidden"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid ${colors.borderGold}`,
                boxShadow: `0 8px 32px ${colors.accent}15`,
              }}
            >
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden">
                <img
                  src={ASSETS.visionCard1}
                  alt="久しぶりに帰った街で、あの店の灯りがまだ灯っていた"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10 p-6 sm:p-8 md:p-12">
                <div className="flex items-start justify-between gap-3 sm:gap-4 mb-6">
                  <h3 
                    className="text-lg sm:text-xl md:text-2xl font-bold leading-tight flex-1"
                    style={{ color: colors.background }}
                  >
                    「おかえり」と言ってくれる場所を、
                    <br className="hidden sm:block" />
                    この街に残し続けたい。
                  </h3>
                </div>
                <div 
                  className="space-y-4 leading-relaxed text-sm sm:text-base"
                  style={{ color: colors.warmGray }}
                >
                  <p>
                  久しぶりに大分に帰ってきた夜。
                    <br />
                    学生時代に通ったあのお店のドアを開けたら、マスターが「おかえり」と笑ってくれた——
                  </p>
                  <p>
                    そんな瞬間が、5年後も、10年後も、20年後もあり続けてほしい。
                    でも現実は、毎年たくさんの店が静かに灯りを消しています。
                  </p>
                  <p style={{ color: colors.charcoal, fontWeight: '600' }}>
                    だから私たちは、大分の飲食店を本気で支えるサービスを作りました。
                  </p>
                </div>
              </div>
            </Card>
          </FadeInSection>
          
          {/* サブカード（画像付き） */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <FadeInSection delay={0.2}>
              <Card 
                className="p-0 rounded-2xl h-full group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden"
                style={{ 
                  background: '#FFFFFF',
                  border: `1px solid ${colors.borderGold}`,
                  boxShadow: `0 4px 20px ${colors.accent}12`,
                }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={ASSETS.visionCard2}
                    alt="大分の夜を、日本中に届ける"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 sm:p-6 md:p-8">
                  <h4 
                    className="font-bold mb-2 text-base sm:text-lg"
                    style={{ color: colors.background }}
                  >
                    大分の夜を、日本中・世界中に届ける
                  </h4>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: colors.warmGray }}
                  >
                    県外からの観光客、増え続けるインバウンド。その需要を、大手チェーンではなく、地域の個店へ届けたい。あなたの店が、旅の思い出になる未来へ。
                  </p>
                </div>
              </Card>
            </FadeInSection>
            
            <FadeInSection delay={0.3}>
              <Card 
                className="p-0 rounded-2xl h-full group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden"
                style={{ 
                  background: '#FFFFFF',
                  border: `1px solid ${colors.borderGold}`,
                  boxShadow: `0 4px 20px ${colors.accent}12`,
                }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={ASSETS.visionCard3}
                    alt="一軒の灯りが、街の文化を作る"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 sm:p-6 md:p-8">
                  <h4 
                    className="font-bold mb-2 text-base sm:text-lg"
                    style={{ color: colors.background }}
                  >
                    一軒の灯りが、街の文化を作る
                  </h4>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: colors.warmGray }}
                  >
                    あなたの店は、誰かにとって特別な場所。一軒一軒の個店が元気であることが、大分の街全体の魅力になる。私たちは、その灯りを絶やさない仕組みを作ります。
                  </p>
                </div>
              </Card>
            </FadeInSection>
          </div>
        </div>

        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-px" 
          style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} 
        />
      </section>

      {/* ========================================
          3つの柱セクション
      ======================================== */}
      <section 
        className="relative py-16 sm:py-20 md:py-32 px-4 overflow-hidden"
        style={{ background: colors.background }}
      >
        <div className="container mx-auto max-w-5xl">
          <SectionTitle 
            tag="THREE PILLARS" 
            title={<>NIKENME+が、<br className="sm:hidden" />あなたのお店にできること</>}
            subtitle="集客・ファン作り・データ分析を実現します"
          />
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <FadeInSection key={index} delay={index * 0.1}>
                  <Card 
                    className="h-full p-6 sm:p-8 group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden"
                    style={{ 
                      background: `${colors.surface}80`,
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${colors.borderGold}`,
                    }}
                  >
                    {/* アイコンを右上に配置（LPと差別化） */}
                    <motion.div 
                      className="absolute top-4 right-4 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: colors.goldGradient,
                        boxShadow: `0 4px 12px ${colors.accent}40`,
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Icon 
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        style={{ color: colors.background }}
                      />
                    </motion.div>
                    <motion.div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                      style={{ 
                        background: `radial-gradient(circle at top right, ${colors.accent}12 0%, transparent 70%)` 
                      }} 
                    />
                    <div className="relative z-10 pr-14 sm:pr-16">
                      <span 
                        className="text-xs font-bold tracking-wider"
                        style={{ color: colors.accent }}
                      >
                        PILLAR {pillar.num}
                      </span>
                      <h3 
                        className="font-bold text-lg sm:text-xl mt-2 mb-1"
                        style={{ color: colors.text }}
                      >
                        {renderWithLineBreaks(pillar.title)}
                      </h3>
                      <p 
                        className="text-[10px] uppercase tracking-wider mb-3 sm:mb-4 font-medium" 
                        style={{ color: colors.accentDark }}
                      >
                        {pillar.titleEn}
                      </p>
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ color: colors.textMuted }}
                      >
                        {pillar.desc}
                      </p>
                    </div>
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5" 
                      style={{ background: colors.goldGradient }} 
                      initial={{ scaleX: 0 }} 
                      whileHover={{ scaleX: 1 }} 
                      transition={{ duration: 0.3 }} 
                    />
                  </Card>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================
          導入の流れセクション（明るい背景・アイコン右側）
      ======================================== */}
      <section 
        className="relative py-16 sm:py-20 md:py-32 px-4 overflow-hidden"
        style={{ background: colors.cardGradient }}
      >
        <div className="container mx-auto max-w-5xl">
          <SectionTitle 
            tag="HOW IT WORKS" 
            title={<span style={{ color: colors.background }}>驚くほどカンタン。<br className="sm:hidden" />だから続けられる。</span>}
          />
          <p 
            className="text-center text-base sm:text-lg max-w-xl mx-auto mb-12 sm:mb-16 -mt-6"
            style={{ color: colors.warmGray }}
          >
            「ITは苦手」という方も大丈夫。
            <br />
            忙しい営業中でも、負担になりません。
          </p>
          
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <FadeInSection key={index} delay={index * 0.1}>
                <Card 
                  className="h-full p-0 relative overflow-hidden"
                  style={{ 
                    background: '#FFFFFF',
                    border: `1px solid ${colors.borderGold}`,
                    boxShadow: `0 4px 20px ${colors.accent}10`,
                  }}
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover"
                    />
                    <span 
                      className="absolute top-3 right-3 text-xl sm:text-2xl font-bold px-2.5 py-1 rounded-lg"
                      style={{ 
                        color: colors.background,
                        background: colors.accentLight,
                        boxShadow: `0 2px 8px ${colors.accent}30`,
                      }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <div className="p-6 sm:p-8">
                    <h3 
                      className="text-lg sm:text-xl font-bold mb-2"
                      style={{ color: colors.background }}
                    >
                      {step.title}
                    </h3>
                    <p 
                      className="text-[10px] uppercase tracking-wider mb-3 sm:mb-4 font-medium" 
                      style={{ color: colors.accentDark }}
                    >
                      {step.titleEn}
                    </p>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: colors.warmGray }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </Card>
              </FadeInSection>
            ))}
          </div>
        </div>

        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-px" 
          style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} 
        />
      </section>

      {/* ========================================
          料金セクション（明るい背景でad-lpの明るさを維持）
      ======================================== */}
      <section 
        className="relative py-16 sm:py-20 md:py-32 px-4 overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${colors.surface} 0%, ${colors.background} 100%)` }}
      >
        <div className="container mx-auto max-w-4xl">
          <SectionTitle 
            tag="PRICING" 
            title="料金体系"
            subtitle="今なら、すべての機能が完全無料"
          />
          
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {/* 無料プラン */}
            <FadeInSection delay={0.1}>
              <div className="relative rounded-2xl overflow-hidden h-full">
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: colors.goldGradient }}
                />
                <div 
                  className="p-6 sm:p-8 h-full"
                  style={{ 
                    background: `linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, rgba(232, 213, 183, 0.1) 100%)`,
                    border: `2px solid ${colors.accent}`,
                    borderRadius: '1rem',
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Badge 
                      className="font-bold text-xs px-3 py-1"
                      style={{ 
                        background: colors.goldGradient,
                        color: colors.background,
                      }}
                    >
                      期間限定
                    </Badge>
                    <span 
                      className="text-xs font-bold"
                      style={{ color: colors.accent }}
                    >
                      全機能開放中
                    </span>
                  </div>
                  <h3 
                    className="font-bold text-xl sm:text-2xl mb-2"
                    style={{ color: colors.text }}
                  >
                    STARTプラン
                  </h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span 
                      className="text-4xl sm:text-5xl font-bold"
                      style={{ color: colors.text }}
                    >
                      ¥0
                    </span>
                    <span 
                      className="text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      /月
                    </span>
                  </div>
                  <ul className="space-y-3 mb-6 sm:mb-8">
                    {[
                      '店舗専用ページの作成・公開',
                      '空席状況のリアルタイム更新',
                      'クーポン発行（無制限）',
                      '顧客データの取得・分析',
                      'Googleマップ自動同期',
                    ].map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <Check 
                          className="w-5 h-5 shrink-0 mt-0.5"
                          style={{ color: colors.accent }}
                        />
                        <span style={{ color: colors.text }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.div 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      asChild
                      className="w-full rounded-full font-bold py-5 sm:py-6 text-base"
                      style={{
                        background: colors.goldGradient,
                        color: colors.background,
                      }}
                    >
                      <a href={LINKS.googleForm} target="_blank" rel="noopener noreferrer">
                        今すぐ無料で始める
                      </a>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </FadeInSection>
            
            {/* 将来の有料プラン */}
            <FadeInSection delay={0.2}>
              <div 
                className="rounded-2xl p-6 sm:p-8 h-full"
                style={{ 
                  background: `${colors.surface}60`,
                  border: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Badge 
                    className="font-bold text-xs px-3 py-1"
                    style={{ 
                      background: `${colors.surface}`,
                      color: colors.textMuted,
                      border: `1px solid ${colors.borderSubtle}`,
                    }}
                  >
                    将来予定
                  </Badge>
                </div>
                <h3 
                  className="font-bold text-xl sm:text-2xl mb-2"
                  style={{ color: colors.text }}
                >
                  PROプラン
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span 
                    className="text-2xl sm:text-3xl font-bold"
                    style={{ color: colors.textMuted }}
                  >
                    ¥1,000
                  </span>
                  <span 
                    className="text-sm"
                    style={{ color: colors.textSubtle }}
                  >
                    /月（税込¥1,100）予定
                  </span>
                </div>
                <p 
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: colors.textMuted }}
                >
                  将来的には月額1,000円程度の有料プランを検討中。
                  <br />
                  <span 
                    className="font-bold"
                    style={{ color: colors.accent }}
                  >
                    今なら全機能が無料
                  </span>
                  で使えるこのタイミングで、ぜひお試しください。
                </p>
                <ul className="space-y-3">
                  {[
                    '地域イベントとの連携',
                    '優先カスタマーサポート  など',
                  ].map((feature, index) => (
                    <li 
                      key={index} 
                      className="flex items-start gap-3 text-sm"
                      style={{ color: colors.textMuted }}
                    >
                      <Sparkles 
                        className="w-5 h-5 shrink-0 mt-0.5"
                        style={{ color: colors.textSubtle }}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInSection>
          </div>
          
          <FadeInSection delay={0.3}>
            <p 
              className="text-center text-xs sm:text-sm mt-6 sm:mt-8 px-4"
              style={{ color: colors.textSubtle }}
            >
              ※ 有料プラン開始時期は未定です。今ご登録いただいた店舗様には、移行時にご案内予定です。
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ========================================
          最終CTAセクション
      ======================================== */}
      <section 
        className="relative py-20 sm:py-24 md:py-32 px-4 overflow-hidden"
        style={{ background: colors.surface }}
      >
        {/* 装飾 */}
        <div 
          className="absolute inset-0 z-0" 
          style={{ 
            background: `radial-gradient(ellipse at center, ${colors.accent}15 0%, transparent 50%)` 
          }} 
        />
        <div 
          className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl"
          style={{ backgroundColor: `${colors.accent}08` }}
        />
        <div 
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: `${colors.accent}08` }}
        />
        
        <div className="container mx-auto max-w-3xl relative z-10 text-center">
          <FadeInSection>
            <GoldDivider className="mb-8" />
            
            <h2 
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 leading-tight px-2"
              style={{ color: colors.text }}
            >
              あなたのお店の灯りが、
              <br />
              <span
                style={{
                  background: colors.goldGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                誰かの人生を照らしている。
              </span>
            </h2>
            
            <p 
              className="text-sm sm:text-base md:text-lg mb-8 sm:mb-10 leading-relaxed px-4"
              style={{ color: colors.textMuted }}
            >
              5年後も、10年後も、20年後も。
              <br />
              「あのお店、まだあるかな」と<br className="sm:hidden" />思われる存在であり続けるために。
              <br />
              <span style={{ color: colors.text, fontWeight: '600' }}>
                私たちと一緒に、大分の夜を守りませんか。
              </span>
            </p>
            
            <CTAButton size="large">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>無料で加盟店登録する</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </CTAButton>
            
            <p 
              className="text-xs sm:text-sm mt-6"
              style={{ color: colors.textSubtle }}
            >
              ご不明点・ご質問は Instagram{' '}
              <a 
                href={LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline transition-colors"
                style={{ color: colors.accent }}
              >
                @nikenme_nobody
              </a>
              {' '}へお気軽にどうぞ
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ========================================
          フッター
      ======================================== */}
      <footer 
        className="py-10 sm:py-12 px-4"
        style={{ 
          background: colors.background,
          borderTop: `1px solid ${colors.borderGold}`,
        }}
      >
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img 
              src={ASSETS.logo} 
              alt="NIKENME+" 
              className="h-10 sm:h-12 w-auto object-contain opacity-70" 
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
            <a 
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors hover:opacity-80 px-4 py-2 rounded-full"
              style={{ 
                color: colors.textMuted,
                background: `${colors.surface}60`,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <Instagram className="w-5 h-5" style={{ color: colors.accent }} />
              <span>@nikenme_nobody</span>
            </a>
          </div>
          
          <div 
            className="h-px my-6 sm:my-8"
            style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}30, transparent)` }}
          />
          
          <div className="text-center">
            <p 
              className="text-xs sm:text-sm mb-2"
              style={{ color: colors.textSubtle }}
            >
              © 2025 NIKENME+ All rights reserved.
            </p>
            <p 
              className="text-base sm:text-lg font-bold"
              style={{ color: colors.accent }}
            >
              大分の夜を、もっと面白く。
            </p>
          </div>
        </div>
      </footer>

      {/* 画面右下：通常LPへ（使ってみる） */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3 items-end safe-bottom">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              asChild
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg"
              style={{
                background: 'rgba(5,5,5,0.7)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${colors.borderGold}`,
                boxShadow: '0 0 20px rgba(201,168,108,0.2)',
                minWidth: '56px',
                minHeight: '56px',
              }}
              title="使ってみる"
            >
              <Link href="/landing" className="flex flex-col items-center justify-center gap-1">
                <Beer className="w-5 h-5" style={{ color: colors.accent }} />
                <span className="text-[10px] font-bold" style={{ color: colors.accent }}>
                  使ってみる
                </span>
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* ========================================
          フローティングCTAボタン（モバイル）
      ======================================== */}
      {/* <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden safe-bottom">
        <div 
          className="p-4"
          style={{ 
            background: `linear-gradient(to top, ${colors.background} 0%, ${colors.background}E6 50%, transparent 100%)`,
          }}
        >
          <motion.a
            href={LINKS.googleForm}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-bold text-base"
            style={{
              background: colors.goldGradient,
              color: colors.background,
              boxShadow: colors.shadowGold,
            }}
          >
            <Store className="w-5 h-5" />
            <span>無料で加盟店登録する</span>
            <ArrowRight className="w-4 h-4" />
          </motion.a>
        </div>
      </div> */}
    </div>
  );
}