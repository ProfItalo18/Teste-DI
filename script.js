// ===== Build/version marker =====
const __MANAINSYS_VERSION = "20260107_01";
window.__MANAINSYS_VERSION = __MANAINSYS_VERSION;
console.log("Manain Sys script version:", __MANAINSYS_VERSION);

/* ================= FIREBASE (APP/DB/AUTH) ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query, 
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqvZkhe7ugV293d52vH20DX8ae4OiZ6o4",
  authDomain: "clinicasyscol1.firebaseapp.com",
  projectId: "clinicasyscol1",
  storageBucket: "clinicasyscol1.firebasestorage.app",
  messagingSenderId: "905378741588",
  appId: "1:905378741588:web:c32feb52f2e4a882589cc1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const nomeColecao = "pacientes";

/* ================= VARIÁVEIS GLOBAIS ================= */
let pacienteAtualId = ""; // ID do documento carregado (para atualizar/excluir)
let dados = { media: 0, valores: [], labels: [], teste: "" };
let chartInstance = null;

/* ================= EXPORTA FUNÇÕES PARA HTML ================= */
window.fazerLoginEmailSenha = fazerLoginEmailSenha;
window.criarContaEmailSenha = criarContaEmailSenha;
window.recuperarSenhaEmail = recuperarSenhaEmail;
window.enviarLinkRedefinirSenha = enviarLinkRedefinirSenha;

window.fazerLoginGoogle = fazerLoginGoogle;
window.fazerLogout = fazerLogout;

window.salvarPaciente = salvarPaciente;
window.carregarPacienteDoBanco = carregarPacienteDoBanco;
window.excluirPaciente = excluirPaciente;

window.atualizarRelatorio = atualizarRelatorio;
window.abrirChecklist = abrirChecklist;
window.salvarChecklist = salvarChecklist;
window.fecharChecklist = fecharChecklist;
window.resetarDadosTeste = resetarDadosTeste;

window.abrirModalCadastro = abrirModalCadastro;
window.fecharModalCadastro = fecharModalCadastro;
window.abrirModalRecuperarSenha = abrirModalRecuperarSenha;
window.fecharModalRecuperarSenha = fecharModalRecuperarSenha;


/* ================= LOGIN: MODAIS + LIMPEZA ================= */
let __keepEmailAfterCreate = false;

