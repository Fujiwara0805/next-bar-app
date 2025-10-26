'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, User, Mail, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';

import { toast } from 'sonner';

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
          duration: 5000,
          className: 'bg-gray-100'
        });
      }

      // profilesテーブルを更新（型安全）
      const payload: ProfileUpdate = {
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .update(payload as unknown as never)
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('プロフィールを更新しました', {
        position: 'top-center',
        duration: 2000,
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
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#1C1E26' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-white font-bold">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1C1E26' }}>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-center flex-1">プロフィール編集</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <Card className="p-6 bg-white">
            <div className="space-y-4">
              {/* 表示名 */}
              <div>
                <Label htmlFor="displayName" className="font-bold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  表示名
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: 山田太郎"
                  required
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* メールアドレス */}
              <div>
                <Label htmlFor="email" className="font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4" />
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
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                {email !== currentEmail && (
                  <p className="text-xs text-amber-600 font-bold mt-2">
                    ⚠️ メールアドレス変更には確認が必要です。新しいメールアドレスに確認リンクが送信されます。
                  </p>
                )}
              </div>

              {/* アバターURL */}
              <div>
                <Label htmlFor="avatarUrl" className="font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  アバター画像URL
                </Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 自己紹介 */}
              <div>
                <Label htmlFor="bio" className="font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  自己紹介
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="自己紹介を入力してください"
                  rows={4}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
          </Card>

          {/* ボタン */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-bold bg-white"
              onClick={() => router.back()}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              className="flex-1 font-bold" 
              disabled={loading}
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
