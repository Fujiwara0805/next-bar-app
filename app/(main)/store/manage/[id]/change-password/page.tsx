'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { accountType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
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
      // Supabaseでパスワードを更新
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        
        // エラーメッセージの判定
        if (error.message.includes('same')) {
          toast.error('新しいパスワードは現在のパスワードと異なるものを設定してください');
        } else {
          toast.error(`パスワードの変更に失敗しました: ${error.message}`);
        }
        return;
      }

      toast.success('パスワードを変更しました', {
        description: '次回から新しいパスワードでログインしてください',
      });

      // フォームをクリア
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 3秒後に前の画面に戻る
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">パスワード変更</h1>
            <p className="text-sm text-muted-foreground">
              {accountType === 'store' ? '店舗アカウント' : 'アカウント'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">パスワードを変更</h2>
              <p className="text-sm text-muted-foreground">
                セキュリティのため、定期的にパスワードを変更することをお勧めします
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 現在のパスワード */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  <Lock className="w-4 h-4 inline mr-2" />
                  現在のパスワード <span className="text-red-500">*</span>
                </Label>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="現在のパスワードを入力"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">新しいパスワード</h3>

                {/* 新しいパスワード */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="newPassword">
                    新しいパスワード <span className="text-red-500">*</span>
                  </Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6文字以上"
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    最低6文字、数字と記号を含めることを推奨
                  </p>
                </div>

                {/* パスワード確認 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    新しいパスワード（確認） <span className="text-red-500">*</span>
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="もう一度入力"
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">
                      パスワードが一致しません
                    </p>
                  )}
                  {newPassword && confirmPassword && newPassword === confirmPassword && (
                    <p className="text-xs text-green-600">
                      ✓ パスワードが一致しています
                    </p>
                  )}
                </div>
              </div>

              {/* パスワード強度のヒント */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  💡 パスワードのヒント
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 最低6文字以上</li>
                  <li>• 大文字と小文字を組み合わせる</li>
                  <li>• 数字を含める</li>
                  <li>• 記号（!@#$%など）を含める</li>
                  <li>• 推測されやすい単語は避ける</li>
                </ul>
              </div>

              {/* ボタン */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
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
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