function limparCamposLogin(opts = {}) {
  const keepEmail = !!opts.keepEmail;

  const ids = ["emailLogin","senhaLogin","cadEmail","cadSenha","cadSenha2","recEmail"];
    ids.forEach((id) => {
    if (keepEmail && id === "emailLogin") return;
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const err = document.getElementById("loginError");
  if (err) err.textContent = "";

  const cadErr = document.getElementById("cadError");
  if (cadErr) cadErr.textContent = "";

  const recErr = document.getElementById("recError");
  if (recErr) recErr.textContent = "";
}

function abrirModalCadastro() {
  const modal = document.getElementById("modalCadastro");
  if (!modal) return;

  // reaproveita o e-mail digitado no login, se houver
  const emailBase = (document.getElementById("emailLogin")?.value || "").trim();
  const cadEmail = document.getElementById("cadEmail");
  if (cadEmail && emailBase && !cadEmail.value) cadEmail.value = emailBase;

  const cadErr = document.getElementById("cadError");
  if (cadErr) cadErr.textContent = "";

  modal.style.display = "flex";
  setTimeout(() => document.getElementById("cadEmail")?.focus(), 50);
}

function fecharModalCadastro() {
  const modal = document.getElementById("modalCadastro");
  if (!modal) return;
  modal.style.display = "none";
  // limpa apenas campos do modal
  ["cadEmail","cadSenha","cadSenha2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const cadErr = document.getElementById("cadError");
  if (cadErr) cadErr.textContent = "";
}

function abrirModalRecuperarSenha() {
  const modal = document.getElementById("modalRecuperarSenha");
  if (!modal) return;

  const emailBase = (document.getElementById("emailLogin")?.value || "").trim();
  const recEmail = document.getElementById("recEmail");
  if (recEmail && emailBase && !recEmail.value) recEmail.value = emailBase;

  const recErr = document.getElementById("recError");
  if (recErr) recErr.textContent = "";

  modal.style.display = "flex";
  setTimeout(() => document.getElementById("recEmail")?.focus(), 50);
}

function fecharModalRecuperarSenha() {
  const modal = document.getElementById("modalRecuperarSenha");
  if (!modal) return;
  modal.style.display = "none";
  const recEmail = document.getElementById("recEmail");
  if (recEmail) recEmail.value = "";
  const recErr = document.getElementById("recError");
  if (recErr) recErr.textContent = "";
}

// fecha modal ao clicar fora do card
document.addEventListener("click", (e) => {
  const m1 = document.getElementById("modalCadastro");
  if (m1 && m1.style.display === "flex" && e.target === m1) fecharModalCadastro();

  const m2 = document.getElementById("modalRecuperarSenha");
  if (m2 && m2.style.display === "flex" && e.target === m2) fecharModalRecuperarSenha();
});

/* ================= CHECKLISTS ================= */
const checklists = {
  wisc: [
    "Compreensão Verbal (Semelhanças, Vocabulário)",
    "Visuoespacial (Cubos, Quebra-cabeça)",
    "Raciocínio Fluido (Matrizes, Peso Figurado)",
    "Memória de Trabalho (Dígitos, Figuras)",
    "Velocidade de Processamento (Código, Procurar Símbolo)",
    "Aritmética / Raciocínio Quantitativo",
    "Retenção de Informação Auditiva"
  ],
  wais: [
    "Compreensão Verbal (Conhecimento Cristalizado)",
    "Organização Perceptual (Visuoespacial)",
    "Memória Operacional (Controle Atencional)",
    "Velocidade de Processamento (Psicomotor)",
    "Raciocínio Matricial (Inteligência Fluida)",
    "Aritmética e Cálculo Mental"
  ],
  sonr27: [
    "Mosaicos (Habilidade Espacial)",
    "Categorias (Abstração)",
    "Situações (Causa e Efeito)",
    "Padrões (Sequenciamento)",
    "Coordenação Visuomotora Fina"
  ],
  sonr640: [
    "Analogias (Pensamento Abstrato)",
    "Mosaicos (Planejamento)",
    "Categorias (Classificação Semântica)",
    "Situações (Inteligência Prática)",
    "Flexibilidade Cognitiva"
  ],
  raven: [
    "Série A (Discriminação Perceptual)",
    "Série B (Analogia Concreta)",
    "Série C (Padrões Progressivos)",
    "Série D (Decomposição de Figuras)",
    "Série E (Abstração Superior)"
  ],
  abas: [
    "Comunicação Funcional",
    "Uso de Recursos Comunitários",
    "Habilidades Acadêmicas",
    "Vida Doméstica e Autocuidado",
    "Saúde e Segurança",
    "Lazer e Socialização",
    "Autodireção e Escolha",
    "Social",
    "Motor"
  ],
  vinhais: [
    "Comunicação Receptiva/Expressiva",
    "Habilidades Sociais e Empatia",
    "Cuidados Pessoais (Higiene/Vestuário)",
    "Vida Doméstica e Tarefas",
    "Independência na Comunidade",
    "Trabalho e Ocupação",
    "Lazer e Recreação"
  ]
};

/* ================= TEXTOS PADRÕES ================= */
const textosPadrao = {
    wisc: {
        motivo: `A Avaliação Neuropsicológica constitui um procedimento de investigação clínica complexo, sistemático e minucioso, cujo objetivo primordial transcende a mera aplicação de testes psicométricos isolados. Este processo visa mapear, de forma abrangente, o funcionamento cognitivo, comportamental e emocional do indivíduo, correlacionando o desempenho obtido com a integridade funcional do Sistema Nervoso Central (SNC). No presente caso, a solicitação deste psicodiagnóstico fundamenta-se na necessidade clínica imperativa de investigar a etiologia das queixas funcionais relatadas na anamnese, diferenciando se tais manifestações possuem origem pedagógica, emocional, ambiental ou se configuram um transtorno do neurodesenvolvimento de base biológica.

Para atender a esta demanda com o rigor científico necessário, optou-se pela seleção e aplicação da Escala de Inteligência WISC-IV (Wechsler Intelligence Scale for Children), instrumento reconhecido internacionalmente pela comunidade científica como padrão-ouro para a mensuração do potencial cognitivo em crianças e adolescentes. A escolha técnica deste teste justifica-se por suas robustas qualidades psicométricas de validade (capacidade de medir o que se propõe) e fidedignidade (consistência dos resultados ao longo do tempo). O instrumento permite uma análise fatorial detalhada não apenas do Quociente de Inteligência Total (QIT), mas das discrepâncias sutis entre os índices de Compreensão Verbal (ICV), Raciocínio Perceptual (IRP), Memória Operacional (IMO) e Velocidade de Processamento (IVP).

Ressalta-se que a aplicação deste protocolo obedeceu rigorosamente às normativas vigentes do Conselho Federal de Psicologia (CFP) e aos padrões internacionais de testagem (ITC). O procedimento ocorreu em ambiente controlado, livre de distratores visuais e auditivos, sob condições ideais de iluminação e ventilação, visando garantir que o desempenho obtido reflita, com a maior precisão possível, a capacidade real do avaliando. A análise aqui proposta integra dados quantitativos a observações qualitativas da conduta, como tolerância à frustração, persistência na tarefa, estratégias metacognitivas utilizadas para a resolução de problemas e o nível de esforço mental dispendido durante a execução das tarefas.`,
        
        analise: `A análise aprofundada dos dados quantitativos, convertidos em escores ponderados e comparados à tabela normativa correspondente à idade cronológica, revela um perfil neuropsicológico que exige atenção detalhada e intervenção específica. Conforme ilustrado na Figura 1 (Gráfico Comparativo de Desempenho), a linha azul traça a trajetória das habilidades do paciente, permitindo visualizar tanto os picos de competência quanto os vales de dificuldade em relação à média esperada (linha tracejada de base normativa).

O funcionamento intelectual global apresentou-se [DESEMPENHO], porém, a análise qualitativa dos subtestes aponta para uma heterogeneidade cognitiva significativa. Observou-se que as funções de raciocínio cristalizado (dependentes de aprendizado prévio, vocabulário e cultura) e habilidades visuoespaciais mostram-se [DESEMPENHO2]. No entanto, é crucial destacar o impacto das Funções Executivas e da Memória Operacional neste perfil. O gráfico evidencia oscilações importantes nas tarefas que exigem controle inibitório, flexibilidade mental e retenção de informações. Tais "gaps" funcionais sugerem que o paciente, embora possa compreender conceitos complexos, falha na sustentação da atenção e na manipulação mental de dados, o que gera fadiga cognitiva precoce e inconsistência no rendimento escolar.

Adicionalmente, a análise da Velocidade de Processamento indicou uma eficiência neurológica [DESEMPENHO3]. Na prática, isso significa que o tempo que o paciente leva para decodificar, processar e emitir uma resposta pode ser incompatível com a demanda do ambiente escolar tradicional, gerando a falsa impressão de desinteresse ou incapacidade. As falhas observadas não parecem decorrer de falta de conhecimento, mas sim de uma dificuldade no "output" (saída) e na organização sequencial do pensamento. Este perfil disexecutivo impacta diretamente a autonomia, exigindo supervisão constante para tarefas que crianças da mesma idade realizariam de forma independente.`,
        
        conclusao: `Diante da integração exaustiva dos dados de anamnese, das observações clínicas comportamentais durante as sessões e dos resultados psicométricos quantitativos e qualitativos aqui expostos, conclui-se que o perfil neuropsicológico do examinando é compatível com a hipótese diagnóstica de [HIPOTESE].

É fundamental ressaltar que este diagnóstico não constitui uma sentença de incapacidade estática, mas sim um descritor clínico funcional que serve para orientar a rede de apoio sobre o nível de exigência e o tipo de suporte que o indivíduo necessita. O cérebro em desenvolvimento possui neuroplasticidade, e o prognóstico é considerado [RESULTADO], estando diretamente condicionado à precocidade, consistência e qualidade das intervenções multidisciplinares implementadas. Sem o suporte adequado, há risco de agravamento das defasagens e surgimento de prejuízos secundários na saúde mental, como ansiedade de desempenho e baixa autoestima. Contudo, com as adaptações curriculares e ambientais sugeridas, vislumbra-se um potencial significativo de ganho de autonomia e funcionalidade social.`
    },
    
    wais: {
        motivo: `A avaliação neuropsicológica em adultos é uma ferramenta clínica essencial e refinada para compreender o funcionamento cerebral e suas implicações na vida cotidiana, laboral e acadêmica. Diferente da avaliação infantil, que foca no desenvolvimento, esta investigação busca mensurar a eficiência atual dos processos mentais, identificando se eventuais declínios, lentificações ou dificuldades possuem origem neurobiológica, psiquiátrica, medicamentosa ou ambiental. O processo avaliativo considera a história de vida, a escolaridade e a reserva cognitiva do indivíduo como fatores moderadores do desempenho.

Para este estudo de caso, selecionou-se a Escala de Inteligência WAIS (Wechsler Adult Intelligence Scale), instrumento de referência mundial para a mensuração da inteligência e das funções executivas em adultos. A escolha técnica baseia-se na capacidade do teste de dissociar habilidades verbais (inteligência cristalizada) de habilidades de execução (inteligência fluida), permitindo investigar não apenas o "quanto" o indivíduo sabe, mas "como" ele processa novas informações e resolve problemas inéditos. O protocolo avalia domínios críticos como Compreensão Verbal, Organização Perceptual, Memória de Trabalho e Velocidade de Processamento, fundamentais para a autonomia, gestão financeira e tomada de decisão. A aplicação seguiu rigorosamente os padrões éticos e técnicos, garantindo a fidedignidade e validade ecológica dos resultados apresentados.`,
        
        analise: `Os resultados obtidos, após a devida conversão para escores padronizados e análise estatística rigorosa, delineiam um perfil cognitivo com características específicas que impactam a funcionalidade diária do examinando. Ao observarmos a representação gráfica (Figura 1), nota-se a distância vetorial entre o desempenho do paciente (linha azul) e o esperado para sua faixa etária e nível de escolaridade (linha cinza).

O Índice de Compreensão Verbal e conhecimento acumulado apresentou-se [DESEMPENHO], o que sugere que as redes neurais responsáveis pelo armazenamento de informações de longo prazo, vocabulário e julgamento social estão preservadas. Contudo, ao analisarmos os índices de Eficiência Cognitiva (Memória Operacional e Velocidade de Processamento), identificamos um padrão [DESEMPENHO2]. Esta discrepância interna (intra-individual) sugere que o paciente possui o potencial intelectual latente, mas encontra "gargalos" no momento de expressar essa inteligência sob pressão de tempo ou em tarefas multimodais que exigem divisão atencional.

Clinicamente, esses resultados correlacionam-se fortemente com as queixas de dificuldade de organização, procrastinação, perda de prazos e esquecimentos frequentes relatadas na entrevista inicial. A análise qualitativa indicou que, diante de tarefas complexas e não estruturadas, o paciente tende a perder o foco ou utilizar estratégias de resolução de problemas pouco eficientes (tentativa e erro), o que gera sobrecarga mental, fadiga e ansiedade de desempenho. Não foram observados sinais sugestivos de processos demenciais degenerativos primários neste momento, mas sim um perfil funcional disexecutivo que requer reabilitação e estratégias compensatórias.`,
        
        conclusao: `A síntese dos achados neuropsicológicos, interpretada à luz da história clínica, ocupacional e social do paciente, permite concluir que o perfil atual é compatível com a hipótese diagnóstica de [HIPOTESE].

Este quadro clínico não deve ser interpretado necessariamente como uma incapacidade laborativa total, mas indica a necessidade premente de adaptações ergonômicas cognitivas no ambiente de trabalho e estudo. O prognóstico funcional é [RESULTADO], dependendo diretamente da adesão às estratégias compensatórias sugeridas e do manejo das comorbidades emocionais. A neuroplasticidade, embora mais intensa na infância, permanece ativa na vida adulta, permitindo o aprendizado de novas rotas neurais e a otimização de recursos cognitivos através de treino sistemático. O acompanhamento longitudinal é recomendado para monitorar a evolução do quadro.`
    },

    sonr27: {
        motivo: `A avaliação do desenvolvimento cognitivo na primeira infância, especialmente em casos complexos onde há atraso na aquisição da linguagem, suspeita de Transtorno do Espectro Autista (TEA), surdez ou timidez excessiva, impõe desafios técnicos significativos ao avaliador. Testes tradicionais dependentes da fala podem subestimar drasticamente o potencial da criança, confundindo uma dificuldade de expressão verbal com um déficit intelectual global, o que levaria a condutas terapêuticas inadequadas.

Por esta razão técnica, a avaliação foi conduzida utilizando o Teste Não-Verbal de Inteligência SON-R 2½-7 [a]. Este instrumento é reconhecido internacionalmente por sua "cultural fairness" (justiça cultural) e pela ausência de demanda verbal, tanto na instrução quanto na resposta. O objetivo primordial foi acessar a inteligência fluida pura (Fator G), ou seja, a capacidade da criança de resolver problemas novos, entender relações de causa e efeito e categorizar o mundo visualmente, independentemente de sua capacidade de falar ou ouvir. A aplicação ocorreu de forma lúdica, flexível e adaptada, visando manter o engajamento, o vínculo e a motivação da criança durante todo o processo avaliativo.`,
        
        analise: `A análise do desempenho da criança no SON-R fornece dados valiosos e fidedignos sobre a integridade de seu raciocínio lógico e potencial de aprendizado. Conforme demonstrado no gráfico anexo (Figura 1), a curva de desempenho (linha azul) foi comparada com o desenvolvimento típico esperado para a idade cronológica exata (linha cinza de referência).

O resultado global situou-se em um nível [DESEMPENHO]. Ao dissecarmos as habilidades específicas, notamos que nas tarefas de raciocínio espacial e concreto (Subtestes de Mosaicos e Padrões), a criança demonstrou [DESEMPENHO2]. Isso indica que a via visual de processamento de informações está funcional e preservada, permitindo que a criança aprenda por observação, imitação e modelagem. Entretanto, nas tarefas que exigem maior nível de abstração, simbolismo e flexibilidade cognitiva (Subtestes de Categorias e Situações), observou-se maior dificuldade e necessidade de mediação.

Qualitativamente, notou-se que a criança beneficia-se significativamente de pistas visuais, demonstração prática e estruturação do ambiente, o que é um indicador prognóstico fundamental para a escolha de métodos pedagógicos e terapêuticos. As dificuldades encontradas parecem estar mais relacionadas à rigidez de pensamento, desatenção ou falhas no processamento sequencial do que a uma incapacidade estrutural de raciocínio, sugerindo que o potencial latente é superior ao desempenho manifesto atual, desde que a via de entrada da informação seja visual e concreta.`,
        
        conclusao: `Conclui-se, a partir da análise dos dados não-verbais, que o funcionamento intelectual do examinando encontra-se classificado como [HIPOTESE].

Este dado é crucial para o diagnóstico diferencial, pois permite afastar (ou confirmar) a hipótese de Deficiência Intelectual global, apontando para questões mais específicas de linguagem, interação social ou processamento sensorial. O prognóstico é favorável e [RESULTADO], visto que a criança demonstra permeabilidade à intervenção visual e capacidade de aprendizado quando o canal de comunicação é adequado às suas necessidades. A intervenção precoce é o fator determinante para minimizar o impacto das dificuldades atuais na vida futura da criança, devendo ser iniciada imediatamente.`
    },

    abas: {
        motivo: `A avaliação contemporânea e ética dos transtornos do neurodesenvolvimento (como a Deficiência Intelectual e o TEA) não se baseia mais exclusivamente no QI. Os manuais diagnósticos atuais de referência mundial (DSM-5-TR e CID-11) exigem a investigação rigorosa do Comportamento Adaptativo, definido como a eficácia e a autonomia com que o indivíduo atende aos padrões de independência pessoal e responsabilidade social esperados para sua idade e grupo cultural.

Utilizou-se para este fim o Sistema de Avaliação do Comportamento Adaptativo (ABAS-3), uma escala padronizada e validada que investiga três domínios maiores: Conceitual (comunicação, habilidades acadêmicas, autodireção), Social (lazer, interação) e Prático (autocuidado, vida doméstica, saúde, segurança, uso da comunidade). Esta ferramenta permite mensurar não o que o paciente é "capaz" de fazer em um ambiente de teste controlado (capacidade máxima), mas o que ele efetivamente "faz" no seu dia a dia (performance típica). O objetivo central é identificar o Nível de Suporte necessário (Leve, Moderado, Grave ou Profundo) para que o indivíduo funcione na sociedade com dignidade, segurança e qualidade de vida.`,
        
        analise: `A análise detalhada dos domínios adaptativos revela informações cruciais sobre a funcionalidade real e a autonomia do paciente. O Gráfico de Habilidades Adaptativas (Figura 1) ilustra de forma clara as discrepâncias entre as demandas do ambiente e a resposta comportamental do avaliando. O Índice Geral de Adaptação (IGA) situou-se na faixa [DESEMPENHO], indicando o grau de eficácia na resposta às exigências cotidianas.

Ao analisarmos os subdomínios, observamos que as Habilidades Práticas (autocuidado, uso de recursos comunitários, saúde e segurança) apresentaram-se [DESEMPENHO2]. Isso sugere que o paciente possui dependência significativa de terceiros para atividades instrumentais da vida diária, como higiene pessoal, vestuário, alimentação ou locomoção independente. Já no domínio Social e de Lazer, notou-se um repertório restrito, indicando dificuldades na leitura de normas sociais implícitas, na manutenção de interações recíprocas e no uso construtivo do tempo livre.

A discrepância entre o potencial cognitivo (medido pelo QI) e o comportamento adaptativo é um marcador clínico importante. Neste caso, a "idade adaptativa" mostra-se inferior à idade cronológica e mental, o que justifica a necessidade de supervisão constante. O perfil indica vulnerabilidade social, ingenuidade e dificuldade em antecipar consequências de longo prazo de suas ações, exigindo uma rede de proteção ativa e treinamentos específicos de habilidades de vida.`,
        
        conclusao: `Os resultados obtidos através da escala adaptativa, corroborados pela entrevista de anamnese, são compatíveis com um diagnóstico funcional de [HIPOTESE].

Evidencia-se a necessidade de um Nível de Suporte [RESULTADO] (variando de Intermitente a Substancial) para as atividades da vida civil e prática. É imperativo compreender que a autonomia, neste perfil neuropsicológico, deve ser ensinada de forma explícita, visual, repetitiva e sistemática; ela não surge espontaneamente apenas com o amadurecimento biológico. O foco da intervenção deve transitar da "reabilitação de déficits" para a "construção de funcionalidade", visando a máxima independência possível dentro das limitações constitucionais do indivíduo.`
    },

    raven: {
        motivo: `A avaliação da inteligência fluida através das Matrizes Progressivas de Raven constitui um método clássico, robusto e universal para acessar o Fator G (Inteligência Geral) livre de influências culturais, educacionais e linguísticas. O teste avalia a capacidade edutiva, ou seja, a habilidade de extrair sentido de uma confusão visual, identificar padrões não óbvios, gerar novos insights lógicos e gerenciar variáveis simultâneas. É o instrumento ideal para triagem cognitiva rápida e eficaz, permitindo identificar potenciais intelectuais mesmo em indivíduos com dificuldades verbais significativas, barreiras educacionais ou questões motoras que impeçam a execução de outros testes.`,
        analise: `O desempenho quantitativo e qualitativo no teste de Matrizes Progressivas indica uma capacidade de raciocínio lógico [DESEMPENHO]. O paciente foi capaz de identificar padrões visuais simples, realizar analogias concretas e completar gestalt, demonstrando preservação da percepção visual básica e da organização espacial. Porém, demonstrou dificuldades significativas em séries que exigiam raciocínio abstrato superior (Séries D e E), decomposição de figuras complexas e manipulação mental de múltiplas variáveis simultâneas. O tempo de execução e a estratégia de tentativa e erro observados sugerem um estilo cognitivo impulsivo, com dificuldade em planejar a resposta e inibir distratores antes da ação.`,
        conclusao: `O perfil obtido é compatível com um potencial intelectual classificado como [HIPOTESE]. Sugere-se fortemente a complementação com testes específicos de funções executivas, memória e linguagem para um panorama neuropsicológico completo, visto que o Raven avalia apenas uma faceta da inteligência (fluida não-verbal). O prognóstico de aprendizado é [RESULTADO] para tarefas que envolvam lógica visual e aprendizagem mecânica, exigindo maior suporte e adaptação em tarefas que dependam exclusivamente de processamento verbal abstrato.`
    },
    
    vinhais: {
        motivo: `A Escala de Comportamento Adaptativo Vinhais-3 é um instrumento nacional fundamental e ecologicamente válido para mapear o grau de independência do indivíduo em seu contexto real de vida (casa, escola e comunidade). Avalia-se a competência social, a comunicação funcional e as habilidades de vida diária, fornecendo dados sobre como o paciente aplica seus recursos cognitivos na realidade prática. O foco da avaliação não é o desempenho máximo (o que ele consegue fazer sob pressão), mas o desempenho típico (o que ele realmente faz) em situações do cotidiano, permitindo planejar intervenções que visem a autonomia possível e a redução da sobrecarga do cuidador.`,
        analise: `Os resultados indicam um funcionamento adaptativo geral [DESEMPENHO]. As áreas de maior prejuízo funcional envolvem a socialização e a comunicação expressiva, onde o paciente demonstra passividade, isolamento ou inadequação na iniciação de contatos. Por outro lado, as habilidades de autocuidado básico (alimentação e higiene simples) mostram-se relativamente preservadas, embora ainda exijam lembretes verbais frequentes para serem iniciadas ou concluídas com qualidade. O paciente necessita de mediação constante de um adulto para resolver conflitos interpessoais, gerir seu dinheiro e organizar sua rotina de forma autônoma, apresentando dificuldade acentuada em se adaptar a mudanças imprevistas no ambiente.`,
        conclusao: `Conclui-se pela necessidade de suporte e supervisão [HIPOTESE] nas atividades cotidianas. O prognóstico de independência é [RESULTADO], demandando treino intensivo de habilidades sociais (THS) e inclusão em grupos terapêuticos para modelagem de comportamento adequado. A família deve ser orientada a fornecer oportunidades de escolha controlada para fomentar a autodeterminação, reduzindo gradualmente a assistência física e verbal conforme a aquisição de competências.`
    },
    
    sonr640: {
         motivo: `O SON-R 6-40 é um teste de inteligência não-verbal de alto padrão, desenhado especificamente para crianças mais velhas, adolescentes e adultos, permitindo a avaliação fidedigna de raciocínio fluido e espacial sem a barreira da linguagem. É uma ferramenta essencial para diagnósticos diferenciais em populações com dificuldades de comunicação, surdez, TEA ou background cultural diverso, garantindo que o potencial cognitivo real não seja mascarado por déficits linguísticos ou educacionais. O teste avalia quatro domínios principais: Analogias, Mosaicos, Categorias e Situações, cobrindo raciocínio abstrato, concreto e espacial.`,
         analise: `O desempenho do examinando revelou habilidades de raciocínio [DESEMPENHO]. A análise detalhada das subprovas de Analogias e Categorias sugere uma boa capacidade de abstração e formação de conceitos quando o suporte visual está presente. Entretanto, as provas de Mosaicos e Situações indicaram dificuldades no planejamento executivo, organização visuoespacial e sequenciamento temporal, sugerindo lentidão no processamento e dificuldade em decompor o todo em partes. O perfil sugere um funcionamento mental preservado em termos de lógica, mas com falhas na execução prática, na velocidade psicomotora e na flexibilidade cognitiva diante de erros.`,
         conclusao: `O perfil cognitivo não-verbal apresenta-se compatível com [HIPOTESE]. O prognóstico para desenvolvimento de habilidades práticas é [RESULTADO]. Indica-se intervenção psicopedagógica e neuropsicológica focada em estratégias de organização e planejamento (funções executivas), visando otimizar o potencial intelectual identificado. O uso de mapas mentais, cronogramas e organizadores visuais será de grande valia para o aprendizado de novos conteúdos acadêmicos ou laborais.`
    }
};
/* ================= AUTH ================= */

/* ================= AUTH: E-MAIL/SENHA (LOGIN/CADASTRO/RECUPERAÇÃO) ================= */
function traduzirErroAuth(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-password": "Informe a senha.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "Senha fraca (mínimo 6 caracteres).",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/invalid-credential": "Credenciais inválidas. Verifique e-mail e senha (ou crie a conta)."
  };
  return map[code] || "Erro de autenticação. Tente novamente.";
}

async function fazerLoginEmailSenha() {
  const errEl = document.getElementById("loginError");
  if (errEl) errEl.textContent = "";

  const email = (document.getElementById("emailLogin")?.value || "").trim();
  const senha = document.getElementById("senhaLogin")?.value || "";

  if (!email || !senha) {
    if (errEl) errEl.textContent = "Preencha e-mail e senha.";
    return;
  }

  try {
    // evita conflito quando o usuário alterna métodos de login
    if (auth.currentUser) await signOut(auth);

    await signInWithEmailAndPassword(auth, email, senha);
    limparCamposLogin();
  } catch (e) {
    console.error("LOGIN EMAIL ERRO:", e);
    if (errEl) errEl.textContent = traduzirErroAuth(e.code);
    else alert(traduzirErroAuth(e.code));
  }
}

async function criarContaEmailSenha() {

  // este fluxo acontece pelo MODAL "Criar conta"
  const errEl = document.getElementById("cadError");
  if (errEl) errEl.textContent = "";

  const email = (document.getElementById("cadEmail")?.value || "").trim();
  const senha = document.getElementById("cadSenha")?.value || "";
  const senha2 = document.getElementById("cadSenha2")?.value || "";

  if (!email || !senha || !senha2) {
    if (errEl) errEl.textContent = "Preencha e-mail e senha.";
    return;
  }
  if (senha.length < 6) {
    if (errEl) errEl.textContent = "A senha deve ter no mínimo 6 caracteres.";
    return;
  }
  if (senha !== senha2) {
    if (errEl) errEl.textContent = "As senhas não coincidem.";
    return;
  }

  try {
    // evita conflito quando o usuário alterna métodos de login
    if (auth.currentUser) await signOut(auth);

    // cria a conta (Firebase normalmente loga automaticamente)
    await createUserWithEmailAndPassword(auth, email, senha);

    // ✅ você pediu: voltar para a tela de login para o usuário entrar manualmente
    __keepEmailAfterCreate = true; // preserva o e-mail digitado ao "voltar"
    await signOut(auth);           // sai imediatamente (mantém conta criada)

    // fecha modal e preenche e-mail no login
    fecharModalCadastro();
    const emailLogin = document.getElementById("emailLogin");
    if (emailLogin) emailLogin.value = email;

    // limpa só senha do login
    const senhaLogin = document.getElementById("senhaLogin");
    if (senhaLogin) senhaLogin.value = "";

    // mensagem na tela de login
    const loginErr = document.getElementById("loginError");
    if (loginErr) loginErr.textContent = "Conta criada com sucesso. Agora faça login.";

    // garante foco no campo de senha
    setTimeout(() => document.getElementById("senhaLogin")?.focus(), 80);
  } catch (e) {
    console.error("CRIAR CONTA ERRO:", e);
    if (errEl) errEl.textContent = traduzirErroAuth(e.code);
    else alert(traduzirErroAuth(e.code));
  }

}

async function recuperarSenhaEmail() {

  // este fluxo agora acontece pelo MODAL "Recuperar senha"
  const errEl = document.getElementById("recError");
  if (errEl) errEl.textContent = "";

  const email = (document.getElementById("recEmail")?.value || "").trim();
  if (!email) {
    if (errEl) errEl.textContent = "Informe o e-mail para recuperação.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    if (errEl) errEl.textContent = "Link enviado. Verifique sua caixa de entrada.";

    // limpa e fecha
    setTimeout(() => {
      fecharModalRecuperarSenha();
      limparCamposLogin();
    }, 400);
  } catch (e) {
    console.error("RECUPERAR SENHA ERRO:", e);
    if (errEl) errEl.textContent = traduzirErroAuth(e.code);
    else alert(traduzirErroAuth(e.code));
  }

}

/* Botão “Alterar senha” (usuário faz sozinho via e-mail) */
async function enviarLinkRedefinirSenha() {
  if (!auth.currentUser || !auth.currentUser.email) {
    alert("Você precisa estar logado para alterar a senha.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, auth.currentUser.email);
    alert("Enviamos um link de alteração de senha para o seu e-mail.");
  } catch (e) {
    alert(traduzirErroAuth(e.code));
  }
}

async function fazerLoginGoogle() {
  const errEl = document.getElementById("loginError");
  if (errEl) errEl.textContent = "";

  try {
    await signInWithPopup(auth, provider);
    limparCamposLogin();
  } catch (err) {
    console.error("LOGIN ERRO:", err.code, err.message);
    if (errEl) errEl.textContent = `Erro: ${err.message}`;
  }
}

async function fazerLogout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("LOGOUT ERRO:", err.code, err.message);
    alert(`Erro ao sair: ${err.message}`);
  }
}

function exigirLogin() {
  if (!auth.currentUser) {
    alert("Você precisa estar logado para salvar/excluir.");
    return false;
  }
  return true;
}

/* ================= CONTROLE DE TELA (LOGIN x APP) ================= */
onAuthStateChanged(auth, async (user) => {
  const overlay = document.getElementById("loginOverlay");
  const appMain = document.getElementById("appPrincipal");
  const badge = document.getElementById("userBadge");

  if (!overlay || !appMain) return;

  if (user) {
    limparCamposLogin();
    overlay.style.display = "none";
    appMain.style.display = "flex";
    if (badge) badge.textContent = user.email || user.displayName || "Logado";

    // ao logar, carrega lista
    try {
      await carregarListaPacientes();
    } catch (e) {
      console.error('Falha ao carregar lista após login:', e);
    }
  } else {
    limparCamposLogin({ keepEmail: __keepEmailAfterCreate });
    __keepEmailAfterCreate = false;
    overlay.style.display = "flex";
    appMain.style.display = "none";
    if (badge) badge.textContent = "—";

    // limpa tudo
    pacienteAtualId = "";
    limparCamposAposSalvar();
    limparSelect();
  }
});

/* ================= FIRESTORE: LISTAR/SALVAR/CARREGAR/EXCLUIR ================= */
function limparSelect() {
  const select = document.getElementById("listaPacientesSalvos");
  if (!select) return;
  select.innerHTML = '<option value="">Carregar Paciente...</option>';
}

async function carregarListaPacientes() {
  if (!exigirLogin()) return;
  // ✅ Evita listar enquanto o overlay de login ainda está visível (troca de sessão/token)
  const overlay = document.getElementById("loginOverlay");
  if (overlay && overlay.style.display !== "none") return;


  const select = document.getElementById("listaPacientesSalvos");
  const status = document.getElementById("statusCheck");
  if (!select) return;

  select.innerHTML = '<option value="">Carregar Paciente...</option>';

  try {
    // lista TODOS os registros (qualquer usuário autenticado)
    const q = query(
      collection(db, nomeColecao),
      orderBy("updatedAt", "desc")
    );

    const snap = await getDocs(q);

    snap.forEach((d) => {
      const p = d.data();
      const dataP = p?.dataAplicacao ? ` (${formatarData(p.dataAplicacao)})` : "";
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.text = (p?.nome || "Sem nome") + dataP;
      select.add(opt);
    });

    if (status) status.innerText = `Registros: ${snap.size}`;
  } catch (e) {
    console.error("LISTAR ERRO:", e.code, e.message, e);
    if (status) status.innerText = `Erro ao listar: ${e.code || ""}`;
    alert(`Erro ao listar: ${e.code || ""} ${e.message || ""}`);
  }
}

async function salvarPaciente() {
  if (!exigirLogin()) return;

  const nome = (document.getElementById("nomePaciente")?.value || "").trim();
  if (!nome) return alert("Digite o nome do paciente!");

  const status = document.getElementById("statusCheck");

  // IMPORTANTÍSSIMO: uid precisa existir por causa das Rules
  const payload = {
    uid: auth.currentUser.uid,
    nome,
    nascimento: document.getElementById("dataNasc")?.value || "",
    dataAplicacao: document.getElementById("dataAplicacao")?.value || "",
    testeSelecionado: document.getElementById("testeSelecionado")?.value || "",
    analise1: document.getElementById("viewAnalise1")?.innerText || "",
    analise2: document.getElementById("viewAnalise2")?.innerText || "",
    conclusao: document.getElementById("viewConclusao")?.innerText || "",
    encaminhamentos: document.getElementById("viewEncaminhamentos")?.innerText || "",
    checklistData: dados || { media: 0, valores: [], labels: [], teste: "" },
    updatedAt: serverTimestamp()
  };

  try {
    if (pacienteAtualId) {
      // update
      await updateDoc(doc(db, nomeColecao, pacienteAtualId), payload);
      alert("Paciente atualizado com sucesso!");
    } else {
      // create
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, nomeColecao), payload);
      alert("Paciente salvo com sucesso!");
    }

    pacienteAtualId = "";
    if (status) status.innerText = "Salvo com sucesso!";
    await carregarListaPacientes();
    limparCamposAposSalvar();
  } catch (e) {
    console.error("SALVAR ERRO:", e.code, e.message, e);
    if (status) status.innerText = `Erro ao salvar: ${e.code || ""}`;
    alert(`Erro ao salvar: ${e.code || ""} ${e.message || ""}`);
  }
}

