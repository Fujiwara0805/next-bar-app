'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Mail, Lock, User, Building, Loader2 } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password.length < 6) {
        toast.error('パスワードは6文字以上である必要があります');
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, displayName, true);

      if (error) {
        toast.error('登録に失敗しました', {
          description: error.message || 'もう一度お試しください。',
        });
        return;
      }

      toast.success('アカウントを作成しました');
      router.push('/map');
    } catch (error) {
      toast.error('エラーが発生しました');
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
            <h1 className="text-3xl font-bold mb-2">企業アカウント登録</h1>
            <p className="text-muted-foreground">
              店舗情報を管理するためのアカウントを作成
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">表示名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="山田太郎"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  required
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
                />
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">企業アカウントとして登録されます</p>
                  <p className="text-xs text-muted-foreground">
                    店舗情報の管理と更新が可能になります
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
