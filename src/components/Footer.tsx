import React from 'react';
import { ArrowUp, Globe, Shield, Radio, Heart } from 'lucide-react';
import { Category } from '../types';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (categoryId: string | null) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  categories,
  onSelectCategory,
  onOpenAdmin,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-zinc-950 text-white border-t-4 border-red-600 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
        {/* Top Brand & Back to Top Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-white font-black text-2xl px-2.5 py-0.5 rounded-xs">
                T
              </div>
              <span className="font-black text-2xl tracking-tight uppercase">TRIBUNA BRASIL</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
              Jornalismo independente, rápido e verídico. Notícias do Brasil, política, economia, tecnologia, esportes e entretenimento com cobertura em tempo real.
            </p>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-md text-xs font-bold uppercase transition-colors border border-zinc-800 cursor-pointer"
          >
            <span>Voltar ao topo</span>
            <ArrowUp className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 text-xs">
          {/* Categories Links */}
          <div className="space-y-3 col-span-2">
            <h4 className="font-extrabold text-sm uppercase text-red-500 tracking-wider">
              Seções de Notícias
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="text-left text-zinc-400 hover:text-white transition-colors font-medium cursor-pointer"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Institutional Links */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm uppercase text-red-500 tracking-wider">
              Institucional
            </h4>
            <ul className="space-y-2 text-zinc-400 font-medium">
              <li><a href="#expediente" className="hover:text-white transition-colors">Expediente</a></li>
              <li><a href="#codigo-etica" className="hover:text-white transition-colors">Código de Ética</a></li>
              <li><a href="#trabalhe-conosco" className="hover:text-white transition-colors">Trabalhe Conosco</a></li>
              <li><a href="#anuncie" className="hover:text-white transition-colors">Anuncie Conosco</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-medium">
          <p>© 2026 Tribuna Brasil Portal de Notícias. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Desenvolvido com autonomia total para publicação e gestão de conteúdo.
          </p>
        </div>
      </div>
    </footer>
  );
};
