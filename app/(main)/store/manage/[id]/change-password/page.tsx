'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const router = useRouter();
  const params = useParams();
  const { accountType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!currentPassword) {
      toast.error('現在のパスワードを入力してください', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('新しいパスワードは6文字以上で入力してください', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('新しいパスワードが一致しません', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('新しいパスワードは現在のパスワードと異なるものを設定してください', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
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
          toast.error('新しいパスワードは現在のパスワードと異なるものを設定してください', {
            position: 'top-center',
            duration: 3000,
            className: 'bg-gray-100'
          });
        } else {
          toast.error(`パスワードの変更に失敗しました: ${error.message}`, {
            position: 'top-center',
            duration: 3000,
            className: 'bg-gray-100'
          });
        }
        return;
      }

      toast.success('更新が完了しました', {
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });

      // フォームをクリア
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 店舗管理画面に遷移
      setTimeout(() => {
        router.push(`/store/manage/${params.id}/update`);
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('エラーが発生しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/store/manage/${params.id}/update`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b safe-top">
        <div className="flex items-center justify-center p-4">
          <h1 className="text-xl font-bold">パスワード変更</h1>
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
              <p className="text-sm text-muted-foreground font-bold">
                セキュリティのため、定期的にパスワードを変更することをお勧めします
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 現在のパスワード */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4" />
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
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="font-bold mb-4">新しいパスワード</h3>

                {/* 新しいパスワード */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="newPassword" className="font-bold">
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
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-muted-foreground font-bold">
                    最低6文字、数字と記号を含めることを推奨
                  </p>
                </div>

                {/* パスワード確認 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-bold">
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
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 font-bold">
                      パスワードが一致しません
                    </p>
                  )}
                  {newPassword && confirmPassword && newPassword === confirmPassword && (
                    <p className="text-xs text-green-600 font-bold">
                      ✓ パスワードが一致しています
                    </p>
                  )}
                </div>
              </div>

              {/* ボタン */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 font-bold bg-gray-100"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-bold"
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      更新中...
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

