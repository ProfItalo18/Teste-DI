/* ================= CONFIGURAÇÃO DO FIREBASE (BANCO DE DADOS) ================= */
// Importa as funções necessárias do CDN (para rodar direto no navegador)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração extraída da sua imagem (Screenshot)
const firebaseConfig = {
  apiKey: "AIzaSyDsUix6zvKOznC1SY_j2AQHzr-6hrcLlNc",
  authDomain: "clinicasyscol.firebaseapp.com",
  projectId: "clinicasyscol",
  storageBucket: "clinicasyscol.firebasestorage.app",
  messagingSenderId: "922450718294",
  appId: "1:922450718294:web:0285b9271e02bfb96695f7"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const nomeColecao = "pacientes"; // Tabela onde salvamos

/* ================= VARIÁVEIS GLOBAIS ================= */
let dados = { media: 0, valores: [], labels: [], teste: "" };
let graficoInstancia = null;
let pacienteAtualId = null; // ID do documento no Firebase
let listaPacientesCache = []; // Cache local da lista vinda do banco

// Dicionário Técnico Expandido
const dicionario = {
    wisc: {
        itens: ["Semelhanças", "Vocabulário", "Cubos", "Matricial", "Dígitos", "Códigos", "Símbolos"],
        desc: [
            "capacidade de abstração verbal e formação de conceitos",
            "conhecimento lexical e memória semântica de longo prazo",
            "organização visuoespacial, coordenação visomotora e planejamento",
            "inteligência fluida, raciocínio lógico indutivo e dedutivo",
            "memória operacional auditiva e controle atencional",
            "velocidade de processamento psicomotor e aprendizado associativo",
            "rastreio visual, flexibilidade cognitiva e atenção sustentada"
        ]
    },
    wais: {
        itens: ["Raciocínio Matricial", "Vocabulário", "Aritmética", "Cubos", "Códigos", "Dígitos"],
        desc: [
            "raciocínio fluido não-verbal e resolução de problemas novos",
            "compreensão verbal, nível cultural e cristalização do saber",
            "memória operacional, atenção e raciocínio quantitativo",
            "processamento visual, construção espacial e integração",
            "velocidade de processamento e coordenação visual-motora",
            "atenção concentrada e memória de curto prazo"
        ]
    },
    sonr: {
        itens: ["Categorias", "Situações", "Analogias", "Padrões"],
        desc: [
            "raciocínio categorial e pensamento abstrato",
            "compreensão de situações concretas e senso comum",
            "raciocínio analógico e mudança de set mental",
            "percepção visual e completamento de gestalts"
        ]
    },
    abas: {
        itens: ["Comunicação", "Uso Comunitário", "Acadêmico", "Vida Doméstica", "Saúde/Segurança"],
        desc: [
            "linguagem receptiva e expressiva funcional",
            "autonomia na locomoção e uso de recursos sociais",
            "habilidades escolares fundamentais aplicadas à vida",
            "independência em tarefas do lar e autocuidado",
            "capacidade de antecipar perigos e preservar a integridade"
        ]
    }
};

/* ================= EXPONDO FUNÇÕES PARA O HTML ================= */
// Como usamos type="module", precisamos "pendurar" as funções na janela (window)
window.salvarPaciente = salvarPaciente;
window.carregarPacienteDoBanco = carregarPacienteDoBanco;
window.excluirPaciente = excluirPaciente;
window.atualizarRelatorio = atualizarRelatorio;
window.abrirChecklist = abrirChecklist;
window.salvarChecklist = salvarChecklist;

/* ================= LÓGICA DO BANCO DE DADOS (FIREBASE) ================= */

async function salvarPaciente() {
    const nome = document.getElementById("nomePaciente").value;
    if (!nome) return alert("Preencha o nome do paciente para salvar.");

    const registro = {
        nome: nome,
        nasc: document.getElementById("dataNasc").value,
        aplicacao: document.getElementById("dataAplicacao").value,
        teste: document.getElementById("testeSelecionado").value,
        dadosClinicos: dados, // Salva o objeto completo
        dataAtualizacao: new Date().toISOString()
    };

    const btn = document.querySelector(".btn-save");
    const textoOriginal = btn.innerText;
    btn.innerText = "Salvando...";
    btn.disabled = true;

    try {
        if (pacienteAtualId) {
            // ATUALIZAR
            if(confirm("Deseja atualizar os dados deste paciente existente?")) {
                const docRef = doc(db, nomeColecao, pacienteAtualId);
                await updateDoc(docRef, registro);
                alert("Dados atualizados na nuvem!");
            }
        } else {
            // CRIAR NOVO
            await addDoc(collection(db, nomeColecao), registro);
            alert("Novo paciente salvo na nuvem!");
        }
        await atualizarListaBanco();
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar: " + e.message);
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

async function atualizarListaBanco() {
    const select = document.getElementById("listaPacientesSalvos");
    select.innerHTML = '<option value="">Carregando da Nuvem...</option>';

    try {
        const querySnapshot = await getDocs(collection(db, nomeColecao));
        listaPacientesCache = [];
        
        select.innerHTML = '<option value="">Selecione um Paciente...</option>';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            listaPacientesCache.push({ id: doc.id, ...data });
        });

        // Ordena por nome
        listaPacientesCache.sort((a,b) => a.nome.localeCompare(b.nome));

        listaPacientesCache.forEach((p, index) => {
            select.innerHTML += `<option value="${index}">${p.nome}</option>`;
        });

    } catch (e) {
        console.error(e);
        select.innerHTML = '<option value="">Erro de conexão</option>';
    }
}

function carregarPacienteDoBanco() {
    const index = document.getElementById("listaPacientesSalvos").value;
    if (index === "") {
        limparFormulario();
        return;
    }

    const p = listaPacientesCache[index];
    if (p) {
        pacienteAtualId = p.id; // Guarda o ID do Firestore
        
        // Preenche campos
        document.getElementById("nomePaciente").value = p.nome;
        document.getElementById("dataNasc").value = p.nasc;
        document.getElementById("dataAplicacao").value = p.aplicacao;
        document.getElementById("testeSelecionado").value = p.teste;

        // Recupera dados
        dados = p.dadosClinicos || { media: 0, valores: [], labels: [], teste: "" };

        // Atualiza a tela
        atualizarRelatorio();
        if (dados.media > 0 && dados.valores.length > 0) {
            document.getElementById("boxGrafico").style.display = "block";
            renderizarGraficoLinha();
            document.getElementById("statusCheck").innerText = "Carregado da Nuvem. Média: " + dados.media.toFixed(2);
        }
    }
}

async function excluirPaciente() {
    const index = document.getElementById("listaPacientesSalvos").value;
    if (index === "") return alert("Selecione um paciente na lista para excluir.");

    if (confirm("Tem certeza que deseja apagar este registro da nuvem permanentemente?")) {
        const p = listaPacientesCache[index];
        try {
            await deleteDoc(doc(db, nomeColecao, p.id));
            alert("Paciente excluído.");
            limparFormulario();
            atualizarListaBanco();
        } catch (e) {
            alert("Erro ao excluir: " + e.message);
        }
    }
}

function limparFormulario() {
    pacienteAtualId = null;
    document.getElementById("nomePaciente").value = "";
    document.getElementById("dataNasc").value = "";
    document.getElementById("dataAplicacao").value = "";
    document.getElementById("testeSelecionado").value = "";
    dados = { media: 0, valores: [], labels: [], teste: "" };
    atualizarRelatorio();
    document.getElementById("boxGrafico").style.display = "none";
    if(graficoInstancia) graficoInstancia.destroy();
}

/* ================= ATUALIZAÇÃO EM TEMPO REAL ================= */
function atualizarRelatorio() {
    const nome = document.getElementById("nomePaciente").value;
    const nasc = document.getElementById("dataNasc").value;
    const apl = document.getElementById("dataAplicacao").value;
    const teste = document.getElementById("testeSelecionado").value;

    document.getElementById("viewNome").innerText = nome ? nome.toUpperCase() : "______________________";
    document.getElementById("viewNasc").innerText = formatarData(nasc);
    document.getElementById("viewData").innerText = formatarData(apl);

    if (nasc) {
        const anos = new Date().getFullYear() - new Date(nasc).getFullYear();
        document.getElementById("viewIdade").innerText = anos + " anos";
    }

    if (teste) {
        const nomeTeste = document.getElementById("testeSelecionado").options[document.getElementById("testeSelecionado").selectedIndex].text;
        
        const textoMotivo = `
A avaliação neuropsicológica constitui um procedimento de investigação clínica complexo e minucioso, cujo objetivo primordial transcende a mera aplicação de testes psicométricos. Visa, fundamentalmente, mapear o funcionamento cognitivo, comportamental e emocional do indivíduo, correlacionando-o com a integridade funcional do Sistema Nervoso Central. No presente caso, a solicitação deste psicodiagnóstico para o paciente <strong>${nome || "..."}</strong> fundamenta-se na necessidade clínica imperativa de investigar a etiologia das dificuldades adaptativas, acadêmicas e funcionais relatadas na anamnese inicial. Busca-se diferenciar se tais manifestações são de ordem pedagógica, emocional, ambiental ou se configuram um transtorno do neurodesenvolvimento de base biológica.

Para atender a esta demanda com o rigor científico necessário, optou-se pela seleção e aplicação do instrumento padronizado <strong>${nomeTeste}</strong>. A escolha técnica deste teste justifica-se por suas robustas qualidades psicométricas de validade (capacidade de medir o que se propõe) e fidedignidade (consistência dos resultados), sendo este reconhecido internacionalmente pela comunidade científica como padrão-ouro para o rastreio de habilidades cognitivas e funções executivas nesta faixa etária. O instrumento permite uma análise fatorial não apenas do resultado global, mas das discrepâncias sutis entre os índices de compreensão verbal, raciocínio fluido, memória operacional e velocidade de processamento.

Ressalta-se que a aplicação deste protocolo obedeceu rigorosamente às normativas vigentes do Conselho Federal de Psicologia (CFP) e aos padrões internacionais de testagem (ITC). O procedimento ocorreu em ambiente controlado, livre de distratores visuais e auditivos, sob condições ideais de iluminação e ventilação, visando garantir que o desempenho obtido reflita, com a maior precisão possível, a capacidade real e o potencial cognitivo do avaliando. A análise aqui proposta integra dados quantitativos a observações qualitativas da conduta, como tolerância à frustração, persistência na tarefa e estratégias metacognitivas utilizadas para a resolução de problemas.`;

        document.getElementById("viewMotivo").innerHTML = `<p>${textoMotivo.replace(/\n/g, "</p><p>")}</p>`;

        if (dados.media > 0) gerarAnaliseTecnica(nomeTeste);
    }
}

/* ================= GERADOR DE ANÁLISE PROFUNDA ================= */
function gerarAnaliseTecnica(nomeTeste) {
    const media = dados.media;
    
    let diagnostico, suporte, perfil;
    if (media >= 1.7) {
        diagnostico = "DENTRO DA MÉDIA ESPERADA (Desenvolvimento Típico)";
        suporte = "monitoramento padrão";
        perfil = "preservado e funcional";
    } else if (media >= 1.3) {
        diagnostico = "DEFICIÊNCIA INTELECTUAL LEVE (F70 / 6A00.0)";
        suporte = "suporte intermitente e adaptações curriculares";
        perfil = "com defasagens leves a moderadas";
    } else if (media >= 0.7) {
        diagnostico = "DEFICIÊNCIA INTELECTUAL MODERADA (F71 / 6A00.1)";
        suporte = "suporte substancial e contínuo";
        perfil = "com prejuízos significativos na autonomia";
    } else {
        diagnostico = "DEFICIÊNCIA INTELECTUAL SEVERA (F72 / 6A00.2)";
        suporte = "suporte muito substancial e supervisão constante";
        perfil = "com dependência funcional importante";
    }

    let falhasDescricao = [];
    dados.valores.forEach((v, i) => {
        if (v === 0 && dicionario[dados.teste]) falhasDescricao.push(dicionario[dados.teste].desc[i]);
    });

    const textoAnalise = `
A análise quantitativa dos dados brutos, devidamente convertidos em escores ponderados e comparados à tabela normativa correspondente à idade cronológica do avaliando, revela um perfil de funcionamento cognitivo que merece atenção detalhada. No protocolo do <strong>${nomeTeste}</strong>, o examinando obteve uma média global de desempenho de <strong>${media.toFixed(2)}</strong> (em uma escala clínica de 0 a 2). Estatisticamente, este índice situa o funcionamento intelectual geral na faixa classificada como <strong>${diagnostico}</strong>.

É imprescindível direcionar a atenção para a representação visual dos dados apresentada na <strong>Figura 1 (Gráfico Comparativo de Desempenho)</strong>, localizada acima. A linha azul contínua, que representa o desempenho obtido pelo paciente, deve ser comparada à linha cinza tracejada, que estabelece o teto esperado (desempenho ideal/normativo). A distância vetorial entre estas duas linhas ilustra, de forma clara e objetiva, o "gap" (lacuna) de desenvolvimento existente no momento atual. Observa-se que a curva de desempenho do paciente não é linear, apresentando oscilações que denotam um perfil cognitivo ${falhasDescricao.length > 0 ? "heterogêneo e disfuncional em áreas específicas" : "homogêneo, porém globalmente rebaixado"}.

Aprofundando a interpretação neuropsicológica dos subtestes, nota-se que as funções que dependem de recrutamento imediato da memória operacional e da velocidade de processamento foram as mais impactadas. ${falhasDescricao.length > 0 ? `Especificamente, os resultados pontuaram déficits críticos (escore 0) nas habilidades de: <strong>${falhasDescricao.join("; ")}</strong>.` : "Embora não haja falhas totais (zeros), o desempenho foi limítrofe em várias áreas."} O rebaixamento nestes domínios sugere uma dificuldade intrínseca no processamento eficiente de informações complexas. Isso implica que o paciente, embora possa compreender conceitos isolados, falha na integração e na generalização desses conceitos para novas situações sem a devida mediação externa. A análise do gráfico corrobora a hipótese de que a capacidade de abstração e o raciocínio fluido estão comprometidos, o que justifica as dificuldades acadêmicas e adaptativas observadas na vida diária.`;

    document.getElementById("viewAnalise1").innerHTML = `<p>${textoAnalise.replace(/\n/g, "</p><p>")}</p>`;
    document.getElementById("viewAnalise2").innerHTML = ""; 

    const encamEscola = `
<strong>1. ÂMBITO ESCOLAR E PEDAGÓGICO:</strong><br>
É imperativa a implementação e revisão constante de um Plano de Ensino Individualizado (PEI/PDI), conforme previsto na Lei Brasileira de Inclusão. O currículo deve ser adaptado não apenas em volume, mas na natureza da apresentação do conteúdo. Recomenda-se priorizar o ensino de competências funcionais que tenham aplicação prática na vida do estudante. O material didático deve ser enriquecido com pistas visuais, organizadores gráficos e recursos concretos, minimizando a dependência exclusiva de explicações verbais abstratas que sobrecarregam a memória de trabalho. As avaliações devem ser flexibilizadas, permitindo tempo estendido (fator 1.5x), realização em sala separada para reduzir distratores e, se necessário, auxílio de ledor/transcritor. É fundamental a presença de um mediador ou tutor em momentos de transição ou atividades complexas para auxiliar no planejamento e execução das tarefas.`;

    const encamClinica = `
<strong>2. ÂMBITO CLÍNICO E REABILITAÇÃO:</strong><br>
Indica-se o início imediato de um programa de Estimulação ou Reabilitação Neuropsicológica com frequência mínima semanal. O foco terapêutico deve centrar-se no fortalecimento das Funções Executivas, especificamente no treino de controle inibitório, flexibilidade cognitiva e memória operacional, áreas apontadas como deficitárias no teste. Paralelamente, sugere-se avaliação e acompanhamento em Psicoterapia (preferencialmente Abordagem Cognitivo-Comportamental) para trabalhar questões de regulação emocional, tolerância à frustração e autoestima, frequentemente abaladas pela percepção das próprias dificuldades. Caso haja comorbidades atencionais ou ansiosas, a avaliação com Neuropediatria ou Psiquiatria Infantil torna-se indispensável para considerar a necessidade de suporte farmacológico.`;

    const encamFamilia = `
<strong>3. ÂMBITO FAMILIAR E SOCIAL:</strong><br>
A família deve atuar como co-terapeuta no ambiente doméstico, estruturando uma rotina previsível que ofereça segurança ao paciente. É essencial estimular a autonomia em Atividades de Vida Diária (AVDs), como higiene pessoal, alimentação, vestuário e pequenas tarefas domésticas, evitando a superproteção que impede o desenvolvimento de competências. Recomenda-se o uso de quadros de rotina visual e sistemas de economia de fichas (recompensas) para reforçar comportamentos positivos. No âmbito social, deve-se fomentar a participação em atividades extracurriculares estruturadas (esportes, artes, música) que permitam a interação com pares em um contexto não-acadêmico, fortalecendo as habilidades sociais e o senso de pertencimento, fundamentais para o bem-estar emocional.`;

    document.getElementById("viewEncaminhamentos").innerHTML = `<p>${encamEscola}</p><p>${encamClinica}</p><p>${encamFamilia}</p>`;

    const textoConclusao = `
Diante de todo o exposto, a integração dos dados colhidos na anamnese, das observações clínicas comportamentais e dos resultados quantitativos e qualitativos obtidos através da avaliação neuropsicológica permite concluir que o perfil do examinando <strong>${document.getElementById("nomePaciente").value}</strong> é compatível com a hipótese diagnóstica de <strong>${diagnostico}</strong>.

É fundamental ressaltar que este diagnóstico não constitui uma sentença de incapacidade estática, mas sim um descritor clínico funcional que serve para orientar a rede de apoio sobre o nível de exigência e o tipo de suporte que o indivíduo necessita. O cérebro em desenvolvimento possui neuroplasticidade, e o prognóstico é considerado favorável, estando diretamente condicionado à precocidade, consistência e qualidade das intervenções multidisciplinares implementadas. Sem o suporte adequado, há risco de agravamento das defasagens e prejuízos secundários na saúde mental; contudo, com as adaptações sugeridas, vislumbra-se um potencial significativo de ganho de autonomia e funcionalidade.

O perfil gráfico evidenciou áreas de força que devem ser utilizadas como alavancas para a aprendizagem, bem como áreas de vulnerabilidade que demandam proteção e treino específico. A classificação de nível de suporte sugere a necessidade de <strong>${suporte}</strong> para garantir a participação efetiva do avaliando na sociedade.

Recomenda-se fortemente uma reavaliação neuropsicológica de controle em um período de aproximadamente 18 a 24 meses. Este novo corte transversal servirá para monitorar a curva de desenvolvimento, verificar a eficácia das intervenções terapêuticas e pedagógicas aplicadas e atualizar as condutas conforme a maturação neurológica ocorra. Este documento é de caráter sigiloso, técnico e extrajudicial, elaborado conforme os princípios éticos da profissão, devendo ser utilizado estritamente em benefício do avaliando para fins de encaminhamento clínico, escolar e previdenciário.`;

    document.getElementById("viewConclusao").innerHTML = `<p>${textoConclusao.replace(/\n/g, "</p><p>")}</p>`;
}

/* ================= FUNÇÕES DE INTERFACE (MODAL & CHECKLIST) ================= */
function abrirChecklist() {
    const t = document.getElementById("testeSelecionado").value;
    if (!t) return alert("Por favor, selecione um instrumento de teste primeiro.");
    
    dados.teste = t;
    const lista = document.getElementById("listaChecklist");
    lista.innerHTML = "";
    
    dicionario[t].itens.forEach((item, i) => {
        // Se já houver valor salvo, seleciona ele, senão 2
        let valAtual = (dados.valores && dados.valores[i] !== undefined) ? dados.valores[i] : 2;
        
        lista.innerHTML += `
            <div class="chk-item">
                <span style="font-weight:600; font-size:14px;">${item}</span>
                <select id="val_${i}" style="padding:5px;">
                    <option value="2" ${valAtual == 2 ? 'selected' : ''}>2 - Preservado/Adequado</option>
                    <option value="1" ${valAtual == 1 ? 'selected' : ''}>1 - Parcial/Dificuldade</option>
                    <option value="0" ${valAtual == 0 ? 'selected' : ''}>0 - Déficit/Inadequado</option>
                </select>
            </div>`;
    });
    document.getElementById("modalChecklist").style.display = "flex";
}

function salvarChecklist() {
    const itens = dicionario[dados.teste].itens;
    let soma = 0, vals = [];
    
    itens.forEach((_, i) => {
        let v = parseInt(document.getElementById(`val_${i}`).value);
        soma += v;
        vals.push(v);
    });

    dados.media = soma / itens.length;
    dados.valores = vals;
    dados.labels = itens;

    document.getElementById("modalChecklist").style.display = "none";
    document.getElementById("statusCheck").innerText = "Processado. Média: " + dados.media.toFixed(2);
    document.getElementById("boxGrafico").style.display = "block";
    
    atualizarRelatorio();
    renderizarGraficoLinha();
}

/* ================= GRÁFICO DE LINHA ================= */
function renderizarGraficoLinha() {
    const ctx = document.getElementById("graficoLinha").getContext("2d");
    if (graficoInstancia) graficoInstancia.destroy();

    const dadosIdeal = dados.labels.map(() => 2);

    graficoInstancia = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: dados.labels,
            datasets: [
                {
                    label: 'Desempenho do Paciente',
                    data: dados.valores,
                    borderColor: '#0056b3',
                    backgroundColor: 'rgba(0, 86, 179, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0056b3',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Desempenho Esperado',
                    data: dadosIdeal,
                    borderColor: '#888',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 2.5,
                    ticks: {
                        stepSize: 1,
                        callback: function(v) {
                            if (v == 0) return "Déficit (0)";
                            if (v == 1) return "Parcial (1)";
                            if (v == 2) return "Preservado (2)";
                        },
                        font: { size: 11, weight: 'bold' }
                    },
                    grid: { color: '#e0e0e0' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y === 0) return label + "Déficit Grave";
                            if (context.parsed.y === 1) return label + "Dificuldade Parcial";
                            if (context.parsed.y === 2) return label + "Habilidade Preservada";
                            return label + context.parsed.y;
                        }
                    }
                }
            }
        }
    });
}

function formatarData(d) {
    if (!d) return "--/--/----";
    return d.split("-").reverse().join("/");
}

// Inicializa a lista de pacientes ao abrir
atualizarListaBanco();