async function carregarPacienteDoBanco() {
  if (!exigirLogin()) return;

  const id = document.getElementById("listaPacientesSalvos")?.value;
  if (!id) return;

  const status = document.getElementById("statusCheck");
  pacienteAtualId = id;

  try {
    const ref = doc(db, nomeColecao, id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("Registro não encontrado.");
      pacienteAtualId = "";
      return;
    }

    const paciente = snap.data();
    document.getElementById("nomePaciente").value = paciente.nome || "";
    document.getElementById("dataNasc").value = paciente.nascimento || "";
    document.getElementById("dataAplicacao").value = paciente.dataAplicacao || "";
    document.getElementById("testeSelecionado").value = paciente.testeSelecionado || "";

    document.getElementById("viewAnalise1").innerHTML = `<p>${(paciente.analise1 || "").replace(/\n/g, "</p><p>")}</p>`;
    document.getElementById("viewAnalise2").innerHTML = `<p>${(paciente.analise2 || "").replace(/\n/g, "</p><p>")}</p>`;
    document.getElementById("viewConclusao").innerHTML = `<p>${(paciente.conclusao || "").replace(/\n/g, "</p><p>")}</p>`;
    document.getElementById("viewEncaminhamentos").innerHTML = `<p>${(paciente.encaminhamentos || "").replace(/\n/g, "</p><p>")}</p>`;

    if (paciente.checklistData?.valores?.length) {
      dados = paciente.checklistData;
      atualizarGrafico();
      if (status) status.innerText = `Carregado. Média: ${dados.media}`;
    } else {
      if (status) status.innerText = "Carregado.";
    }

    atualizarRelatorio();
  } catch (e) {
    console.error("CARREGAR ERRO:", e.code, e.message, e);
    alert(`Erro ao carregar: ${e.code || ""} ${e.message || ""}`);
  }
}

