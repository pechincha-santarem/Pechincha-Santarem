import { supabase } from '../lib/supabaseClient';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, PromotionDestination } from '../types';
import { promotionService } from '../services/promotionService';
import { authService } from '../services/authService';

const inputStyle =
  "w-full px-4 py-3 rounded-xl border border-gray-300 font-bold outline-none focus:ring-2 focus:ring-yellow-400";

// ✅ Bucket do Supabase Storage (crie como PUBLIC com este nome)
const STORAGE_BUCKET = 'promotions';

const PromotionForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const session = authService.getCurrentSession();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    currentPrice: '',
    oldPrice: '',
    category: 'Supermercado',
    expiryDate: '',
    imageUrl: '',
    storeName: '',
    isFeatured: false,
    destinationType: 'WhatsApp' as PromotionDestination,
    destinationUrl: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ arquivo real (não base64)
  const [imageFile, setImageFile] = useState<File | null>(null);
  // ✅ preview local
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (isEdit && id) {
        const existing = await promotionService.getById(id);
        if (!mounted) return;

        if (existing) {
          setFormData({
            title: existing.title,
            description: existing.description,
            currentPrice: String(existing.currentPrice),
            oldPrice: String(existing.oldPrice),
            category: existing.category,
            expiryDate: existing.expiryDate,
            imageUrl: existing.imageUrl || '',
            storeName: existing.storeName,
            isFeatured: existing.isFeatured,
            destinationType: existing.destinationType || 'WhatsApp',
            destinationUrl:
              existing.destinationType === 'WhatsApp'
                ? (existing.destinationUrl || '').replace(/\D/g, '')
                : (existing.destinationUrl || '')
          });

          // ✅ no edit: se já tem imagem salva, usa como preview
          setPreviewUrl(existing.imageUrl || '');
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // ✅ limpa URL de preview criada com createObjectURL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;

    // ✅ se o destino é WhatsApp, mantém só números
    if (name === 'destinationUrl' && formData.destinationType === 'WhatsApp') {
      setFormData(prev => ({ ...prev, destinationUrl: value.replace(/\D/g, '') }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    // ✅ remove preview anterior (evita duplicidade / vazamento de memória)
    setPreviewUrl(prev => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  const uploadImageToStorage = async (file: File, partnerId: string) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';

    const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;
    const path = `${partnerId}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg'
      });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    const publicUrl = data?.publicUrl || '';
    if (!publicUrl) throw new Error('Falha ao obter URL pública da imagem.');

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ pega a sessão REAL no momento do submit (sem depender do topo do componente)
      const s = await authService.getCurrentSession();

      const partnerId = (s as any)?.userId;
      if (!partnerId) {
        throw new Error('Sessão inválida: partnerId não encontrado.');
      }

      // ✅ se tiver imagem nova, sobe pro Storage e pega URL pública
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImageToStorage(imageFile, partnerId);
      }

      // ✅ proteção final contra base64
      if (typeof finalImageUrl === 'string' && finalImageUrl.startsWith('data:image/')) {
        finalImageUrl = '';
      }

      await promotionService.save(
        {
          title: formData.title,
          description: formData.description,
          currentPrice: Number(formData.currentPrice),
          oldPrice: Number(formData.oldPrice || 0),
          category: formData.category,
          expiryDate: formData.expiryDate,
          imageUrl: finalImageUrl,
          storeName: formData.storeName,
          isFeatured: formData.isFeatured,
          destinationType: formData.destinationType,
          destinationUrl: formData.destinationUrl,

          // ✅ dono da promo
          partnerId: partnerId,
          partnerName: (s as any)?.userName || (s as any)?.name || '',
        } as any,
        id
      );

      navigate(s?.role === 'admin' ? '/admin/dashboard' : '/parceiro/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar promoção.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-yellow-500 uppercase italic mb-6">
        {isEdit ? "Editar Oferta" : "Nova Oferta"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-xl space-y-5">
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-xl font-bold text-sm">
            {error}
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="aspect-video w-full bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden"
        >
          {previewUrl ? (
            <img src={previewUrl} className="w-full h-full object-contain bg-black" />
          ) : (
            <span className="font-black text-yellow-500">CLIQUE PARA ENVIAR A IMAGEM</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="grid md:grid-cols-2 gap-4">
          <input
            className={inputStyle}
            placeholder="Nome do produto"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
          <input
            className={inputStyle}
            placeholder="Nome da loja"
            name="storeName"
            value={formData.storeName}
            onChange={handleChange}
            required
          />
          <input
            className={inputStyle}
            type="number"
            placeholder="Preço oferta"
            name="currentPrice"
            value={formData.currentPrice}
            onChange={handleChange}
            required
          />
          <input
            className={inputStyle}
            type="number"
            placeholder="Preço antigo"
            name="oldPrice"
            value={formData.oldPrice}
            onChange={handleChange}
          />
          <select className={inputStyle} name="category" value={formData.category} onChange={handleChange}>
            {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
          </select>
          <input
            className={inputStyle}
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            required
          />
        </div>

        <textarea
          className={inputStyle}
          rows={3}
          placeholder="Descrição"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
        {/* ✅ Destino do clique (WhatsApp / Site / Catálogo / etc) */}
<div className="grid md:grid-cols-2 gap-4">
  <select
    className={inputStyle}
    name="destinationType"
    value={formData.destinationType}
    onChange={(e) => {
      const nextType = e.target.value as PromotionDestination;
      setFormData(prev => ({
        ...prev,
        destinationType: nextType,
        destinationUrl: nextType === 'WhatsApp'
          ? (prev.destinationUrl || '').replace(/\D/g, '')
          : (prev.destinationUrl || '')
      }));
    }}
  >
    <option value="WhatsApp">WhatsApp</option>
    <option value="Catálogo Digital">Catálogo Digital</option>
    <option value="Loja Online">Loja Online</option>
    <option value="Site Externo">Site Externo</option>
    <option value="Página Interna">Página Interna</option>
  </select>

  <input
    className={inputStyle}
    name="destinationUrl"
    value={formData.destinationUrl}
    onChange={handleChange}
    placeholder={
      formData.destinationType === 'WhatsApp'
        ? 'WhatsApp (somente números) ex: 5593981340104'
        : 'Link (https://...)'
    }
    required
  />
</div>

{/* ✅ Dica rápida pro usuário (não muda UX, só ajuda) */}
<p className="text-xs text-gray-500 font-bold">
  {formData.destinationType === 'WhatsApp'
    ? 'Digite o número com DDD (com ou sem 55). Ex: 5593...'
    : 'Cole o link completo começando com https://'}
</p>

        <button
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-4 rounded-2xl shadow-lg"
        >
          {loading ? "SALVANDO..." : "SALVAR OFERTA"}
        </button>
      </form>
    </div>
  );
};

export default PromotionForm;
