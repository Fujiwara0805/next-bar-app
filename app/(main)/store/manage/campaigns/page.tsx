'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  PartyPopper,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  ImageIcon,
  Upload,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
// AlertDialog removed - using CustomModal for delete confirmation
import { CustomModal } from '@/components/ui/custom-modal';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  Campaign,
  CampaignMasterFormValues,
  getDefaultCampaignMasterFormValues,
  dbDataToCampaignMasterForm,
  campaignMasterFormSchema,
  isCampaignValid,
  getCampaignRemainingDays,
} from '@/lib/types/campaign';
import {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '@/lib/actions/campaign';

// ============================================
// カラーパレット定義（店舗詳細画面準拠）
// ディープネイビー × シャンパンゴールドの高級感
// ============================================
const COLORS = {
  // プライマリ
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  
  // アクセント
  champagneGold: '#C9A86C',
  paleGold: '#E8D5B7',
  antiqueGold: '#B8956E',
  
  // ニュートラル
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

// ============================================
// 入力スタイル（ゴールドアクセント）
// ============================================
const inputStyles = {
  base: `
    w-full px-3 py-2.5 rounded-lg
    bg-white border-2
    transition-all duration-200
    font-medium
    placeholder:text-gray-400
    focus:outline-none
  `,
  focus: `
    focus:border-[#C9A86C] 
    focus:ring-2 
    focus:ring-[#C9A86C]/20
  `,
  default: 'border-gray-200 hover:border-gray-300',
};

const getInputClassName = (disabled?: boolean) => 
  `${inputStyles.base} ${inputStyles.focus} ${inputStyles.default} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

// ============================================
// メインコンポーネント
// ============================================
export default function CampaignsManagePage() {
  const router = useRouter();
  const { profile, accountType } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状態管理
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formValues, setFormValues] = useState<CampaignMasterFormValues>(getDefaultCampaignMasterFormValues());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // 削除確認
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 認証チェック
  useEffect(() => {
    if (!profile?.is_business || accountType !== 'platform') {
      router.push('/login');
      return;
    }
    
    fetchCampaigns();
  }, [profile, accountType, router]);

  // キャンペーン一覧取得
  const fetchCampaigns = async () => {
    try {
      const result = await getAllCampaigns();
      if (result.success && result.data) {
        setCampaigns(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error('キャンペーンの取得に失敗しました', { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  // モーダルを開く（新規作成）
  const handleOpenCreateModal = () => {
    setEditingCampaign(null);
    setFormValues(getDefaultCampaignMasterFormValues());
    setFormErrors({});
    setIsModalOpen(true);
  };

  // モーダルを開く（編集）
  const handleOpenEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormValues(dbDataToCampaignMasterForm(campaign));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
    setFormValues(getDefaultCampaignMasterFormValues());
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('画像は5MB以下にしてください', { position: 'top-center' });
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `campaigns/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('campaign-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(fileName);

      setFormValues(prev => ({ ...prev, imageUrl: publicUrl }));
      toast.success('画像をアップロードしました', { position: 'top-center', duration: 1500 });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('画像のアップロードに失敗しました', { position: 'top-center' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 画像削除
  const handleImageDelete = async () => {
    if (!formValues.imageUrl) return;

    setUploadingImage(true);

    try {
      const url = new URL(formValues.imageUrl);
      const pathParts = url.pathname.split('/campaign-images/');
      if (pathParts.length >= 2) {
        const filePath = pathParts[1];
        await supabase.storage
          .from('campaign-images')
          .remove([filePath]);
      }

      setFormValues(prev => ({ ...prev, imageUrl: '' }));
      toast.success('画像を削除しました', { position: 'top-center', duration: 1500 });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('画像の削除に失敗しました', { position: 'top-center' });
    } finally {
      setUploadingImage(false);
    }
  };

  // フォームバリデーション
  const validateForm = (): boolean => {
    const result = campaignMasterFormSchema.safeParse(formValues);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  // 保存処理
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('入力内容を確認してください', { position: 'top-center' });
      return;
    }

    setSaving(true);

    try {
      if (editingCampaign) {
        // 更新
        const result = await updateCampaign(editingCampaign.id, formValues);
        if (result.success) {
          toast.success('キャンペーンを更新しました', { position: 'top-center', duration: 1500 });
          fetchCampaigns();
          handleCloseModal();
        } else {
          throw new Error(result.error);
        }
      } else {
        // 新規作成
        const result = await createCampaign(formValues);
        if (result.success) {
          toast.success('キャンペーンを作成しました', { position: 'top-center', duration: 1500 });
          fetchCampaigns();
          handleCloseModal();
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Save campaign error:', error);
      toast.error('保存に失敗しました', { position: 'top-center' });
    } finally {
      setSaving(false);
    }
  };

  // 削除確認ダイアログを開く
  const handleOpenDeleteDialog = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  // 削除実行
  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    setDeleting(true);

    try {
      const result = await deleteCampaign(campaignToDelete.id);
      if (result.success) {
        toast.success('キャンペーンを削除しました', { position: 'top-center', duration: 1500 });
        fetchCampaigns();
        setDeleteDialogOpen(false);
        setCampaignToDelete(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Delete campaign error:', error);
      toast.error('削除に失敗しました', { position: 'top-center' });
    } finally {
      setDeleting(false);
    }
  };

  // フォーム値変更ハンドラー
  const handleFormChange = <K extends keyof CampaignMasterFormValues>(
    key: K,
    value: CampaignMasterFormValues[K]
  ) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    // エラーをクリア
    if (formErrors[key]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: COLORS.luxuryGradient }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.champagneGold }} />
          </motion.div>
          <p className="text-sm font-bold" style={{ color: COLORS.ivory }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  // アクティブ・非アクティブでキャンペーンを分類
  const activeCampaigns = campaigns.filter(c => c.is_active);
  const inactiveCampaigns = campaigns.filter(c => !c.is_active);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.cardGradient }}>
      {/* ヘッダー（店舗詳細画面準拠のラグジュアリーデザイン） */}
      <header 
        className="sticky top-0 z-20 safe-top"
        style={{ 
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/store/manage')}
              className="rounded-full hover:bg-white/10"
              style={{ color: COLORS.champagneGold }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-xl font-light tracking-widest flex items-center justify-center gap-2" style={{ color: COLORS.ivory }}>
                <PartyPopper className="w-6 h-6" style={{ color: COLORS.champagneGold }} />
                キャンペーン管理
              </h1>
              <p className="text-sm mt-1 font-bold" style={{ color: COLORS.platinum }}>
                {activeCampaigns.length}件のアクティブなキャンペーン
              </p>
            </div>
            <div className="w-10" /> {/* スペーサー */}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* 新規作成ボタン（ゴールドグラデーション） */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button 
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto rounded-xl font-bold shadow-lg"
            style={{ 
              background: COLORS.goldGradient,
              color: COLORS.deepNavy,
              boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新しいキャンペーンを作成
          </Button>
        </motion.div>

        {/* キャンペーン一覧 */}
        {campaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card 
              className="p-12 text-center rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <PartyPopper className="w-16 h-16 mx-auto mb-4" style={{ color: COLORS.champagneGold }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: COLORS.deepNavy }}>
                キャンペーンがまだありません
              </h2>
              <p className="mb-6 font-bold" style={{ color: COLORS.warmGray }}>
                地域のイベントや季節のキャンペーンを作成して、店舗に参加を促しましょう
              </p>
              <Button
                onClick={handleOpenCreateModal}
                className="rounded-xl font-bold shadow-lg"
                style={{ 
                  background: COLORS.goldGradient,
                  color: COLORS.deepNavy,
                  boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                キャンペーンを作成
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* アクティブなキャンペーン */}
            {activeCampaigns.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ background: COLORS.goldGradient }}
                  >
                    <Check className="w-4 h-4" style={{ color: COLORS.deepNavy }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                    アクティブなキャンペーン
                  </h2>
                </div>
                <div className="grid gap-4">
                  <AnimatePresence mode="popLayout">
                    {activeCampaigns.map((campaign, index) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        index={index}
                        onEdit={() => handleOpenEditModal(campaign)}
                        onDelete={() => handleOpenDeleteDialog(campaign)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* 非アクティブなキャンペーン */}
            {inactiveCampaigns.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(156, 163, 175, 0.15)' }}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: COLORS.warmGray }}>
                    終了したキャンペーン
                  </h2>
                </div>
                <div className="grid gap-4 opacity-60">
                  <AnimatePresence mode="popLayout">
                    {inactiveCampaigns.map((campaign, index) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        index={index}
                        onEdit={() => handleOpenEditModal(campaign)}
                        onDelete={() => handleOpenDeleteDialog(campaign)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 作成/編集モーダル（店舗詳細画面準拠のラグジュアリーデザイン） */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title=""
      >
        <div className="space-y-3">
          {/* キャンペーン名 */}
          <div className="space-y-1">
            <Label
              htmlFor="campaign-name"
              className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: COLORS.deepNavy }}
            >
              <PartyPopper className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
              キャンペーン名 <span style={{ color: COLORS.champagneGold }}>*</span>
            </Label>
            <Input
              id="campaign-name"
              value={formValues.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="例：別府温泉まつり2026"
              disabled={saving}
              className={getInputClassName(saving)}
              style={{ fontSize: '16px', color: COLORS.charcoal }}
            />
            {formErrors.name && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.name}
              </p>
            )}
          </div>

          {/* 説明 */}
          <div className="space-y-1">
            <Label
              htmlFor="campaign-description"
              className="text-sm font-bold"
              style={{ color: COLORS.deepNavy }}
            >
              説明
            </Label>
            <Textarea
              id="campaign-description"
              value={formValues.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="キャンペーンの詳細を入力してください"
              rows={2}
              disabled={saving}
              className={getInputClassName(saving)}
              style={{ fontSize: '16px', minHeight: '60px', color: COLORS.charcoal }}
            />
          </div>

          {/* キャンペーン画像 */}
          <div className="space-y-1">
            <Label
              className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: COLORS.deepNavy }}
            >
              <ImageIcon className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
              キャンペーン画像
            </Label>

            {formValues.imageUrl ? (
              <div className="relative rounded-lg overflow-hidden">
                <div className="aspect-video relative">
                  <Image
                    src={formValues.imageUrl}
                    alt="キャンペーン画像"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleImageDelete}
                    disabled={uploadingImage}
                    className="rounded-lg"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <label
                className="flex items-center justify-center gap-3 p-4 rounded-lg cursor-pointer transition-all"
                style={{
                  border: `2px dashed rgba(201, 168, 108, 0.4)`,
                  backgroundColor: 'rgba(201, 168, 108, 0.05)',
                }}
              >
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.champagneGold }} />
                ) : (
                  <>
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: 'rgba(201, 168, 108, 0.15)' }}
                    >
                      <Upload className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: COLORS.deepNavy }}>
                        画像をアップロード
                      </p>
                      <p className="text-xs" style={{ color: COLORS.warmGray }}>
                        PNG, JPG, WEBP（最大5MB）
                      </p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={saving || uploadingImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 期間設定 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="campaign-start"
                className="text-sm font-bold flex items-center gap-1.5"
                style={{ color: COLORS.deepNavy }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
                開始日 <span style={{ color: COLORS.champagneGold }}>*</span>
              </Label>
              <Input
                id="campaign-start"
                type="date"
                value={formValues.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
                disabled={saving}
                className={getInputClassName(saving)}
                style={{ fontSize: '16px', color: COLORS.charcoal }}
              />
              {formErrors.startDate && (
                <p className="text-xs text-red-500">{formErrors.startDate}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="campaign-end"
                className="text-sm font-bold flex items-center gap-1.5"
                style={{ color: COLORS.deepNavy }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
                終了日 <span style={{ color: COLORS.champagneGold }}>*</span>
              </Label>
              <Input
                id="campaign-end"
                type="date"
                value={formValues.endDate}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
                disabled={saving}
                className={getInputClassName(saving)}
                style={{ fontSize: '16px', color: COLORS.charcoal }}
              />
              {formErrors.endDate && (
                <p className="text-xs text-red-500">{formErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* アクティブ状態 */}
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(201, 168, 108, 0.1)',
              border: `1px solid rgba(201, 168, 108, 0.2)`,
            }}
          >
            <div>
              <Label className="text-sm font-bold" style={{ color: COLORS.deepNavy }}>
                キャンペーンを有効にする
              </Label>
              <p className="text-xs" style={{ color: COLORS.warmGray }}>
                有効にすると店舗側で選択できます
              </p>
            </div>
            <Switch
              checked={formValues.isActive}
              onCheckedChange={(checked) => handleFormChange('isActive', checked)}
              disabled={saving}
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 font-bold rounded-xl"
              onClick={handleCloseModal}
              disabled={saving}
              style={{
                borderColor: 'rgba(201, 168, 108, 0.3)',
                backgroundColor: 'rgba(201, 168, 108, 0.08)',
                color: COLORS.charcoal,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-bold rounded-xl"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: COLORS.goldGradient,
                color: COLORS.deepNavy,
                boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : editingCampaign ? (
                '更新する'
              ) : (
                '作成する'
              )}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* 削除確認ダイアログ（CustomModal） */}
      <CustomModal
        isOpen={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        title=""
        showCloseButton={!deleting}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            >
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
              キャンペーンを削除しますか？
            </h3>
          </div>
          {campaignToDelete && (
            <p className="text-sm text-center" style={{ color: COLORS.warmGray }}>
              <span className="font-bold" style={{ color: COLORS.charcoal }}>{campaignToDelete.name}</span>
              を完全に削除します。この操作は取り消せません。
              <br />
              <br />
              このキャンペーンを選択している店舗は影響を受けません。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-bold rounded-xl"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              style={{
                borderColor: 'rgba(201, 168, 108, 0.3)',
                backgroundColor: 'rgba(201, 168, 108, 0.08)',
                color: COLORS.charcoal,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-bold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </>
              )}
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}

// ============================================
// キャンペーンカードコンポーネント
// ============================================
interface CampaignCardProps {
  campaign: Campaign;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function CampaignCard({ campaign, index, onEdit, onDelete }: CampaignCardProps) {
  const remainingDays = getCampaignRemainingDays({
    ...campaign,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    isActive: campaign.is_active,
  });
  
  const isExpired = remainingDays !== null && remainingDays < 0;
  const isEndingSoon = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="overflow-hidden rounded-2xl shadow-lg"
        style={{ 
          background: '#FFFFFF',
          border: `1px solid ${campaign.is_active ? 'rgba(201, 168, 108, 0.2)' : 'rgba(0, 0, 0, 0.05)'}`,
        }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ 
                    background: campaign.is_active ? COLORS.goldGradient : 'rgba(156, 163, 175, 0.1)',
                  }}
                >
                  <PartyPopper 
                    className="w-4 h-4" 
                    style={{ color: campaign.is_active ? COLORS.deepNavy : '#9CA3AF' }} 
                  />
                </div>
                <h3 className="font-bold text-lg" style={{ color: COLORS.deepNavy }}>
                  {campaign.name}
                </h3>
              </div>
              
              {campaign.description && (
                <p className="text-sm mb-3" style={{ color: COLORS.warmGray }}>
                  {campaign.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {/* 期間 */}
                <div className="flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                  <Calendar className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  <span>
                    {new Date(campaign.start_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    {' 〜 '}
                    {new Date(campaign.end_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                {/* 残り日数 */}
                {campaign.is_active && !isExpired && remainingDays !== null && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ 
                      backgroundColor: isEndingSoon ? 'rgba(239, 68, 68, 0.1)' : 'rgba(201, 168, 108, 0.15)',
                      color: isEndingSoon ? '#EF4444' : COLORS.antiqueGold,
                    }}
                  >
                    {isEndingSoon ? `残り${remainingDays}日` : `あと${remainingDays}日`}
                  </span>
                )}
                
                {isExpired && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ 
                      backgroundColor: 'rgba(156, 163, 175, 0.1)',
                      color: '#9CA3AF',
                    }}
                  >
                    終了済み
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-1 ml-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                title="編集"
                className="hover:bg-[#C9A86C]/10"
                style={{ color: COLORS.champagneGold }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-red-50"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