async function excluirPaciente() {
  if (!exigirLogin()) return;

  const id = pacienteAtualId || document.getElementById("listaPacientesSalvos")?.value;
  if (!id) return alert("Selecione um paciente para excluir.");

  if (!confirm("Tem certeza que deseja excluir este registro?")) return;

  const status = document.getElementById("statusCheck");

  try {
    // valida ownership antes de excluir (regras também validam, mas aqui fica claro)
    const snap = await getDoc(doc(db, nomeColecao, id));
    if (!snap.exists()) return alert("Registro não encontrado.");
    await deleteDoc(doc(db, nomeColecao, id));
    alert("Excluído!");

    pacienteAtualId = "";
    if (status) status.innerText = "Excluído.";
    await carregarListaPacientes();
    limparCamposAposSalvar();
  } catch (e) {
    console.error("EXCLUIR ERRO:", e.code, e.message, e);
    alert(`Erro ao excluir: ${e.code || ""} ${e.message || ""}`);
  }
}

/* ================= UI / RELATÓRIO ================= */
function limparCamposAposSalvar() {
  pacienteAtualId = "";
  document.getElementById("nomePaciente").value = "";
  document.getElementById("dataNasc").value = "";
  document.getElementById("dataAplicacao").value = "";
  document.getElementById("testeSelecionado").value = "";
  resetarDadosTeste();
}

