
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Advertise: React.FC = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    segment: '',
    city: 'Santarém',
    whatsapp: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simula envio e salva como lead
    setTimeout(() => {
      authService.saveLead(formData);
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl">
          <i className="fas fa-check"></i>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase italic text-gray-800">Interesse Recebido!</h1>
          <p className="text-gray-500 font-medium">Nossa equipe entrará em contato via WhatsApp em breve para explicar os próximos passos.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="bg-black text-white font-black px-10 py-4 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm"
        >
          Voltar para as ofertas
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-16 space-y-12">
      {/* Institutional Hero */}
      <section className="text-center space-y-6">
        <div className="inline-block bg-yellow-400 text-black px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest mb-2">
          Expanda seu negócio
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-gray-800 uppercase italic tracking-tighter leading-none">
          Anuncie no <br/> Pechincha <span className="text-yellow-500">Santarém</span>
        </h1>
        <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
          Divulgue suas ofertas para milhares de pessoas em Santarém. Cadastre suas promoções com segurança e alcance mais clientes todos os dias.
        </p>
      </section>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: 'fa-chart-line', title: 'Mais Visibilidade', desc: 'Sua loja vista por quem já está procurando economizar.' },
          { icon: 'fa-user-check', title: 'Público Qualificado', desc: 'Consumidores reais de Santarém e região.' },
          { icon: 'fa-shield-alt', title: 'Controle Total', desc: 'Gestão simples e segura das suas promoções.' }
        ].map((benefit, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 text-center space-y-4 shadow-sm">
            <div className="bg-yellow-50 text-yellow-500 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <i className={`fas ${benefit.icon}`}></i>
            </div>
            <h3 className="font-black uppercase text-sm tracking-tighter">{benefit.title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">{benefit.desc}</p>
          </div>
        ))}
      </div>

      {/* Lead Form */}
      <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-50 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-black p-12 text-white flex flex-col justify-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Tenho Interesse</h2>
            <p className="text-gray-400 text-sm font-medium">O cadastro de parceiros é feito mediante aprovação administrativa para garantir a qualidade da plataforma.</p>
          </div>
          
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-300">
              <i className="fas fa-check-circle text-yellow-400"></i>
              Preencha seus dados ao lado
            </li>
            <li className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-300">
              <i className="fas fa-check-circle text-yellow-400"></i>
              Aguarde nosso contato em 24h
            </li>
            <li className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-300">
              <i className="fas fa-check-circle text-yellow-400"></i>
              Comece a vender mais
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Empresa *</label>
              <input 
                name="companyName" 
                value={formData.companyName} 
                onChange={handleChange}
                placeholder="Ex: Mercadão Santarém" 
                className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-400 font-bold transition-all" 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Segmento *</label>
                <input 
                  name="segment" 
                  value={formData.segment} 
                  onChange={handleChange}
                  placeholder="Ex: Supermercado" 
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-400 font-bold transition-all" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cidade *</label>
                <input 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-400 font-bold transition-all" 
                  required 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp para Contato *</label>
              <input 
                name="whatsapp" 
                value={formData.whatsapp} 
                onChange={handleChange}
                placeholder="93 99999-9999" 
                className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-400 font-bold transition-all" 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações (opcional)</label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange}
                rows={2} 
                className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-400 font-medium transition-all"
              ></textarea>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
          >
            {loading ? 'ENVIANDO...' : 'SOLICITAR CONTATO'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Advertise;
