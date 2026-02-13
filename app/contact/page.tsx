'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/context';

const COLORS = {
  background: '#0A1628',
  surface: '#162447',
  surfaceLight: '#1F4068',
  accent: '#C9A86C',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
};

const contactTranslations = {
  ja: {
    title: 'お問い合わせ',
    subtitle: 'NIKENME+に関するご質問やご要望をお気軽にお寄せください。',
    name_label: 'お名前',
    name_placeholder: '例：山田 太郎',
    email_label: 'メールアドレス',
    email_placeholder: '例：example@email.com',
    category_label: 'お問い合わせ種別',
    category_general: '一般的なお問い合わせ',
    category_store_info: '店舗情報の修正依頼',
    category_store_register: '加盟店登録について',
    category_bug: '不具合の報告',
    category_feature: '機能のリクエスト',
    category_other: 'その他',
    message_label: 'お問い合わせ内容',
    message_placeholder: 'お問い合わせ内容を入力してください...',
    submit: '送信する',
    sending: '送信中...',
    success_title: '送信完了',
    success_message: 'お問い合わせを受け付けました。内容を確認の上、ご返信いたします。',
    error_title: '送信失敗',
    error_message: '送信に失敗しました。時間をおいて再度お試しください。',
    required: '必須',
    back_to_home: 'ホームに戻る',
    send_another: '別のお問い合わせ',
  },
  en: {
    title: 'Contact Us',
    subtitle: 'Feel free to send us questions or requests about NIKENME+.',
    name_label: 'Name',
    name_placeholder: 'e.g., John Smith',
    email_label: 'Email',
    email_placeholder: 'e.g., example@email.com',
    category_label: 'Category',
    category_general: 'General Inquiry',
    category_store_info: 'Store Information Correction',
    category_store_register: 'Partner Store Registration',
    category_bug: 'Bug Report',
    category_feature: 'Feature Request',
    category_other: 'Other',
    message_label: 'Message',
    message_placeholder: 'Please enter your message...',
    submit: 'Submit',
    sending: 'Sending...',
    success_title: 'Sent Successfully',
    success_message: 'We have received your inquiry. We will review and respond to you.',
    error_title: 'Failed to Send',
    error_message: 'Sending failed. Please try again later.',
    required: 'Required',
    back_to_home: 'Back to Home',
    send_another: 'Send Another',
  },
  ko: {
    title: '문의하기',
    subtitle: 'NIKENME+에 관한 질문이나 요청을 자유롭게 보내주세요.',
    name_label: '이름',
    name_placeholder: '예: 홍길동',
    email_label: '이메일',
    email_placeholder: '예: example@email.com',
    category_label: '문의 유형',
    category_general: '일반 문의',
    category_store_info: '매장 정보 수정 요청',
    category_store_register: '가맹점 등록 관련',
    category_bug: '오류 보고',
    category_feature: '기능 요청',
    category_other: '기타',
    message_label: '문의 내용',
    message_placeholder: '문의 내용을 입력하세요...',
    submit: '전송',
    sending: '전송 중...',
    success_title: '전송 완료',
    success_message: '문의를 접수했습니다. 내용을 확인 후 답변 드리겠습니다.',
    error_title: '전송 실패',
    error_message: '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    required: '필수',
    back_to_home: '홈으로',
    send_another: '다른 문의',
  },
  zh: {
    title: '联系我们',
    subtitle: '请随时向我们发送关于NIKENME+的问题或请求。',
    name_label: '姓名',
    name_placeholder: '例：张三',
    email_label: '电子邮箱',
    email_placeholder: '例：example@email.com',
    category_label: '咨询类别',
    category_general: '一般咨询',
    category_store_info: '店铺信息修正请求',
    category_store_register: '加盟店注册相关',
    category_bug: '错误报告',
    category_feature: '功能请求',
    category_other: '其他',
    message_label: '咨询内容',
    message_placeholder: '请输入您的咨询内容...',
    submit: '提交',
    sending: '发送中...',
    success_title: '发送成功',
    success_message: '我们已收到您的咨询。确认内容后将回复您。',
    error_title: '发送失败',
    error_message: '发送失败。请稍后重试。',
    required: '必填',
    back_to_home: '返回首页',
    send_another: '再次咨询',
  },
};

export default function ContactPage() {
  const { language } = useLanguage();
  const ct = contactTranslations[language] || contactTranslations.ja;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const categories = [
    { value: 'general', label: ct.category_general },
    { value: 'store_info', label: ct.category_store_info },
    { value: 'store_register', label: ct.category_store_register },
    { value: 'bug', label: ct.category_bug },
    { value: 'feature', label: ct.category_feature },
    { value: 'other', label: ct.category_other },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          message: message.trim(),
          language,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('success');
      setName('');
      setEmail('');
      setCategory('general');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.luxuryGradient }}>
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: `${COLORS.background}CC`, borderBottom: `1px solid ${COLORS.borderGold}` }}>
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105" style={{ color: COLORS.accent }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{contactTranslations[language]?.back_to_home || 'Back'}</span>
          </Link>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full"
            style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.borderGold}` }}
          >
            <MessageCircle className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: COLORS.accent }}>Contact</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: COLORS.text }}>{ct.title}</h1>
          <p className="text-base" style={{ color: COLORS.textMuted }}>{ct.subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 rounded-2xl text-center"
              style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderGold}` }}
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${COLORS.accent}20` }}>
                <CheckCircle className="w-8 h-8" style={{ color: COLORS.accent }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>{ct.success_title}</h2>
              <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>{ct.success_message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/landing">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 rounded-full font-semibold text-sm"
                    style={{ background: COLORS.goldGradient, color: COLORS.background }}
                  >
                    {ct.back_to_home}
                  </motion.button>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStatus('idle')}
                  className="px-6 py-3 rounded-full font-semibold text-sm"
                  style={{ border: `1px solid ${COLORS.borderGold}`, color: COLORS.textMuted }}
                >
                  {ct.send_another}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 rounded-2xl space-y-5"
              style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderSubtle}` }}
            >
              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{ct.error_message}</p>
                </motion.div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                  {ct.name_label} <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: `${COLORS.accent}20`, color: COLORS.accent }}>{ct.required}</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ct.name_placeholder}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{ background: `${COLORS.background}80`, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.text, ['--tw-ring-color' as string]: COLORS.accent }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                  {ct.email_label} <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: `${COLORS.accent}20`, color: COLORS.accent }}>{ct.required}</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ct.email_placeholder}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{ background: `${COLORS.background}80`, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.text }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>{ct.category_label}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{ background: `${COLORS.background}80`, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.text }}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                  {ct.message_label} <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: `${COLORS.accent}20`, color: COLORS.accent }}>{ct.required}</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={ct.message_placeholder}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 resize-none"
                  style={{ background: `${COLORS.background}80`, border: `1px solid ${COLORS.borderSubtle}`, color: COLORS.text }}
                />
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={status === 'sending'}
                whileHover={{ scale: status === 'sending' ? 1 : 1.02 }}
                whileTap={{ scale: status === 'sending' ? 1 : 0.98 }}
                className="w-full py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: COLORS.goldGradient, color: COLORS.background }}
              >
                {status === 'sending' ? (
                  <>{ct.sending}</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {ct.submit}
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