function atualizarRelatorio() {
  const nome = document.getElementById("nomePaciente").value || "";
  document.getElementById("viewNome").innerText = nome.toUpperCase();

  const nas = document.getElementById("dataNasc").value;
  document.getElementById("viewNasc").innerText = formatarData(nas);

  const appData = document.getElementById("dataAplicacao").value;
  document.getElementById("viewData").innerText = formatarData(appData);

  if (nas) document.getElementById("viewIdade").innerText = calcularIdade(nas);
  else document.getElementById("viewIdade").innerText = "";

  const teste = document.getElementById("testeSelecionado").value;
  const motivoDiv = document.getElementById("viewMotivo");

  if (teste && textosPadrao[teste] && motivoDiv) {
    const txt = textosPadrao[teste].motivo || "";
    if (!motivoDiv.innerText || motivoDiv.innerText.includes("Preencha")) {
      motivoDiv.innerHTML = `<p>${txt.replace(/\n/g, "</p><p>")}</p>`;
    }
  }
}

function resetarDadosTeste() {
  dados = { media: 0, valores: [], labels: [], teste: "" };

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  document.getElementById("boxGrafico").style.display = "none";
  document.getElementById("statusCheck").innerText = "Aguardando dados...";

  document.getElementById("viewMotivo").innerHTML =
    '<p class="placeholder">[Preencha o nome e selecione o teste...]</p>';
  document.getElementById("viewAnalise1").innerHTML =
    '<p class="placeholder">[Aguardando Checklist...]</p>';
  document.getElementById("viewAnalise2").innerHTML = "";
  document.getElementById("viewConclusao").innerHTML =
    '<p class="placeholder">[Aguardando Análise...]</p>';
  document.getElementById("viewEncaminhamentos").innerHTML =
    '<p class="placeholder">[Aguardando Análise...]</p>';

  atualizarRelatorio();
}

