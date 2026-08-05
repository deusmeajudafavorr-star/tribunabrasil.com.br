import { Article, Category, User, Comment } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-brasil',
    name: 'Brasil',
    slug: 'brasil',
    color: '#DC2626',
    description: 'Notícias do Brasil, políticas públicas, decisões judiciais e cobertura nacional.',
    iconName: 'Flag',
    order: 1,
  },
  {
    id: 'cat-politica',
    name: 'Política',
    slug: 'politica',
    color: '#1E3A8A',
    description: 'Bastidores do Poder, Congresso Nacional, Palácio do Planalto e STF.',
    iconName: 'Landmark',
    order: 2,
  },
  {
    id: 'cat-economia',
    name: 'Economia',
    slug: 'economia',
    color: '#059669',
    description: 'Mercado financeiro, inflação, taxa Selic, empregos e finanças pessoais.',
    iconName: 'TrendingUp',
    order: 3,
  },
  {
    id: 'cat-tecnologia',
    name: 'Tecnologia',
    slug: 'tecnologia',
    color: '#4F46E5',
    description: 'Inovação, Inteligência Artificial, redes sociais, startups e gadgets.',
    iconName: 'Cpu',
    order: 4,
  },
  {
    id: 'cat-esportes',
    name: 'Esportes',
    slug: 'esportes',
    color: '#D97706',
    description: 'Futebol nacional e internacional, Basquete, F1, Olimpíadas e bastidores esportivos.',
    iconName: 'Trophy',
    order: 5,
  },
  {
    id: 'cat-entretenimento',
    name: 'Entretenimento',
    slug: 'entretenimento',
    color: '#9333EA',
    description: 'Famosos, cinema, séries, música, cultura e variedades.',
    iconName: 'Tv',
    order: 6,
  },
  {
    id: 'cat-mundo',
    name: 'Mundo',
    slug: 'mundo',
    color: '#0D9488',
    description: 'Notícias internacionais, geopolítica, diplomacia e acontecimentos globais.',
    iconName: 'Globe',
    order: 7,
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Carla Mendes',
    email: 'carla.mendes@tribunabrasil.com.br',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    role: 'reporter',
    bio: 'Repórter especial de Política e Judiciário em Brasília com mais de 12 anos de cobertura no Congresso e STF.',
    active: true,
    createdAt: '2024-01-15',
  },
  {
    id: 'user-2',
    name: 'Guilherme Santos',
    email: 'guilherme.santos@tribunabrasil.com.br',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    role: 'admin',
    bio: 'Editor-Chefe do portal. Especialista em jornalismo digital, dados e estratégia de conteúdo.',
    active: true,
    createdAt: '2023-11-01',
  },
  {
    id: 'user-3',
    name: 'Marcos Oliveira',
    email: 'marcos.oliveira@tribunabrasil.com.br',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    role: 'colunista',
    bio: 'Analista econômico e colunista. Escreve semanalmente sobre mercado financeiro e políticas monetárias.',
    active: true,
    createdAt: '2024-02-10',
  },
  {
    id: 'user-4',
    name: 'Juliana Lima',
    email: 'juliana.lima@tribunabrasil.com.br',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    role: 'editor',
    bio: 'Editora de Tecnologia e Ciência. Entusiasta de Inteligência Artificial e transformação digital.',
    active: true,
    createdAt: '2024-03-05',
  },
  {
    id: 'user-wsj',
    name: 'Correspondente Wall Street Journal',
    email: 'wsj.correspondent@tribunabrasil.com.br',
    avatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=200',
    role: 'colunista',
    bio: 'Correspondente Oficial de Notícias Internacionais do Wall Street Journal sincronizado via API.',
    active: true,
    createdAt: '2026-08-04',
  },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Lula sanciona lei que cria filtro de relevância para recursos no STJ',
    subtitle: 'Nova medida aprovada altera o Código de Processo Civil e visa reduzir a sobrecarga de processos no Superior Tribunal de Justiça, exigindo demonstração prévia de relevância jurídica.',
    slug: 'lula-sanciona-lei-que-cria-filtro-de-relevancia-para-recursos-no-stj',
    categoryId: 'cat-brasil',
    categoryName: 'Brasil',
    authorId: 'user-1',
    authorName: 'Carla Mendes',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200',
    imageCaption: 'Sede do Superior Tribunal de Justiça (STJ) na Esplanada dos Ministérios, em Brasília.',
    imageCredit: 'Fotos/Agência Brasil',
    excerpt: 'O presidente Luiz Inácio Lula da Silva sancionou nesta tarde a nova legislação que institui a exigência de relevância das questões de direito federal infraconstitucional para aceitação de recursos especiais pelo STJ.',
    content: `O presidente da República, Luiz Inácio Lula da Silva, sancionou sem vetos a legislação que institui o chamado "filtro de relevância" para a admissão de recursos especiais pelo Superior Tribunal de Justiça (STJ). A nova medida altera o Código de Processo Civil (CPC) e regulamenta a Emenda Constitucional nº 125.

A cerimônia de sanção ocorreu no Palácio do Planalto, acompanhada pelo presidente do STJ, por ministros do Supremo Tribunal Federal (STF) e lideranças do Congresso Nacional.

### O que muda no Superior Tribunal de Justiça?

A partir da promulgação da nova lei, o recorrente terá de demonstrar formalmente a relevância das questões de direito federal infraconstitucional discutidas no caso, para que o tribunal decida se admitirá ou não o recurso especial.

A exigência funciona de forma análoga à "repercussão geral" já adotada há anos pelo STF. A expectativa dos ministros da Corte é que a mudança reduza drasticamente o volume de ações triviais que chegam ao tribunal, acelerando o julgamento de grandes causas nacionais.

> "Esta é uma conquista histórica para a eficiência do sistema judiciário brasileiro. O STJ recebia anualmente mais de 400 mil novos processos. Com o filtro de relevância, os ministros poderão focar no papel pacificador de jurisprudência que a Constituição atribuiu à Corte", declarou o ministro presidente.

### Hipóteses presumidas de relevância

De acordo com o texto aprovado pelo Congresso e sancionado pelo Poder Executivo, a relevância da questão jurídica já será presumida nos seguintes casos:

1. Ações penais e processos de improbidade administrativa.
2. Ações cujo valor da causa ultrapasse 500 salários mínimos.
3. Ações que possam gerar inegibilidade de agentes públicos.
4. Hipóteses em que o acórdão recorrido contrariar jurisprudência dominante do STJ.
5. Outras situações expressamente previstas em lei federal.

Para que um recurso seja rejeitado por ausência de relevância jurídica, será necessário o voto da maioria absoluta dos membros do órgão julgador competente no STJ.

### Repercussão no meio jurídico e na sociedade

Entidades representativas da advocacia e juristas destacaram que a medida trará mais previsibilidade jurídica e incentivará a solução de conflitos nas instâncias estaduais e regionais. 

Representantes da Ordem dos Advogados do Brasil (OAB) enfatizaram a importância de garantir o amplo direito de defesa e defenderam que a aplicação do filtro seja transparente e fundamentada em cada acórdão expedido pela Corte Superior.

A nova legislação entra em vigor imediatamente após a sua publicação no Diário Oficial da União (DOU).`,
    publishedAt: '2026-08-04T14:30:00Z',
    status: 'published',
    isFeatured: true,
    isSecondary: false,
    isBreaking: true,
    views: 14820,
    shares: 890,
    tags: ['STJ', 'Lula', 'Judiciário', 'Legislação', 'Direito', 'Brasília'],
  },
  {
    id: 'art-2',
    title: 'Banco Central sinaliza novo corte de juros e Ibovespa renova máxima do ano',
    subtitle: 'Comitê de Política Monetária (Copom) destaca desaceleração da inflação e otimismo do mercado financeiro impulsiona ações de empresas brasileiras.',
    slug: 'banco-central-sinaliza-novo-corte-de-juros-e-ibovespa-renova-maxima',
    categoryId: 'cat-economia',
    categoryName: 'Economia',
    authorId: 'user-3',
    authorName: 'Marcos Oliveira',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200',
    imageCaption: 'Painel do mercado financeiro registrando valorização das ações brasileiras.',
    imageCredit: 'Reuters / Divulgação',
    excerpt: 'O Ibovespa fechou o pregão em alta expressiva impulsionado pela sinalização do Banco Central sobre novos cortes na taxa Selic nas próximas reuniões.',
    content: `O mercado financeiro reagiu com forte otimismo à ata divulgada pelo Comitê de Política Monetária (Copom) do Banco Central. O documento reforçou que o processo de ancoragem das expectativas de inflação tem se consolidado, abrindo espaço para a continuidade do ciclo de distensão monetária.

O índice Ibovespa registrou alta de 2,15%, atingindo a marca dos 136 mil pontos, impulsionado principalmente pelos setores bancário, de varejo e de construção civil.

### Análise dos Indicadores Econômicos

O dólar comercial operou em queda, cotado a R$ 5,38 no encerramento das negociações. Segundo analistas, a combinação de menor risco inflacionário interno com a perspectiva de corte de juros pelo Federal Reserve nos Estados Unidos favorece a entrada de capital estrangeiro no Brasil.

> "A clareza nas sinalizações do Banco Central traz segurança para investimentos de longo prazo e redução no custo de capital para o setor produtivo", avalia Marcos Oliveira, especialista em finanças públicas.

Especialistas preveem que a Selic poderá encerrar o ano em patamares ainda mais estimulantes para a atividade econômica.`,
    publishedAt: '2026-08-04T12:15:00Z',
    status: 'published',
    isFeatured: false,
    isSecondary: true,
    isBreaking: false,
    views: 9430,
    shares: 412,
    tags: ['Economia', 'Mercado Financeiro', 'Ibovespa', 'Selic', 'Banco Central'],
  },
  {
    id: 'art-3',
    title: 'Anatel aprova ampliação da faixa 5G Standalone para mais 120 municípios',
    subtitle: 'Decisão liberará frequência de 3,5 GHz para operadoras expandirem conectividade de ultravelocidade no interior do país.',
    slug: 'anatel-aprova-ampliacao-da-faixa-5g-standalone-para-mais-120-municipios',
    categoryId: 'cat-tecnologia',
    categoryName: 'Tecnologia',
    authorId: 'user-4',
    authorName: 'Juliana Lima',
    authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200',
    imageCaption: 'Infraestrutura de antenas e telecomunicações de alta tecnologia.',
    imageCredit: 'Unsplash / Getty Images',
    excerpt: 'Com a liberação do sinal limpo de 3,5 GHz pela Anatel, mais de 120 novas cidades brasileiras contarão com cobertura 5G de baixa latência a partir do próximo mês.',
    content: `A Agência Nacional de Telecomunicações (Anatel) aprovou a liberação da faixa de 3,5 GHz em mais 120 cidades brasileiras. A decisão abrange municípios com mais de 100 mil habitantes localizados no interior do Sul, Sudeste e Nordeste.

A liberação possibilita que prestadoras ativem as estações de quinta geração pura (Standalone), garantindo velocidades de download superiores a 1 Gbps e latência reduzida para indústrias, agricultura de precisão e usuários finais.

### Impacto na Indústria e Cidades Inteligentes

A expansão do 5G impulsionará aplicações de Inteligência Artificial das Coisas (AIoT), telemedicina em postos de saúde municipais e monitoramento de tráfego urbano em tempo real.

O conselho diretor da agência destacou que a migração da recepção parabólica tradicional para a banda Ku foi concluída com sucesso nesses municípios, evitando qualquer tipo de interferência no sinal.`,
    publishedAt: '2026-08-04T10:45:00Z',
    status: 'published',
    isFeatured: false,
    isSecondary: true,
    isBreaking: false,
    views: 7820,
    shares: 320,
    tags: ['Tecnologia', '5G', 'Anatel', 'Internet', 'Inovação'],
  },
  {
    id: 'art-4',
    title: 'Seleção Brasileira convoca novos talentos para clássico sul-americano',
    subtitle: 'Técnico aposta na renovação do ataque com jovens destaques do Brasileirão para o próximo confronto das Eliminatórias.',
    slug: 'selecao-brasileira-convoca-novos-talentos-para-classico-sul-americano',
    categoryId: 'cat-esportes',
    categoryName: 'Esportes',
    authorId: 'user-2',
    authorName: 'Guilherme Santos',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200',
    imageCaption: 'Estádio do Maracanã em dia de grande jogo da Seleção Brasileira.',
    imageCredit: 'CBF / Divulgação',
    excerpt: 'Em coletiva no auditório da CBF no Rio de Janeiro, a comissão técnica revelou a lista oficial de convocados com quatro estreantes promissores.',
    content: `A comissão técnica da Seleção Brasileira divulgou a lista de 23 atletas convocados para as duas próximas rodadas das Eliminatórias da Copa do Mundo. A grande novidade ficou por conta da inclusão de quatro jovens promessas que vêm se destacando no Campeonato Brasileiro e na Liga dos Campeões.

O primeiro jogo acontecerá no Estádio do Maracanã, com expectativa de casa cheia.

> "Buscamos o equilíbrio entre a experiência de atletas consolidados no futebol europeu e o dinamismo de jovens que estão jogando em altíssimo nível com gana de vencer", afirmou o treinador.`,
    publishedAt: '2026-08-04T09:00:00Z',
    status: 'published',
    isFeatured: false,
    isSecondary: false,
    isBreaking: false,
    views: 11200,
    shares: 610,
    tags: ['Esportes', 'Futebol', 'Seleção Brasileira', 'Maracanã', 'CBF'],
  },
  {
    id: 'art-5',
    title: 'SUS implementa triagem via IA e reduz tempo de atendimento em emergências',
    subtitle: 'Projeto piloto implantado em hospitais regionais otimizou a ordem de prioridade de exames e agilizou diagnósticos graves.',
    slug: 'sus-implementa-triagem-via-ia-e-reduz-tempo-de-atendimento',
    categoryId: 'cat-tecnologia',
    categoryName: 'Tecnologia',
    authorId: 'user-4',
    authorName: 'Juliana Lima',
    authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1200',
    imageCaption: 'Profissional de saúde utilizando prontuário eletrônico em hospital público.',
    imageCredit: 'Ministério da Saúde',
    excerpt: 'A adoção de algoritmos preditivos permitiu identificar precocemente casos complexos nas salas de urgência do Sistema Único de Saúde.',
    content: `Um projeto pioneiro de Inteligência Artificial aplicado à saúde pública trouxe resultados expressivos em unidades de pronto atendimento. O sistema analisa sintomas relatados e exames laboratoriais preliminares, alertando equipes médicas sobre riscos de complicação em segundos.

A taxa de diagnóstico precoce em casos de enfarte e sepse aumentou em 35% no primeiro trimestre de funcionamento do software.`,
    publishedAt: '2026-08-03T18:20:00Z',
    status: 'published',
    isFeatured: false,
    isSecondary: false,
    isBreaking: false,
    views: 6540,
    shares: 289,
    tags: ['Saúde', 'Tecnologia', 'SUS', 'IA', 'Ciência'],
  },
  {
    id: 'art-6',
    title: 'Festival Internacional de Brasília reunirá mais de 80 atrações culturais',
    subtitle: 'Evento gratuito na Esplanada dos Ministérios contará com shows musicais, mostras de cinema e feiras gastronômicas.',
    slug: 'festival-internacional-de-brasilia-reunira-mais-de-80-atracoes-culturais',
    categoryId: 'cat-entretenimento',
    categoryName: 'Entretenimento',
    authorId: 'user-2',
    authorName: 'Guilherme Santos',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200',
    imageCaption: 'Iluminação especial durante apresentação musical ao ar livre na capital.',
    imageCredit: 'Secretaria de Cultura do DF',
    excerpt: 'Programação de seis dias trará artistas de 15 países e diversidade artística para o coração da capital federal.',
    content: `Brasília se prepara para sediar a maior edição do Festival Internacional de Arte e Cultura. A estrutura montada na Esplanada dos Ministérios contará com quatro palcos simultâneos, praça de alimentação com pratos típicos regionais e oficinas interativas para crianças e adultos.

A entrada é inteiramente gratuita com retirada prévia de ingressos via aplicativo oficial.`,
    publishedAt: '2026-08-03T15:10:00Z',
    status: 'published',
    isFeatured: false,
    isSecondary: false,
    isBreaking: false,
    views: 5120,
    shares: 195,
    tags: ['Cultura', 'Brasília', 'Entretenimento', 'Música', 'Festival'],
  },
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comm-1',
    articleId: 'art-1',
    authorName: 'Dr. Roberto Silveira',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
    content: 'Excelente avanço para a segurança jurídica no país. O STJ não podia continuar funcionando como uma terceira instância recursal ordinária para pequenas disputas locais.',
    createdAt: '2026-08-04T15:10:00Z',
    likes: 24,
  },
  {
    id: 'comm-2',
    articleId: 'art-1',
    authorName: 'Mariana Castro',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
    content: 'Apenas espero que a OAB e o STJ mantenham a transparência nos motivos de recusa dos recursos, para não inviabilizar o direito de recorrer dos cidadãos comuns.',
    createdAt: '2026-08-04T15:45:00Z',
    likes: 18,
  },
  {
    id: 'comm-3',
    articleId: 'art-2',
    authorName: 'Fernando Alencar',
    content: 'Boa notícia para quem investe na economia real! Juros menores atrai negócios e gera empregos formais.',
    createdAt: '2026-08-04T13:00:00Z',
    likes: 12,
  },
];
