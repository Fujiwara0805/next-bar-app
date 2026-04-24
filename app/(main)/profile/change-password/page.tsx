'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, Save, ShieldCheck, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

export default function ProfileChangePasswordPage() {
  const router = useRouter();
  const { accountType } = useAuth();
  const { colorsB: COLORS } = useAppMode();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (accountType !== 'platform') {
      router.push('/login');
    }
  }, [accountType, router]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('現在のパスワードを入力してください');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('新しいパスワードは6文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('新しいパスワードは現在のパスワードと異なるものを設定してください');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error('Password update error:', error);
        if (error.message.includes('same')) {
          toast.error('新しいパスワードは現在のパスワードと異なるものを設定してください');
        } else {
          toast.error(`パスワードの変更に失敗しました: ${error.message}`);
        }
        return;
      }

      toast.success('パスワードを変更しました', {
        description: '次回から新しいパスワードでログインしてください',
        position: 'top-center',
        duration: 1500,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-10 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid ${COLORS.champagneGold}33`,
        }}
      >
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: COLORS.ivory }}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: COLORS.ivory }}>
            パスワード変更
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#ffffff',
              border: `1px solid ${COLORS.champagneGold}33`,
              boxShadow: '0 18px 48px rgba(19, 41, 75, 0.10), 0 4px 12px rgba(19, 41, 75, 0.06)',
            }}
          >
            <div className="h-1" style={{ background: COLORS.goldGradient }} />
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    background: `${COLORS.champagneGold}20`,
                    border: `1px solid ${COLORS.champagneGold}50`,
                  }}
                >
                  <ShieldCheck className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                    パスワードを変更
                  </h2>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: COLORS.warmGray }}>
                    運営会社アカウント用。セキュリティのため定期的に変更してください。
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="currentPassword"
                    className="text-xs font-semibold flex items-center gap-1.5"
                    style={{ color: COLORS.deepNavy }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    現在のパスワード <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                      style={{ color: COLORS.champagneGold }}
                    />
                    <PasswordInput
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="現在のパスワードを入力"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                      style={{ fontSize: '16px', color: COLORS.deepNavy }}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t" style={{ borderColor: `${COLORS.champagneGold}30` }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: COLORS.deepNavy }}>
                    新しいパスワード
                  </h3>

                  <div className="space-y-1.5 mb-5">
                    <Label
                      htmlFor="newPassword"
                      className="text-xs font-semibold"
                      style={{ color: COLORS.deepNavy }}
                    >
                      新しいパスワード <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                        style={{ color: COLORS.champagneGold }}
                      />
                      <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="6文字以上"
                        required
                        minLength={6}
                        disabled={loading}
                        autoComplete="new-password"
                        className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                        style={{ fontSize: '16px', color: COLORS.deepNavy }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: COLORS.warmGray }}>
                      最低6文字、数字と記号を含めることを推奨
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-xs font-semibold"
                      style={{ color: COLORS.deepNavy }}
                    >
                      新しいパスワード（確認） <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                        style={{ color: COLORS.champagneGold }}
                      />
                      <PasswordInput
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="もう一度入力"
                        required
                        minLength={6}
                        disabled={loading}
                        autoComplete="new-password"
                        className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                        style={{ fontSize: '16px', color: COLORS.deepNavy }}
                      />
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs font-semibold text-destructive">パスワードが一致しません</p>
                    )}
                    {newPassword && confirmPassword && newPassword === confirmPassword && (
                      <p className="text-xs font-semibold text-success">✓ パスワードが一致しています</p>
                    )}
                  </div>
                </div>

                <div
                  className="p-4 rounded-xl flex gap-3"
                  style={{
                    background: `${COLORS.champagneGold}12`,
                    border: `1px solid ${COLORS.champagneGold}40`,
                  }}
                >
                  <Lightbulb
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    style={{ color: COLORS.champagneGold }}
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: COLORS.deepNavy }}>
                      パスワードのヒント
                    </p>
                    <ul className="text-[11px] space-y-0.5" style={{ color: COLORS.warmGray }}>
                      <li>• 最低6文字以上</li>
                      <li>• 大文字と小文字を組み合わせる</li>
                      <li>• 数字を含める</li>
                      <li>• 記号（!@#$%など）を含める</li>
                      <li>• 推測されやすい単語は避ける</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 font-semibold rounded-xl"
                    style={{
                      background: '#ffffff',
                      color: COLORS.deepNavy,
                      border: `1.5px solid ${COLORS.champagneGold}60`,
                    }}
                    onClick={() => router.push('/profile')}
                    disabled={loading}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 font-bold rounded-xl shadow-lg"
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 6px 24px rgba(201, 168, 108, 0.35)',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        変更中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        パスワードを変更
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