function calcularIdade(nascimento) {
  if (!nascimento) return "";
  const n = new Date(nascimento);
  const hoje = new Date();

  let anos = hoje.getFullYear() - n.getFullYear();
  let meses = hoje.getMonth() - n.getMonth();
  let dias = hoje.getDate() - n.getDate();

  if (dias < 0) meses--;
  if (meses < 0) { anos--; meses += 12; }

  return `${anos} anos e ${meses} meses`;
}

/* ================= MODAL / CHECKLIST ================= */
function abrirChecklist() {
  const teste = document.getElementById("testeSelecionado").value;
  if (!teste) return alert("Selecione um instrumento primeiro!");

  const lista = checklists[teste];
  if (!lista) return alert("Checklist não configurado para este teste.");

  const divLista = document.getElementById("listaChecklist");
  divLista.innerHTML = "";

  lista.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "chk-item";

    const label = document.createElement("span");
    label.innerText = item;

    const sel = document.createElement("select");
    sel.id = `chk_${index}`;

    sel.add(new Option("0 - Déficit / Prejuízo", "0"));
    sel.add(new Option("1 - Parcial / Discrepante", "1"));
    const ok = new Option("2 - Preservado / Adequado", "2");
    ok.selected = true;
    sel.add(ok);

    row.appendChild(label);
    row.appendChild(sel);
    divLista.appendChild(row);
  });

  document.getElementById("modalChecklist").style.display = "flex";
}

