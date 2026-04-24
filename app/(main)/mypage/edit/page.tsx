'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  User as UserIcon,
  MapPin,
  Cake,
  Briefcase,
  Users as UsersIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

const BG_OFFWHITE = '#F7F3E9';
const NAVY = '#13294b';
const NAVY_SOFT = 'rgba(19, 41, 75, 0.08)';
const BRASS = '#ffc62d';
const COPPER = '#B87333';
const GOLD_GRADIENT = 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)';
const NAVY_GRADIENT = 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)';

type ProfileAttributes = {
  address?: string;
  age?: string;
  occupation?: string;
  gender?: string;
};

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'other', label: 'その他' },
  { value: 'prefer_not_to_say', label: '回答しない' },
];

export default function MyPageEdit() {
  const router = useRouter();
  const { user, profile, accountType, loading: authLoading, refreshProfile } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<ProfileAttributes>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    root.style.background = BG_OFFWHITE;
    body.style.background = BG_OFFWHITE;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/mypage/edit');
      return;
    }
    if (accountType !== 'customer') {
      router.replace('/mypage');
      return;
    }
  }, [authLoading, user, accountType, router]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setAvatarUrl(profile.avatar_url ?? null);
    const attrs = (profile.profile_attributes ?? {}) as ProfileAttributes;
    setAttributes({
      address: attrs.address ?? '',
      age: attrs.age ?? '',
      occupation: attrs.occupation ?? '',
      gender: attrs.gender ?? '',
    });
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('画像は5MB以下を選択してください');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user-avatars/${user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('store-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('store-images').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);
      toast.success('画像をアップロードしました');
    } catch (err) {
      console.error('[avatar upload]', err);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('表示名を入力してください');
      return;
    }

    const cleanAttributes: ProfileAttributes = {};
    if (attributes.address?.trim()) cleanAttributes.address = attributes.address.trim();
    if (attributes.age?.trim()) cleanAttributes.age = attributes.age.trim();
    if (attributes.occupation?.trim()) cleanAttributes.occupation = attributes.occupation.trim();
    if (attributes.gender?.trim()) cleanAttributes.gender = attributes.gender.trim();

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: trimmedName,
          avatar_url: avatarUrl,
          profile_attributes: cleanAttributes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('プロフィールを更新しました', { position: 'top-center', duration: 1500 });
      router.push('/mypage');
    } catch (err) {
      console.error('[profile save]', err);
      toast.error('保存に失敗しました', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || accountType !== 'customer') {
    return <LoadingScreen size="lg" />;
  }

  const initial = displayName[0] ?? user.email?.[0] ?? '?';

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_OFFWHITE }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{ background: NAVY_GRADIENT, borderBottom: `1px solid ${BRASS}33` }}
      >
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button
            onClick={() => router.push('/mypage')}
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

      <div className="max-w-md mx-auto px-4 py-6">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit}
        >
          <div
            className="rounded-2xl p-6 bg-white mb-4 relative overflow-hidden"
            style={{
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />

            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar
                  className="w-24 h-24"
                  style={{ boxShadow: `0 0 0 2px ${BRASS}66, 0 4px 12px ${NAVY_SOFT}` }}
                >
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback
                    style={{ background: NAVY, color: BRASS, fontWeight: 700, fontSize: '2rem' }}
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    background: GOLD_GRADIENT,
                    boxShadow: `0 4px 12px ${BRASS}55`,
                    border: `2px solid white`,
                  }}
                  aria-label="画像を変更"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: NAVY }} />
                  ) : (
                    <Camera className="w-4 h-4" style={{ color: NAVY }} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-xs mt-3" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                タップして画像を変更
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="displayName"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  表示名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ニックネーム"
                  required
                  maxLength={50}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-6 bg-white mb-4 relative overflow-hidden"
            style={{
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
            }}
          >
            <h2 className="text-sm font-bold mb-1" style={{ color: NAVY }}>
              プロフィール情報
            </h2>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
              ここで入力した情報は、クーポン発行や特典のマッチングに使われます（任意）。
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="address"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  住所エリア
                </Label>
                <Input
                  id="address"
                  value={attributes.address ?? ''}
                  onChange={(e) => setAttributes((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="例: 大分市中央町"
                  maxLength={100}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="age"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <Cake className="w-3.5 h-3.5" />
                  年齢
                </Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  value={attributes.age ?? ''}
                  onChange={(e) => setAttributes((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="例: 28"
                  min={0}
                  max={120}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="occupation"
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  職業
                </Label>
                <Input
                  id="occupation"
                  value={attributes.occupation ?? ''}
                  onChange={(e) => setAttributes((prev) => ({ ...prev, occupation: e.target.value }))}
                  placeholder="例: 会社員 / デザイナー"
                  maxLength={100}
                  className="h-12 text-sm rounded-xl border-2 bg-muted"
                  style={{ fontSize: '16px', color: NAVY }}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: NAVY }}
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  性別
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map((opt) => {
                    const selected = attributes.gender === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setAttributes((prev) => ({
                            ...prev,
                            gender: selected ? '' : opt.value,
                          }))
                        }
                        className="h-11 rounded-xl text-sm font-semibold transition-all"
                        style={
                          selected
                            ? {
                                background: `${BRASS}20`,
                                color: NAVY,
                                border: `2px solid ${BRASS}`,
                              }
                            : {
                                background: 'white',
                                color: NAVY,
                                border: `1.5px solid ${NAVY}20`,
                              }
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 font-semibold rounded-xl"
              style={{
                background: 'white',
                color: NAVY,
                border: `1.5px solid ${BRASS}60`,
              }}
              onClick={() => router.push('/mypage')}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 font-bold rounded-xl shadow-lg"
              disabled={saving}
              style={{
                background: GOLD_GRADIENT,
                color: NAVY,
                boxShadow: `0 6px 24px ${BRASS}55`,
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
