'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, User, Mail, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';

import { toast } from 'sonner';
import { LoadingScreen } from '@/components/ui/loading-screen';

type ProfileUpdate = {
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  updated_at?: string;
};

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // フォームの状態
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!user || !profile) {
      router.push('/login');
      return;
    }

    setDisplayName(profile.display_name || '');
    setEmail(user.email || '');
    setCurrentEmail(user.email || '');
    setAvatarUrl(profile.avatar_url || '');
    setBio(profile.bio || '');
  }, [user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) return;

    if (!displayName.trim()) {
      toast.error('表示名を入力してください', {
        position: 'top-center',
        duration: 2000,
        className: 'bg-gray-100'
      });
      return;
    }

    setLoading(true);

    try {
      // メールアドレスが変更された場合
      if (email !== currentEmail) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email,
        });

        if (authError) throw authError;

        toast.success('確認メールを送信しました', {
          description: '新しいメールアドレスに送信された確認リンクをクリックしてください',
          position: 'top-center',
          duration: 1000,
          className: 'bg-gray-100'
        });
      }

      // usersテーブルを更新（型安全）
      const payload: ProfileUpdate = {
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase
        .from('users')
        .update(payload as unknown as never)
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('プロフィールを更新しました', {
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });

      router.push('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('更新に失敗しました', {
        description: error instanceof Error ? error.message : '不明なエラー',
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return <LoadingScreen size="lg" />;
  }

  const BG_OFFWHITE = '#F7F3E9';
  const NAVY = '#13294b';
  const BRASS = '#ffc62d';
  const COPPER = '#B87333';
  const GOLD_GRADIENT = 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)';
  const NAVY_GRADIENT = 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)';

  return (
    <div className="min-h-screen pb-20" style={{ background: BG_OFFWHITE }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{ background: NAVY_GRADIENT, borderBottom: `1px solid ${BRASS}33` }}
      >
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#FDFBF7' }}
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: '#FDFBF7' }}>
            プロフィール編集
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 pt-6">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'white',
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="displayName"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <User className="w-3.5 h-3.5" />
                  表示名
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: 山田太郎"
                  required
                  disabled={loading}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  disabled={loading}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
                {email !== currentEmail && (
                  <p className="text-xs font-semibold mt-2" style={{ color: COPPER }}>
                    メールアドレス変更には確認が必要です。新しいメールアドレスに確認リンクが送信されます。
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="avatarUrl"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  アバター画像URL
                </Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={loading}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="bio"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  自己紹介
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="自己紹介を入力してください"
                  rows={4}
                  disabled={loading}
                  className="text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 font-semibold rounded-xl"
              onClick={() => router.back()}
              disabled={loading}
              style={{
                background: 'white',
                color: NAVY,
                border: `1.5px solid ${BRASS}60`,
              }}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 font-bold rounded-xl shadow-lg"
              disabled={loading}
              style={{
                background: GOLD_GRADIENT,
                color: NAVY,
                boxShadow: `0 6px 24px ${BRASS}55`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                '更新'
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