function fecharChecklist() {
  document.getElementById("modalChecklist").style.display = "none";
}

function salvarChecklist() {
  const teste = document.getElementById("testeSelecionado").value;
  const lista = checklists[teste];

  dados.valores = [];
  dados.labels = lista;
  dados.teste = teste;

  let soma = 0;
  lista.forEach((_, index) => {
    const val = parseInt(document.getElementById(`chk_${index}`).value, 10);
    dados.valores.push(val);
    soma += val;
  });

  dados.media = (soma / lista.length).toFixed(2);

  fecharChecklist();
  document.getElementById("statusCheck").innerText = `Gráfico Gerado! Média: ${dados.media}`;

  atualizarGrafico();
  gerarTextoAutomatico();
}

/* ================= TEXTO AUTOMÁTICO ================= */
function gerarTextoAutomatico() {
  const t = textosPadrao[dados.teste];
  if (!t) return;

  let analiseTexto = t.analise || "";
  let conclusaoTexto = t.conclusao || "";

  let hipoteseDI = "";
  let resultadoProg = "";
  let desempenho3 = "";

  const media = parseFloat(dados.media);

  if (media >= 1.6) {
    analiseTexto = analiseTexto.replace("[DESEMPENHO]", "preservado e dentro da média normativa")
      .replace("[DESEMPENHO2]", "habilidades robustas e funcionais");
    desempenho3 = "adequada, permitindo fluxo de pensamento ágil";
    hipoteseDI = "<strong>DESENVOLVIMENTO NEUROPSICOMOTOR TÍPICO (Z76.8)</strong>";
    resultadoProg = "muito favorável";
  } else if (media >= 1.2) {
    analiseTexto = analiseTexto.replace("[DESEMPENHO]", "na zona limítrofe inferior")
      .replace("[DESEMPENHO2]", "discrepâncias que geram esforço cognitivo");
    desempenho3 = "lenta, impactando a fluidez em tarefas";
    hipoteseDI = "<strong>DIFICULDADE DE APRENDIZAGEM / INTELECTO LIMÍTROFE (R41.8)</strong>";
    resultadoProg = "favorável, mediante suporte psicopedagógico";
  } else if (media >= 0.7) {
    analiseTexto = analiseTexto.replace("[DESEMPENHO]", "abaixo da média esperada (rebaixado)")
      .replace("[DESEMPENHO2]", "prejuízos evidentes na abstração");
    desempenho3 = "muito lenta, gerando sobrecarga cognitiva";
    hipoteseDI = "<strong>DEFICIÊNCIA INTELECTUAL LEVE (F70)</strong>";
    resultadoProg = "dependente de estimulação contínua";
  } else {
    analiseTexto = analiseTexto.replace("[DESEMPENHO]", "significativamente rebaixado (déficit severo)")
      .replace("[DESEMPENHO2]", "prejuízos graves generalizados");
    desempenho3 = "comprometida, inviabilizando tarefas sem ajuda";
    hipoteseDI = "<strong>DEFICIÊNCIA INTELECTUAL MODERADA (F71)</strong>";
    resultadoProg = "reservado, focado em AVDs";
  }

  analiseTexto = analiseTexto.replace("[DESEMPENHO3]", desempenho3);
  conclusaoTexto = conclusaoTexto.replace("[HIPOTESE]", hipoteseDI).replace("[RESULTADO]", resultadoProg);

  document.getElementById("viewAnalise1").innerHTML = `<p>${analiseTexto.replace(/\n/g, "</p><p>")}</p>`;
  document.getElementById("viewConclusao").innerHTML = `<p>${conclusaoTexto.replace(/\n/g, "</p><p>")}</p>`;

  const encam = `
  <p>Diante do exposto, sugere-se a seguinte conduta multidisciplinar para otimização do quadro:</p>
  <p><strong>1. Âmbito Escolar e Pedagógico:</strong><br>
  Implementação e revisão de PEI/PDI; recursos visuais; flexibilização avaliativa e tempo estendido.</p>
  <p><strong>2. Âmbito Clínico e Reabilitação:</strong><br>
  Estimulação neuropsicológica semanal; suporte psicoterapêutico quando necessário.</p>
  <p><strong>3. Âmbito Familiar e Social:</strong><br>
  Rotina previsível, treino gradual de AVDs e quadros visuais.</p>`;

  document.getElementById("viewEncaminhamentos").innerHTML = encam;
}

