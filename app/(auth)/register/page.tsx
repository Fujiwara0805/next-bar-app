'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Mail, Lock, User, Building, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // バリデーション
      if (!displayName.trim()) {
        const error = '表示名を入力してください';
        setErrorMessage(error);
        toast.error(error);
        setLoading(false);
        return;
      }

      if (!email.trim()) {
        const error = 'メールアドレスを入力してください';
        setErrorMessage(error);
        toast.error(error);
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        const error = 'パスワードは6文字以上である必要があります';
        setErrorMessage(error);
        toast.error(error);
        setLoading(false);
        return;
      }

      console.log('Attempting to sign up:', { email, displayName });

      const { error } = await signUp(email, password, displayName);

      if (error) {
        console.error('Sign up error:', error);
        
        let errorMsg = '登録に失敗しました';
        
        // エラーメッセージの詳細化
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMsg = 'このメールアドレスは既に登録されています';
        } else if (error.message.includes('invalid email')) {
          errorMsg = 'メールアドレスの形式が正しくありません';
        } else if (error.message.includes('weak password')) {
          errorMsg = 'パスワードが弱すぎます。より強力なパスワードを設定してください';
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        setErrorMessage(errorMsg);
        toast.error('登録に失敗しました', {
          description: errorMsg,
        });
        return;
      }

      console.log('Sign up successful');
      toast.success('アカウントを作成しました', {
        description: '店舗情報を登録できます',
      });
      
      // 成功後、店舗管理画面または店舗登録画面へ
      router.push('/store/manage');
    } catch (error) {
      console.error('Unexpected error:', error);
      const errorMsg = error instanceof Error ? error.message : 'エラーが発生しました';
      setErrorMessage(errorMsg);
      toast.error('エラーが発生しました', {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 safe-top"
      >
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="w-8 h-8" />
          <span className="text-2xl font-bold">MachiNow</span>
        </div>
      </motion.div>

      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">運営会社アカウント登録</h1>
            <p className="text-muted-foreground">
              店舗を作成・管理するためのアカウントを作成
            </p>
          </div>

          {/* エラーメッセージ表示 */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">会社名</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="運営会社名"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="6文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                最低6文字、数字と記号を含めることを推奨
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">運営会社アカウントとして登録されます</p>
                  <p className="text-xs text-muted-foreground">
                    店舗の作成・管理・更新が可能になります
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登録中...
                </>
              ) : (
                'アカウントを作成'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              すでにアカウントをお持ちですか？{' '}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                ログイン
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
