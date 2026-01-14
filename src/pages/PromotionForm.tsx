import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, PromotionDestination } from '../types';
import { promotionService } from '../services/promotionService';
import { authService } from '../services/authService';

const inputStyle =
  "w-full px-4 py-3 rounded-xl border border-gray-300 font-bold outline-none focus:ring-2 focus:ring-yellow-400";

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

  useEffect(() => {
    if (isEdit && id) {
      const existing = promotionService.getById(id);
      if (existing) {
        setFormData({
          title: existing.title,
          description: existing.description,
          currentPrice: String(existing.currentPrice),
          oldPrice: String(existing.oldPrice),
          category: existing.category,
          expiryDate: existing.expiryDate,
          imageUrl: existing.imageUrl,
          storeName: existing.storeName,
          isFeatured: existing.isFeatured,
          destinationType: existing.destinationType || 'WhatsApp',
          // ✅ Se for WhatsApp, deixa o campo com números; senão deixa URL normal
          destinationUrl:
            existing.destinationType === 'WhatsApp'
              ? (existing.destinationUrl || '').replace(/\D/g, '')
              : (existing.destinationUrl || '')
        });
      }
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;

    // ✅ se o destino é WhatsApp, mantém só números no input
    if (name === "destinationUrl" && formData.destinationType === "WhatsApp") {
      setFormData(prev => ({ ...prev, destinationUrl: value.replace(/\D/g, '') }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      promotionService.save(
        {
          title: formData.title,
          description: formData.description,
          currentPrice: Number(formData.currentPrice),
          oldPrice: Number(formData.oldPrice || 0),
          category: formData.category,
          expiryDate: formData.expiryDate,
          imageUrl: formData.imageUrl,
          storeName: formData.storeName,
          isFeatured: formData.isFeatured,
          destinationType: formData.destinationType,
          destinationUrl: formData.destinationUrl
        },
        id
      );

      // ✅ CORREÇÃO: rota certa do parceiro
      navigate(session?.role === 'admin' ? '/admin/dashboard' : '/parceiro/dashboard');
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
          {formData.imageUrl ? (
            <img src={formData.imageUrl} className="w-full h-full object-contain bg-black" />
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