/* ================= GRÁFICO (Chart.js) ================= */
function atualizarGrafico() {
  const canvas = document.getElementById("graficoLinha");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  document.getElementById("boxGrafico").style.display = "block";

  if (chartInstance) chartInstance.destroy();

  const baseIdeal = new Array(dados.valores.length).fill(2);

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dados.labels,
      datasets: [
        {
          label: "Paciente",
          data: dados.valores,
          borderColor: "#0056b3",
          backgroundColor: "rgba(0, 86, 179, 0.1)",
          borderWidth: 2,
          pointBackgroundColor: "#0056b3",
          pointRadius: 5,
          tension: 0.2,
          fill: true
        },
        {
          label: "Esperado",
          data: baseIdeal,
          borderColor: "#999",
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" }
      },
      scales: {
        y: {
          min: -1,
          max: 2.5,
          ticks: {
            stepSize: 1,
            callback: (v) => {
              if (v === 0) return "Déficit (0)";
              if (v === 1) return "Parcial (1)";
              if (v === 2) return "Preservado (2)";
              return "";
            }
          }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function formatarData(d) {
  if (!d) return "--/--/----";
  return d.split("-").reverse().join("/");
}


// mostra versão no login (para confirmar que o arquivo novo carregou)
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("versaoSys");
  if (el) el.textContent = "Versão: " + (__MANAINSYS_VERSION || "");
});
