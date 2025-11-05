'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, accountType, profile, store } = await signIn(email, password);

      if (error) {
        toast.error('ログインに失敗しました', {
          description: 'メールアドレスまたはパスワードが正しくありません。',
        });
        return;
      }

      toast.success('ログインしました', {
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });

      // アカウントタイプによってリダイレクト先を変更
      if (accountType === 'platform') {
        // 運営会社アカウント
        router.push('/store/manage');
      } else if (accountType === 'store') {
        // 店舗アカウント
        router.push(`/store/manage/${store?.id}/update`);
      } else {
        router.push('/map');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景：グラデーション＋装飾（ぼかしなし） */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-[40rem] w-[40rem] rounded-full bg-primary/20 opacity-40" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[40rem] w-[40rem] rounded-full bg-blue-400/20 opacity-30" />
      </div>

      {/* レスポンシブ2カラム：左=ブランド/右=フォーム */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {/* 左：ブランド・ベネフィット（md以上で表示） */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col justify-between rounded-2xl border bg-card/60 p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(1200px_400px_at_20%_-10%,rgba(59,130,246,0.15),transparent)]" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="NIKENME+"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-4xl leading-tight font-bold mb-4">
              2軒目がすぐ見つかる、<br />空席マップ
            </h1>
            <p className="text-muted-foreground text-lg font-semibold">
              『いま入れるバー・スナック』だけを地図で表示。<br />
              ログイン不要、位置情報を許可してマップを開くだけ。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-10">
            {/* ベネフィットカード */}
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="font-semibold">ひと目で空席チェック</p>
              <p className="text-base font-semibold">最寄りのバー・スナックを最短で。</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="font-semibold">経路案内・電話もワンタップ</p>
              <p className="text-base font-semibold">迷わず到着、すぐ確認。</p>
            </div>
          </div>

          <div className="text-base font-semibold mt-4">
            © {new Date().getFullYear()} NIKENME+
          </div>
        </motion.aside>

        {/* 右：ログインフォーム */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center"
        >
          <div className="w-full">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 md:mb-8 flex items-center justify-center md:hidden">
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                  alt="NIKENME+"
                  className="w-24 h-24 object-contain"
                />
              </div>

              <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-lg">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-card-foreground">おかえりなさい</h2>
                  <p className="text-card-foreground text-base font-semibold">
                    店舗アカウントにログインしてください
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-card-foreground font-semibold">
                      メールアドレス
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-card-foreground/60 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 sm:h-12 text-base"
                        style={{ fontSize: '16px' }}
                        aria-label="メールアドレス"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-card-foreground font-semibold">
                      パスワード
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-card-foreground/60 z-10 pointer-events-none" />
                      <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 sm:h-12 text-base"
                        style={{ fontSize: '16px' }}
                        autoComplete="current-password"
                        aria-label="パスワード"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 sm:h-12 text-base mt-4"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ログイン中…
                      </>
                    ) : (
                      'ログイン'
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    <Link 
                      href="/landing" 
                      className="text-primary hover:underline underline-offset-4 font-semibold"
                    >
                      ホーム画面に戻る
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
