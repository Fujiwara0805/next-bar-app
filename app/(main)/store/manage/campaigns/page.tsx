'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertCircle,
  Check,
  X,
  ImageIcon,
  Upload,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  getCampaignRemainingDays,
} from '@/lib/types/campaign';
import {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '@/lib/actions/campaign';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { AdminKpiCard, AdminKpiGrid, getKpiGradient } from '@/components/admin/admin-kpi-card';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { AdminStatusBadge } from '@/components/admin/admin-status-badge';

// ============================================
// メインコンポーネント
// ============================================
export default function CampaignsManagePage() {
  const { colors: C, isDark } = useAdminTheme();
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

  // KPI集計
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.is_active), [campaigns]);
  const inactiveCampaigns = useMemo(() => campaigns.filter(c => !c.is_active), [campaigns]);
  const endingSoonCount = useMemo(() => {
    return activeCampaigns.filter(c => {
      const days = getCampaignRemainingDays({
        ...c,
        startDate: c.start_date,
        endDate: c.end_date,
        isActive: c.is_active,
      });
      return days !== null && days >= 0 && days <= 7;
    }).length;
  }, [activeCampaigns]);

  // 入力スタイルのクラス名生成
  const getInputClassName = (disabled?: boolean) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all duration-200 font-medium focus:outline-none focus:ring-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  // 入力スタイルオブジェクト
  const getInputStyle = () => ({
    fontSize: '16px',
    color: C.text,
    backgroundColor: C.bgInput,
    borderColor: C.border,
  });

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

    if (file.size > 10 * 1024 * 1024) {
      toast.error('画像は10MB以下にしてください', { position: 'top-center' });
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
        const result = await updateCampaign(editingCampaign.id, formValues);
        if (result.success) {
          toast.success('キャンペーンを更新しました', { position: 'top-center', duration: 1500 });
          fetchCampaigns();
          handleCloseModal();
        } else {
          throw new Error(result.error);
        }
      } else {
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
      <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
          <p className="text-xs tracking-wider" style={{ color: C.textSubtle }}>Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* ページタイトル */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>キャンペーン管理</h1>
          <p className="text-sm mt-1" style={{ color: C.textSubtle }}>キャンペーンの作成・管理を行います</p>
        </motion.div>

        {/* KPI Cards - LINE Harness style */}
        <AdminKpiGrid>
          <AdminKpiCard icon={PartyPopper} label="全キャンペーン" value={campaigns.length} gradient={getKpiGradient('gold')} index={0} />
          <AdminKpiCard icon={Check} label="アクティブ" value={activeCampaigns.length} subLabel="稼働中のシナリオ" gradient={getKpiGradient('green')} index={1} />
          <AdminKpiCard icon={X} label="終了済み" value={inactiveCampaigns.length} gradient={getKpiGradient('slate')} index={2} />
          <AdminKpiCard icon={Timer} label="残り7日以内" value={endingSoonCount} gradient={getKpiGradient('rose')} index={3} badge={endingSoonCount > 0 ? '注意' : undefined} />
        </AdminKpiGrid>

        {/* Campaign Section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: C.textSubtle }}>
              Campaigns
            </p>
            {campaigns.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: C.accentBg, color: C.accent }}>
                {campaigns.length}
              </span>
            )}
            <div className="flex-1 h-px" style={{ background: C.borderSubtle }} />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: C.accent, color: '#fff' }}
            >
              <Plus className="w-3.5 h-3.5" />
              新規作成
            </motion.button>
          </div>

          {/* キャンペーン一覧 - テーブル形式 */}
          {campaigns.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-16 text-center rounded-xl"
              style={{ background: C.bgCard, border: `1px dashed ${C.border}` }}
            >
              <PartyPopper className="w-16 h-16 mx-auto mb-4" style={{ color: C.textSubtle }} />
              <h3 className="text-base font-semibold mb-1.5" style={{ color: C.text }}>
                キャンペーンがまだありません
              </h3>
              <p className="text-sm mb-6" style={{ color: C.textMuted }}>
                地域のイベントや季節のキャンペーンを作成して、店舗に参加を促しましょう
              </p>
              <Button
                onClick={handleOpenCreateModal}
                className="rounded-lg font-semibold text-sm px-6"
                style={{ background: C.accent, color: '#fff' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                キャンペーンを作成
              </Button>
            </motion.div>
          ) : (
            <AdminDataTable
              columns={[
                {
                  key: 'name',
                  header: 'キャンペーン名',
                  width: '2fr',
                  render: (c: Campaign) => (
                    <div className="flex items-center gap-2.5">
                      <PartyPopper className="w-4 h-4 flex-shrink-0" style={{ color: c.is_active ? C.accent : C.textSubtle }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{c.name}</p>
                        {c.description && <p className="text-xs truncate" style={{ color: C.textSubtle }}>{c.description}</p>}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'ステータス',
                  width: '120px',
                  render: (c: Campaign) => {
                    const days = getCampaignRemainingDays({ ...c, startDate: c.start_date, endDate: c.end_date, isActive: c.is_active });
                    const isExpired = days !== null && days < 0;
                    if (!c.is_active || isExpired) return <AdminStatusBadge label="終了" variant="neutral" />;
                    if (days !== null && days <= 7) return <AdminStatusBadge label={`残り${days}日`} variant="danger" dot />;
                    return <AdminStatusBadge label="アクティブ" variant="success" dot />;
                  },
                },
                {
                  key: 'period',
                  header: '期間',
                  width: '180px',
                  hideOnMobile: true,
                  render: (c: Campaign) => (
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {new Date(c.start_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      {' 〜 '}
                      {new Date(c.end_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </span>
                  ),
                },
                {
                  key: 'created',
                  header: '作成日',
                  width: '100px',
                  hideOnMobile: true,
                  render: (c: Campaign) => (
                    <span className="text-xs" style={{ color: C.textSubtle }}>
                      {new Date(c.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  width: '100px',
                  render: (c: Campaign) => (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenEditModal(c)} className="p-1.5 rounded-md transition-colors" style={{ color: C.accent }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.accentBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleOpenDeleteDialog(c)} className="p-1.5 rounded-md transition-colors" style={{ color: C.danger }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ),
                },
              ] as AdminColumn<Campaign>[]}
              data={[...activeCampaigns, ...inactiveCampaigns]}
              keyExtractor={(c) => c.id}
              onRowClick={(c) => handleOpenEditModal(c)}
              emptyIcon={<PartyPopper className="w-12 h-12" style={{ color: C.textSubtle }} />}
              emptyTitle="キャンペーンがまだありません"
            />
          )}
        </section>
      </div>

      {/* 作成/編集モーダル */}
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
              style={{ color: C.text }}
            >
              <PartyPopper className="w-3.5 h-3.5" style={{ color: C.accent }} />
              キャンペーン名 <span style={{ color: C.accent }}>*</span>
            </Label>
            <Input
              id="campaign-name"
              value={formValues.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="例：別府温泉まつり2026"
              disabled={saving}
              className={getInputClassName(saving)}
              style={getInputStyle()}
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
              style={{ color: C.text }}
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
              style={{ ...getInputStyle(), minHeight: '60px' }}
            />
          </div>

          {/* キャンペーン画像 */}
          <div className="space-y-1">
            <Label
              className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: C.text }}
            >
              <ImageIcon className="w-3.5 h-3.5" style={{ color: C.accent }} />
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
                  border: `2px dashed ${C.border}`,
                  backgroundColor: C.accentBg,
                }}
              >
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
                ) : (
                  <>
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: C.accentBg }}
                    >
                      <Upload className="w-5 h-5" style={{ color: C.accent }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: C.text }}>
                        画像をアップロード
                      </p>
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        PNG, JPG, WEBP（最大10MB）
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
                style={{ color: C.text }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: C.accent }} />
                開始日 <span style={{ color: C.accent }}>*</span>
              </Label>
              <Input
                id="campaign-start"
                type="date"
                value={formValues.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
                disabled={saving}
                className={getInputClassName(saving)}
                style={getInputStyle()}
              />
              {formErrors.startDate && (
                <p className="text-xs text-red-500">{formErrors.startDate}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="campaign-end"
                className="text-sm font-bold flex items-center gap-1.5"
                style={{ color: C.text }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: C.accent }} />
                終了日 <span style={{ color: C.accent }}>*</span>
              </Label>
              <Input
                id="campaign-end"
                type="date"
                value={formValues.endDate}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
                disabled={saving}
                className={getInputClassName(saving)}
                style={getInputStyle()}
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
              backgroundColor: C.accentBg,
              border: `1px solid ${C.border}`,
            }}
          >
            <div>
              <Label className="text-sm font-bold" style={{ color: C.text }}>
                キャンペーンを有効にする
              </Label>
              <p className="text-xs" style={{ color: C.textMuted }}>
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
                borderColor: C.border,
                backgroundColor: C.bgInput,
                color: C.text,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-bold rounded-xl"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: C.accent,
                color: '#fff',
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

      {/* 削除確認ダイアログ */}
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
              style={{ backgroundColor: C.dangerBg }}
            >
              <Trash2 className="w-6 h-6" style={{ color: C.danger }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: C.text }}>
              キャンペーンを削除しますか？
            </h3>
          </div>
          {campaignToDelete && (
            <p className="text-sm text-center" style={{ color: C.textMuted }}>
              <span className="font-bold" style={{ color: C.text }}>{campaignToDelete.name}</span>
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
                borderColor: C.border,
                backgroundColor: C.bgInput,
                color: C.text,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-bold rounded-xl"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              style={{
                background: C.danger,
                color: '#fff',
              }}
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
  const { colors: C } = useAdminTheme();
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="overflow-hidden rounded-xl transition-all"
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${campaign.is_active ? C.success : C.textSubtle}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent + '40'; e.currentTarget.style.borderLeftColor = campaign.is_active ? C.success : C.textSubtle; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderLeftColor = campaign.is_active ? C.success : C.textSubtle; }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <PartyPopper
                className="w-4 h-4 flex-shrink-0"
                style={{ color: campaign.is_active ? C.accent : C.textSubtle }}
              />
              <h3 className="font-semibold text-sm tracking-tight truncate" style={{ color: C.text }}>
                {campaign.name}
              </h3>
            </div>

            {campaign.description && (
              <p className="text-[11px] mb-3 line-clamp-2" style={{ color: C.textMuted }}>
                {campaign.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {/* 期間 */}
              <div className="flex items-center gap-1" style={{ color: C.textMuted }}>
                <Calendar className="w-3 h-3" style={{ color: C.accent }} />
                <span className="text-[11px]">
                  {new Date(campaign.start_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  {' 〜 '}
                  {new Date(campaign.end_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* 残り日数 */}
              {campaign.is_active && !isExpired && remainingDays !== null && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: isEndingSoon ? C.dangerBg : C.accentBg,
                    color: isEndingSoon ? C.danger : C.accent,
                  }}
                >
                  {isEndingSoon ? `残り${remainingDays}日` : `あと${remainingDays}日`}
                </span>
              )}

              {isExpired && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: C.bgElevated,
                    color: C.textSubtle,
                  }}
                >
                  終了済み
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 ml-4">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
              style={{ color: C.accent }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.accentBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Edit className="w-3 h-3" />
              編集
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
              style={{ color: C.danger }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Trash2 className="w-3 h-3" />
              削除
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
