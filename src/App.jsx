import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// Mapa de Nomes Bonitos (sem alterações)
const prettyFocusNames = {
  // --- Nomes do BANCO NOVO ---
  'Foco_Engenharia': 'Engenharias',
  'Foco_TI': 'Tecnologia da Informação',
  'Foco_Ciencias_Puras': 'Ciências Puras (Química, Física, Bio)',
  'Foco_Saude_Cuidado': 'Saúde e Cuidado',
  'Foco_Saude_Psique': 'Psicologia e Saúde Mental',
  'Foco_Saude_Vet': 'Saúde Animal (Veterinária)',
  'Foco_Sociais_Lei': 'Ciências Sociais e Direito',
  'Foco_Humanas_Ed': 'Humanas e Educação',
  'Foco_Negocios_Gestao': 'Negócios e Gestão',
  'Foco_Negocios_Fin': 'Finanças e Economia',
  'Foco_Comunicacao_Mkt': 'Comunicação e Marketing',
  'Foco_Artes_Design': 'Artes, Design e Arquitetura',
  
  // --- Nomes do BANCO ANTIGO (do seu último script SQL) ---
  'Áreas Técnicas e Científicas': 'Técnicas e Científicas (Antigo)',
  'Áreas Criativas': 'Criativas (Antigo)',
  'Áreas de Saúde e Bem-Estar': 'Saúde e Bem-Estar (Antigo)',
  'Áreas de Administração e Negócios': 'Administração e Negócios (Antigo)',
  'Áreas Humanas e Sociais': 'Humanas e Sociais (Antigo)',
  'Nenhuma Área': 'Nenhuma Área (Antigo)'
};

// Opções de formatação para Horário de Brasília
const brasiliaDateOptions = {
  timeZone: 'America/Sao_Paulo',
  year: '2-digit', month: '2-digit', day: '2-digit' // Formato DD/MM/AA
};
const brasiliaTimeOptions = {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit', minute: '2-digit', second: '2-digit', // Formato HH:MM:SS
  hour12: false // Usa formato 24h
};

function App() {
  // Estados
  const [userId, setUserId] = useState(null);
  const [userNickname, setUserNickname] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [finalResult, setFinalResult] = useState(null); 
  const [pastResults, setPastResults] = useState([]);
  const [view, setView] = useState('register'); 
  const [fontSizeAdjustment, setFontSizeAdjustment] = useState(0);
  const [questions, setQuestions] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);
  const [maxScores, setMaxScores] = useState({});
  const [courseMap, setCourseMap] = useState({}); 
  const [adminApelido, setAdminApelido] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(null); 
  const [allDbResults, setAllDbResults] = useState([]); 
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false); 
  const [adminSelectedDb, setAdminSelectedDb] = useState(null); 
  const [detailedUser, setDetailedUser] = useState(null); 
  const [historyDetails, setHistoryDetails] = useState(null); 
  const [historyDetailsLoading, setHistoryDetailsLoading] = useState(false);
  
  // --- NOVO ESTADO ---
  const [historyRanking, setHistoryRanking] = useState(null); // Armazena o ranking de porcentagens

  // Efeitos
  useEffect(() => { // Carrega dados iniciais
    async function getInitialData() {
        setLoading(true);
        setError(null);
        try {
          // Busca Questões/Opções/Pontuação
          const { data: questionsData, error: questionsError } = await supabase
            .from('questoes')
            .select(`id_q, enunciado, opcoes(id_o, opcao, pontuacao(foco, valor))`);
          if (questionsError) throw questionsError;
          if (!questionsData || questionsData.length === 0) throw new Error("Nenhuma questão encontrada.");
          setQuestions(questionsData);

          // Busca Pontuações Máximas
          const { data: maxScoresData, error: maxScoresError } = await supabase
            .from('foco_pontuacao_maxima')
            .select('foco, valor_maximo');
          if (maxScoresError) throw maxScoresError;
          if (!maxScoresData) throw new Error("Dados de pontuação máxima não retornados.");
          const maxScoresMap = maxScoresData.reduce((acc, item) => {
              if (item.foco && typeof item.valor_maximo === 'number') { 
                acc[item.foco] = item.valor_maximo;
              } else {
                console.warn("Item de pontuação máxima inválido:", item);
              }
            return acc;
          }, {});
          if (Object.keys(maxScoresMap).length === 0) throw new Error("Nenhuma pontuação máxima válida encontrada.");
          setMaxScores(maxScoresMap);

          // Busca Mapeamento de Cursos
          const { data: coursesData, error: coursesError } = await supabase
            .from('cursos_por_foco')
            .select('foco, curso_nome');
          if (coursesError) throw coursesError;
          if (!coursesData) throw new Error("Dados de cursos por foco não retornados.");
          const courseMapObject = coursesData.reduce((acc, item) => {
              if (item.foco && item.curso_nome) { 
               if (!acc[item.foco]) acc[item.foco] = [];
               acc[item.foco].push(item.curso_nome);
              } else {
                console.warn("Item de curso por foco inválido:", item);
              }
            return acc;
          }, {});
          if (Object.keys(courseMapObject).length === 0) console.warn("Nenhum curso por foco encontrado.");
          setCourseMap(courseMapObject);

          // Carrega histórico local
          const savedResults = localStorage.getItem('testHistory');
          if (savedResults) {
              try {
                  setPastResults(JSON.parse(savedResults));
              } catch (parseError) {
                  console.error("Erro ao parsear histórico local:", parseError);
                  localStorage.removeItem('testHistory');
              }
          }

        } catch (err) {
          console.error('Erro ao carregar dados iniciais:', err);
          setError(`Falha ao carregar dados: ${err.message}. Verifique sua conexão e o RLS das tabelas ('questoes', 'foco_pontuacao_maxima', 'cursos_por_foco').`);
        } finally {
          setLoading(false);
        }
      }
      getInitialData();
  }, []); 

  useEffect(() => { // Carrega histórico admin
    async function loadAdminHistory() {
      if (view === 'history' && isMasterAdmin && adminSelectedDb) { 
        console.log(`[loadAdminHistory] Carregando histórico para DB: ${adminSelectedDb}`);
        setHistoryLoading(true); 
        setError(null); 
        setAdminError(null); 
        const results = await fetchAllResults(adminSelectedDb); 
        setAllDbResults(results);
        console.log(`[loadAdminHistory] Histórico carregado com ${results.length} resultados.`);
      }
    }
    loadAdminHistory(); 

    return () => {
      if (view !== 'history' && isMasterAdmin && adminSelectedDb) {
         console.log("[loadAdminHistory Cleanup] Limpando resultados do histórico (saindo da view 'history').");
         setAllDbResults([]);
       }
    };
  }, [view, isMasterAdmin, adminSelectedDb]); 

  useEffect(() => { // Classes do body
      const bodyClassList = document.body.classList;
      const classMap = {
        quiz: 'question-page',
        register: 'nickname-page',
        adminLogin: 'nickname-page',
        admin_db_select: 'nickname-page',
        result: 'final-page',
        history: 'history-page',
        detailView: 'detail-page'
      };
      Object.values(classMap).forEach(cls => bodyClassList.remove(cls));
      bodyClassList.remove('gif-active'); 
      const currentClass = classMap[view];
      if (currentClass) {
        bodyClassList.add(currentClass);
        if (view !== 'quiz') {
          bodyClassList.add('gif-active');
        }
      } else if (view !== 'quiz') {
         bodyClassList.add('gif-active');
      }
      return () => {
        Object.values(classMap).forEach(cls => bodyClassList.remove(cls));
        bodyClassList.remove('gif-active');
      };
  }, [view]);

  useEffect(() => { // Ajuste de fonte
      const initialBaseSizeStr = document.documentElement.getAttribute('data-initial-font-size');
      let initialBaseSize = 16; 
      if (initialBaseSizeStr) {
        initialBaseSize = parseFloat(initialBaseSizeStr);
      } else {
        const computedSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        initialBaseSize = computedSize;
        document.documentElement.setAttribute('data-initial-font-size', initialBaseSize.toString());
      }
      const newSize = initialBaseSize + fontSizeAdjustment; 
      document.documentElement.style.fontSize = `${newSize}px`;
  }, [fontSizeAdjustment]);

  // Funções de Fonte
  function increaseFontSize() { setFontSizeAdjustment(adj => Math.min(adj + 2, 8)); }
  function decreaseFontSize() { setFontSizeAdjustment(adj => Math.max(adj - 2, -4)); }

  // --- FUNÇÕES DE ADMIN ---
  
  async function handleAdminLogin(e) { 
    e.preventDefault();
    setAdminError(null);
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_mestre')
        .select('apelido, senha_hash') 
        .eq('apelido', adminApelido)
        .single();
    
      if (userError && userError.code !== 'PGRST116') throw userError; 
      if (!userData || userError) throw new Error('Apelido ou senha mestre incorretos.');

      const savedPassword = userData.senha_hash;
    
      if (adminPassword === savedPassword) {
        setIsMasterAdmin(true);
        setView('admin_db_select'); 
      } else {
        throw new Error('Apelido ou senha mestre incorretos.');
      }
    } catch (err) {
      console.error('Erro no login admin:', err);
      setAdminError(err.message || 'Erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllResults(dbSource) { 
    let data, error;
    let results = []; 

    try {
      if (dbSource === 'old') {
        ({ data, error } = await supabase
          .from('resultado_antigo')
          .select(`id_u, area_principal, usuarios_antigo(apelido, data_criacao)`)
          .order('id_r', { ascending: false })
          .limit(10000)); 
        if (error) throw new Error(`Banco Antigo: ${error.message}`);
        if (!data) throw new Error("Banco Antigo: Nenhum dado retornado.");

        results = data.map(item => {
          const userData = item.usuarios_antigo || {};
          const timestamp = userData.data_criacao ? new Date(userData.data_criacao) : new Date(); 
          return {
            id_u: item.id_u,
            nickname: userData.apelido || 'Usuário Deletado',
            date: timestamp.toLocaleDateString('pt-BR', brasiliaDateOptions),
            time: timestamp.toLocaleTimeString('pt-BR', brasiliaTimeOptions),
            foco: prettyFocusNames[item.area_principal] || item.area_principal, 
          };
        });
      } 
      else {
        ({ data, error } = await supabase
          .from('resultado')
          .select(`id_u, foco_principal, usuarios(apelido, data_criacao)`)
          .order('id_r', { ascending: false }) 
          .limit(10000)); 
        if (error) throw new Error(`Banco Novo: ${error.message}`);
         if (!data) throw new Error("Banco Novo: Nenhum dado retornado.");

        results = data.map(item => {
          const userData = item.usuarios || {};
          const timestamp = userData.data_criacao ? new Date(userData.data_criacao) : new Date(); 
          return {
            id_u: item.id_u,
            nickname: userData.apelido || 'Usuário Deletado',
            date: timestamp.toLocaleDateString('pt-BR', brasiliaDateOptions),
            time: timestamp.toLocaleTimeString('pt-BR', brasiliaTimeOptions),
            foco: prettyFocusNames[item.foco_principal] || item.foco_principal,
          };
        });
      }
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
      setAdminError(`Falha ao carregar histórico: ${err.message}. Verifique o RLS.`); 
      results = []; 
    } finally {
      setHistoryLoading(false); 
    }
    return results; 
  }

  // --- FUNÇÃO MODIFICADA ---
  async function handleViewHistoryDetails(userId, userNickname) { 
    console.log(`[handleViewHistoryDetails] Iniciando para userId: ${userId}, nickname: ${userNickname}`);
    if (!userId || !userNickname) {
      const errorMsg = 'ID ou Apelido do usuário ausente ao tentar ver detalhes.';
      console.error(`[handleViewHistoryDetails] ${errorMsg}`);
      setAdminError(errorMsg);
      return;
    }
    
    setDetailedUser({ id: userId, nickname: userNickname }); 
    setView('detailView'); 
    setHistoryDetailsLoading(true);
    setHistoryDetails(null);
    setHistoryRanking(null); // --- ADICIONADO: Limpa o ranking anterior
    setAdminError(null); 

    const isOldDb = adminSelectedDb === 'old';
    const respostasTable = isOldDb ? 'respostas_usuario_antigo' : 'respostas_usuario';
    const questoesTable = isOldDb ? 'questoes_antigo' : 'questoes';
    const opcoesTable = isOldDb ? 'opcoes_antigo' : 'opcoes';
    console.log(`[handleViewHistoryDetails] Usando tabelas: ${respostasTable}, ${questoesTable}, ${opcoesTable}`);

    try {
      // --- INÍCIO DA MODIFICAÇÃO: Buscar o Ranking ---
      if (!isOldDb) {
        console.log(`[handleViewHistoryDetails] Buscando ranking da tabela 'resultado' para id_u = ${userId}`);
        // Busca o resultado MAIS RECENTE do usuário
        const { data: rankingData, error: rankingError } = await supabase
          .from('resultado')
          .select('ranking_completo')
          .eq('id_u', userId)
          .order('id_r', { ascending: false }) 
          .limit(1);

        if (rankingError) throw new Error(`ao buscar ranking: ${rankingError.message}. VERIFIQUE O RLS!`);
        
        if (rankingData && rankingData.length > 0 && rankingData[0].ranking_completo) {
          console.log("[handleViewHistoryDetails] Ranking encontrado:", rankingData[0].ranking_completo);
          // Ordena o ranking por percentual (descendente) antes de salvar no estado
          const sortedRanking = [...rankingData[0].ranking_completo].sort((a, b) => b.percentual - a.percentual);
          setHistoryRanking(sortedRanking);
        } else {
          console.warn("[handleViewHistoryDetails] Ranking não encontrado (ranking_completo nulo ou sem dados) para o usuário.");
          setHistoryRanking(null); 
        }
      } else {
          console.log("[handleViewHistoryDetails] Banco antigo selecionado, pulando busca por ranking.");
          setHistoryRanking(null); // Banco antigo não tem ranking
      }
      // --- FIM DA MODIFICAÇÃO: Buscar o Ranking ---


      // 1. Buscar Respostas (Q&A)
      console.log(`[handleViewHistoryDetails] Buscando respostas da tabela ${respostasTable} para id_u = ${userId}`);
      const { data: respostasData, error: respostasError } = await supabase
        .from(respostasTable)
        .select('id_q, id_o')
        .eq('id_u', userId);

      if (respostasError) throw new Error(`ao buscar ${respostasTable}: ${respostasError.message}. VERIFIQUE O RLS!`);
      console.log(`[handleViewHistoryDetails] Respostas encontradas:`, respostasData);
      
      if (!respostasData || respostasData.length === 0) {
        console.log(`[handleViewHistoryDetails] Nenhuma resposta encontrada para este usuário.`);
        setHistoryDetails([]); 
        // Não define erro, pois o ranking pode ter sido carregado
        // setHistoryDetailsLoading(false); // Movido para o 'finally'
        // return; // Não retorna, pois o ranking pode existir
      } else {
      // Continua buscando os detalhes das respostas apenas se elas existirem
        // 2. Coletar IDs
        const questionIds = [...new Set(respostasData.map(r => r.id_q))].filter(id => id != null); 
        const optionIds = [...new Set(respostasData.map(r => r.id_o))].filter(id => id != null);   
        console.log(`[handleViewHistoryDetails] IDs de Questões válidos:`, questionIds);
        console.log(`[handleViewHistoryDetails] IDs de Opções válidos:`, optionIds);

         if (questionIds.length === 0 || optionIds.length === 0) {
             const missingIdsMsg = `Dados de ${questionIds.length === 0 ? 'questões' : 'opções'} ausentes nas respostas encontradas.`;
             console.warn(`[handleViewHistoryDetails] ${missingIdsMsg}`);
            setAdminError(prev => prev ? `${prev} ${missingIdsMsg}` : missingIdsMsg);
             setHistoryDetails([]);
         } else {
            // 3. Buscar Textos
            console.log(`[handleViewHistoryDetails] Buscando textos da tabela ${questoesTable}`);
            const { data: questoesData, error: questoesError } = await supabase
              .from(questoesTable)
              .select('id_q, enunciado')
              .in('id_q', questionIds);
            if (questoesError) throw new Error(`ao buscar ${questoesTable}: ${questoesError.message}`);
            if (!questoesData || questoesData.length === 0) throw new Error(`Nenhuma questão encontrada em ${questoesTable}.`);

            console.log(`[handleViewHistoryDetails] Buscando textos da tabela ${opcoesTable}`);
            const { data: opcoesData, error: opcoesError } = await supabase
              .from(opcoesTable)
              .select('id_o, opcao')
              .in('id_o', optionIds);
            if (opcoesError) throw new Error(`ao buscar ${opcoesTable}: ${opcoesError.message}`);
            if (!opcoesData || opcoesData.length === 0) throw new Error(`Nenhuma opção encontrada em ${opcoesTable}.`);

            // 4. Mapear Textos
            const questoesMap = new Map((questoesData || []).map(q => [q.id_q, q.enunciado]));
            const opcoesMap = new Map((opcoesData || []).map(o => [o.id_o, o.opcao]));
            console.log(`[handleViewHistoryDetails] Mapa de questões: ${questoesMap.size}, Mapa de opções: ${opcoesMap.size}`);

            // 5. Combinar
            const combinedDetails = respostasData
              .filter(resposta => questoesMap.has(resposta.id_q) && opcoesMap.has(resposta.id_o)) 
              .map(resposta => ({
                questoes: { enunciado: questoesMap.get(resposta.id_q) },
                opcoes: { opcao: opcoesMap.get(resposta.id_o) }
              }));
            
            if (combinedDetails.length < respostasData.length) {
              console.warn(`[handleViewHistoryDetails] ${respostasData.length - combinedDetails.length} respostas foram ignoradas por falta de questão/opção.`);
            }
            console.log(`[handleViewHistoryDetails] Detalhes combinados (válidos):`, combinedDetails);
            setHistoryDetails(combinedDetails.length > 0 ? combinedDetails : []); 
        }
      }
  	} catch (err) {
      console.error("[handleViewHistoryDetails] Erro durante a busca:", err);
      setAdminError(`Erro ${err.message}. Verifique o RLS e a consistência dos dados.`);
      setHistoryDetails([]); 
      setHistoryRanking(null); // Limpa ranking em caso de erro
    } finally {
      console.log(`[handleViewHistoryDetails] Finalizando busca.`);
      setHistoryDetailsLoading(false);
    }
  }


  // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---
  
  // --- FUNÇÃO MODIFICADA ---
  function handleGoToRegister() { 
      setFontSizeAdjustment(0);
      setUserId(null);
      setUserNickname('');
      setUserAnswers([]);
      setCurrentQuestionIndex(0);
      setFinalResult(null);
      setIsMasterAdmin(false); 
      setAdminApelido('');
      setAdminPassword('');
      setAllDbResults([]);
      setAdminSelectedDb(null);
      setDetailedUser(null); 
      setHistoryDetails(null);
      setHistoryRanking(null); // --- ADICIONADO: Limpa o ranking
      setAdminError(null);
      setError(null); 
      document.documentElement.removeAttribute('data-initial-font-size'); 
      document.documentElement.style.fontSize = ''; 
      setView('register');
  }
  
  // Função de Registro (sem alteração, pois o SQL cuida do fuso horário)
  async function handleRegister(e) { 
      e.preventDefault();
      setRegistrationError(null);
      setError(null);

      if (!userNickname.trim()) {
        setRegistrationError('Por favor, digite um apelido.');
        return;
      }
      setLoading(true);

      try {
      // A coluna 'data_criacao' usará o DEFAULT (Horário de Brasília)
      // que definimos no SQL.
        const { data, error: insertError } = await supabase
          .from('usuarios') 
          .insert({ apelido: userNickname.trim() })
          .select('id_u') 
          .single(); 
      
      if (insertError) throw insertError;
      
      setUserId(data.id_u);
      setCurrentQuestionIndex(0);
      setUserAnswers([]); 
      setView('quiz');

      } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        if (err.code === '23505') { 
          setRegistrationError('Apelido já em uso. Por favor, escolha outro.');
        } else {
          setError('Erro ao cadastrar usuário. Tente novamente mais tarde.');
        }
      } finally {
        setLoading(false);
      }
  }
  
  function handleAnswer(questionId, optionId) { 
      const newAnswers = [...userAnswers.filter(a => a.id_q !== questionId), { id_u: userId, id_q: questionId, id_o: optionId }];
      setUserAnswers(newAnswers);

      if (currentQuestionIndex === questions.length - 1) {
          handleSubmitTest(newAnswers); 
      } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
  }

  function handleBack() { 
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
  }

  function handleRestartTest() { handleGoToRegister(); }

  function handleSaveResult(result) { 
      try {
      const resultToSave = {
          ...result,
          foco: prettyFocusNames[result.foco] || result.foco || 'Foco Desconhecido'
      };
      const currentHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
      if (!currentHistory.some(r => 
          r.nickname === resultToSave.nickname && 
          r.date === resultToSave.date && 
          r.foco === resultToSave.foco
      )) {
          const newHistory = [...currentHistory, resultToSave];
          setPastResults(newHistory); 
          localStorage.setItem('testHistory', JSON.stringify(newHistory));
      } else {
           console.log("Resultado duplicado no histórico local, não salvo novamente.");
      }
      } catch (e) {
        console.error("Erro ao salvar no localStorage:", e);
      }
  }

  function handleClearHistory() { 
      try {
        setPastResults([]);
        localStorage.removeItem('testHistory');
      } catch (e) {
        console.error("Erro ao limpar localStorage:", e);
      }
  }

  // --- FUNÇÃO MODIFICADA (handleSubmitTest) ---
  async function handleSubmitTest(answers) { 
    setLoading(true);
  	setError(null); 

  	if (!answers || answers.length === 0) {
    	  setError("Nenhuma resposta fornecida para processar.");
    	  setLoading(false);
    	  setView('quiz'); 
    	  return;
  	}
  	  if (answers.length !== questions.length) {
  	 	  console.warn(`Número de respostas (${answers.length}) diferente do número de questões (${questions.length}). Processando mesmo assim.`);
  	  }


  	try {
  	  // 1. Salva as Respostas
  	 	  console.log("Submetendo respostas:", answers);
  	  const { error: answersError } = await supabase
  	 	.from('respostas_usuario')
  	 	.insert(answers);
  	  if (answersError) throw new Error(`ao salvar respostas: ${answersError.message}`);
  	 	  console.log("Respostas salvas com sucesso.");


  	  // 2. Calcula a Pontuação BRUTA
  	  const scoreMap = {};
  	  answers.forEach(answer => {
  	 	const question = questions.find(q => q.id_q === answer.id_q);
  	 	if (!question) {
  	 	 	console.warn(`Questão ID ${answer.id_q} não encontrada.`);
  	 	 	return; 
  	 	}
  	 	const option = question.opcoes?.find(o => o.id_o === answer.id_o); 
  	 	if (!option) {
  	 	 	  console.warn(`Opção ID ${answer.id_o} não encontrada para a questão ID ${answer.id_q}.`);
  	 	 	  return; 
  	 	}
  	 	
  	 	if (option.pontuacao && Array.isArray(option.pontuacao)) { 
  	 	  option.pontuacao.forEach(p => {
  	 	 	  if (p.foco && typeof p.valor === 'number') { 
  	 	 	 	scoreMap[p.foco] = (scoreMap[p.foco] || 0) + p.valor;
  	 	 	  } else {
  	 	 	 	  console.warn(`Item de pontuação inválido na opção ID ${answer.id_o}:`, p);
  	 	 	  }
  	 	  });
  	 	} else {
  	 	 	  console.warn(`Dados de pontuação ausentes ou inválidos para a opção ID ${answer.id_o}.`);
  	 	}
  	  });
  	 	  console.log("ScoreMap (pontuação bruta):", scoreMap);


  	  // 3. NORMALIZAÇÃO
  	  const percentMap = {};
  	 	  let hasValidScore = false; 
  	  Object.keys(scoreMap).forEach(foco => {
  	 	const rawScore = scoreMap[foco];
  	 	const maxScore = maxScores[foco]; 
  	 	if (typeof maxScore === 'number' && maxScore > 0) { 
  	 	 	percentMap[foco] = (rawScore / maxScore) * 100;
  	 	 	hasValidScore = true; 
  	 	} else {
  	 	 	percentMap[foco] = 0;
  	 	 	if (maxScore === 0) console.warn(`Pontuação máxima para "${foco}" é zero.`);
  	 	 	else if (typeof maxScore === 'undefined') console.warn(`Pontuação máxima para "${foco}" não encontrada.`);
  	 	 	else console.warn(`Valor inválido para pontuação máxima de "${foco}":`, maxScore);
  	 	}
  	  });
  	 	  console.log("PercentMap (pontuação normalizada):", percentMap);

  	 	  if (!hasValidScore) {
  	 	 	  throw new Error("Não foi possível calcular nenhum percentual válido.");
  	 	  }


  	  // 4. Ordena os Focos
  	  // --- MODIFICADO: Inclui *todos* os focos, mesmo os com 0% ---
  	  let focosOrdenados = Object.keys(maxScores) // Começa com todos os focos possíveis
  	 	.map(foco => ({ 
  	 	  foco, 
  	 	  percentual: parseFloat((percentMap[foco] || 0).toFixed(2)) // Pega o percentual ou 0
  	 	}))
  	 	.sort((a, b) => b.percentual - a.percentual); // Ordena
  	 	  console.log("Focos Ordenados (todos):", focosOrdenados);


  	  // --- 5. LÓGICA 7 CURSOS (MÉTODO DO "POOL") - CORRIGIDO ---
  	  const top3Focos = focosOrdenados.slice(0, 3);
  	  
  	 	  if (top3Focos.length === 0 || !top3Focos[0]?.foco) { 
  	 	 	  console.error("Erro: Nenhum foco principal válido encontrado após ordenação.", focosOrdenados);
  	 	 	  throw new Error("Não foi possível determinar a área principal.");
  	 	  }
  
  	  const coursePool = [];
  	  const focosToSearch = top3Focos.map(f => f.foco);

  	  if (focosToSearch[0]) {
  	 	  const courses = courseMap[focosToSearch[0]] || [];
  	 	  coursePool.push(...courses);
  	 	  if (courses.length === 0) console.warn(`Nenhum curso encontrado para o foco principal "${focosToSearch[0]}".`);
  	  }
  	  if (focosToSearch[1]) {
  	 	  const courses = courseMap[focosToSearch[1]] || [];
  	 	  coursePool.push(...courses);
  	  }
  	  if (focosToSearch[2]) {
  	 	  const courses = courseMap[focosToSearch[2]] || [];
  	 	  coursePool.push(...courses);
  	  }

  	  const uniqueCourses = [...new Set(coursePool)];
  	  const final7Courses = uniqueCourses.slice(0, 7);

  	  const focoPrincipal = top3Focos[0];
  	  const nomeFocoPrincipal = focoPrincipal.foco; 
  	 	  console.log("Sugestões de Cursos (Top 7):", final7Courses);


  	  // 6. Estrutura do Resultado Final
  	  const currentResult = {
  	 	nickname: userNickname,
  	 	date: new Date().toLocaleDateString('pt-BR'), 
  	 	foco: nomeFocoPrincipal,   
  	 	topFocosRank: focosOrdenados, // Salva o ranking completo
  	 	sugestoes: final7Courses
  	  };

  	  // --- 7. Salva o Resultado Principal no Banco (MODIFICADO) ---
  	  console.log("Salvando resultado principal no banco...");
  	  const { error: resultError } = await supabase
  	 	.from('resultado')
  	 	.insert({ 
  	 	 	id_u: userId, 
  	 	 	foco_principal: nomeFocoPrincipal, 
  	 	 	percentual_principal: focoPrincipal.percentual,
  	 	 	 ranking_completo: focosOrdenados // <-- ADICIONADO: Salva o ranking completo
  	 	});
  	  if (resultError) throw new Error(`ao salvar resultado: ${resultError.message}`);

  	  // 8. Salva no Histórico Local (LocalStorage)
  	  handleSaveResult(currentResult); 

  	  // 9. Define o resultado final e muda a view
  	  setFinalResult(currentResult);
  	  setView('result');

  	} catch (err) {
  	  console.error('Erro ao submeter o teste:', err);
  	  setError(`Erro ao finalizar o teste: ${err.message}. Tente novamente.`);
  	  setCurrentQuestionIndex(questions.length - 1); 
  	  setView('quiz'); 
  	} finally {
  	  setLoading(false);
  	}
  } 


  // --- FUNÇÕES DE RENDERIZAÇÃO ---

  // Controles de Fonte
  const renderFontControls = () => (
    <div className="font-controls">
        <button onClick={decreaseFontSize} title="Diminuir fonte" className="font-toggle-button">A-</button>
        <button onClick={increaseFontSize} title="Aumentar fonte" className="font-toggle-button">A+</button>
    </div>
  );

// Tela 1: Registro (CORRIGIDA)
// Usa as classes .result-list e .result-item para o histórico local
  const renderRegister = () => (
    <div className="container register-container">
        <h1>Teste Vocacional</h1>
        <p>Digite seu apelido para começar:</p>
        <form onSubmit={handleRegister}>
            <input
                type="text"
                value={userNickname}
                onChange={(e) => setUserNickname(e.target.value)}
                placeholder="Seu apelido"
                maxLength="50"
  	 	 	style={{ width: '80%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #555', background: '#333', color: '#fff' }}
            />
            <button type="submit" disabled={loading || !userNickname.trim()} className="start-button">
                {loading ? 'Carregando...' : 'Iniciar Teste'}
            </button>
        </form>
        {registrationError && <div className="error-message"><p>{registrationError}</p></div>}
        
        <div className="admin-login-link" style={{ marginTop: '15px' }}>
            <button onClick={() => setView('adminLogin')} className="history-button">
              Acesso Admin
            </button>
        </div>
        
        {pastResults.length > 0 && (
            <div className="past-results" style={{ marginTop: '20px', width: '100%' }}>
                <h3 style={{ color: 'var(--amarelo-wall-e)' }}>Resultados Locais</h3>
                
                <ul className="result-list"> 
                    {pastResults.map((result, index) => (
                        <li key={index} className="result-item"> 
                            <div><strong>Data:</strong> {result.date}</div>
  	 	 	 	<div><strong>Apelido:</strong> {result.nickname}</div>
                            <div><strong>Foco:</strong> {result.foco}</div>
                        </li>
                    ))}
                </ul>

                <button onClick={handleClearHistory} className="clear-history-button" style={{ marginTop: '10px' }}>
                    Limpar Histórico Local
                </button>
            </div>
        )}
    </div>
  );

  // Tela 2: Quiz (COMPLETADA E CORRIGIDA)
  const renderQuiz = () => {
  	// Mostra loading SÓ se as questões não tiverem sido carregadas ainda
  	// (loading também fica true durante o handleSubmitTest, mas não queremos mostrar isso)
  	if (loading && questions.length === 0) {
  		return <div className="loading">Carregando questões...</div>;
  	}

  	// Mostra erro principal se as questões falharem em carregar
  	if (error && questions.length === 0) {
  		return <div className="error-message"><p>{error}</p></div>;
  	}

  	if (!questions || questions.length === 0) {
  		return <div className="error-message"><p>Nenhuma questão encontrada.</p></div>;
  	}

  	const currentQuestion = questions[currentQuestionIndex];
  	if (!currentQuestion) {
  		return <div className="error-message"><p>Erro ao carregar a questão atual.</p></div>;
  	}

  	// Encontra a resposta selecionada para esta questão, se houver
  	const selectedAnswer = userAnswers.find(a => a.id_q === currentQuestion.id_q);

  	return (
  		<div className="container question-container">
  			<h2 style={{ color: 'var(--amarelo-wall-e)' }}>Questão {currentQuestionIndex + 1} de {questions.length}</h2>
  			<p className="question-enunciado" style={{ fontSize: '1.1rem', color: 'var(--eve-branco)', margin: '20px 0' }}>
  				{currentQuestion.enunciado}
  			</p>
  			
  			<div className="option-buttons-container">
  				{(currentQuestion.opcoes || []).map(option => (
  					<button
  						key={option.id_o}
  						// Adiciona a classe 'selected' do CSS se a opção estiver selecionada
  						className={`option-button ${selectedAnswer?.id_o === option.id_o ? 'selected' : ''}`}
  						onClick={() => handleAnswer(currentQuestion.id_q, option.id_o)}
  					>
  						{option.opcao}
  					</button>
  				))}
  			</div>
  			
  			<div className="extra-buttons">
  				{currentQuestionIndex > 0 && (
  					<button onClick={handleBack} className="back-button">
  						Voltar
  					</button>
  				)}
  				
  				{/* Botão de finalizar aparece se o usuário estiver na última questão E já tiver selecionado uma resposta */}
  				{currentQuestionIndex === questions.length - 1 && selectedAnswer && (
  					<button onClick={() => handleSubmitTest(userAnswers)} className="restart-button" disabled={loading}>
  						{loading ? 'Processando...' : 'Finalizar Teste'}
  					</button>
  				)}
  			</div>
  			
  			{renderFontControls()}
  		</div>
  	);
  };

  // Tela 3: Resultado (CRIADA)
  const renderResult = () => {
  	if (loading) {
  		return <div className="loading">Processando seu resultado...</div>;
  	}
  	if (!finalResult) {
  		return <div className="error-message"><p>Erro ao exibir resultado. {error}</p></div>;
  	}

  	const prettyFoco = prettyFocusNames[finalResult.foco] || finalResult.foco;

  	return (
  		<div className="container result-container">
  			<h1>Resultado</h1>
  			<p className="result-text">Obrigado por participar, {finalResult.nickname}!</p>
  			<p className="result-text">Seu foco principal é:</p>
  			<h2 className="main-result">{prettyFoco}</h2>

  			{finalResult.sugestoes && finalResult.sugestoes.length > 0 && (
  				<div className="suggestions">
  					<h3>Algumas sugestões de cursos ({finalResult.sugestoes.length}):</h3>
  					<ul>
  						{finalResult.sugestoes.map((curso, index) => (
  							<li key={index}>{curso}</li>
  						))}
  					</ul>
  				</div>
  			)}

  			{/* Ranking de Focos */}
  			{finalResult.topFocosRank && finalResult.topFocosRank.length > 0 && (
  				<div className="ranking-list" style={{ width: '100%', marginTop: '20px' }}>
  					<h3>Seu Ranking de Focos:</h3>
  					{/* Aplicando estilos inline que imitam as classes do CSS para o ranking */}
  					<ul style={{ listStyle: 'none', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '5px', textAlign: 'left' }}>
  						{finalResult.topFocosRank
  							.filter(f => f.percentual > 0) // Opcional: mostrar só os > 0%
  							.map((focoRank, index) => (
  								<li key={index} className="ranking-item" style={{ background: 'rgba(0,0,0,0.4)', padding: '5px 10px', margin: '3px 0', borderRadius: '4px', borderLeft: '3px solid var(--amarelo-wall-e)' }}>
  									{index + 1}. {prettyFocusNames[focoRank.foco] || focoRank.foco}: {focoRank.percentual}%
  								</li>
  							))}
  					</ul>
  				</div>
  			)}

  			<div className="extra-buttons">
  				<button onClick={handleRestartTest} className="restart-button">
  					Reiniciar Teste
  				</button>
  				<button onClick={() => setView('register')} className="back-to-test-button">
  					Voltar ao Início
  				</button>
  			</div>
  			{renderFontControls()}
  		</div>
  	);
  };

  // Tela 4: Admin Login (CRIADA)
  const renderAdminLogin = () => (
  	<div className="container admin-login-container">
  		<h1>Acesso Mestre</h1>
  		<form onSubmit={handleAdminLogin} style={{ width: '100%' }}>
  			<input
  				type="text"
  				value={adminApelido}
  				onChange={(e) => setAdminApelido(e.target.value)}
  				placeholder="Apelido Mestre"
  				style={{ width: '80%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #555', background: '#333', color: '#fff' }}
  			/>
  			<div style={{ position: 'relative', width: '80%', margin: '10px auto' }}>
  				<input
  					type={showAdminPassword ? 'text' : 'password'}
  					value={adminPassword}
  					onChange={(e) => setAdminPassword(e.target.value)}
  					placeholder="Senha Mestre"
  					style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #555', background: '#333', color: '#fff' }}
  				/>
  				<span 
  					onClick={() => setShowAdminPassword(!showAdminPassword)} 
  					style={{ 
  						position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
  						cursor: 'pointer', color: '#fff', userSelect: 'none', fontSize: '1.2rem'
  					}}
  				>
  					{showAdminPassword ? '🙈' : '👁️'}
  				</span>
  			</div>
  			<button type="submit" disabled={loading} className="start-button">
  				{loading ? 'Verificando...' : 'Entrar'}
  			</button>
  		</form>
  		{adminError && <div className="error-message"><p>{adminError}</p></div>}
  		<div className="extra-buttons">
  			<button onClick={handleGoToRegister} className="back-button">Voltar ao Início</button>
  		</div>
  	</div>
  );

  // Tela 5: Admin DB Select (CRIADA)
  const renderAdminDbSelect = () => (
  	<div className="container admin-db-select">
  		<h1>Painel Mestre</h1>
  		<p>Olá, {adminApelido}. Selecione o banco de dados para ver o histórico:</p>
  		<div className="extra-buttons">
  			<button 
  				onClick={() => { setAdminSelectedDb('new'); setView('history'); }} 
  				className="history-button"
  			>
  				Ver Histórico (Banco NOVO)
  			</button>
  			<button 
  				onClick={() => { setAdminSelectedDb('old'); setView('history'); }} 
  				className="history-button"
  			>
  				Ver Histórico (Banco ANTIGO)
  			</button>
  		</div>
  		<div className="extra-buttons" style={{ marginTop: '20px' }}>
  			<button onClick={handleGoToRegister} className="back-button">Sair</button>
  		</div>
  	</div>
  );

// Tela 6: Histórico Admin (TOTALMENTE CORRIGIDA - CONFORME CSS)
const renderHistory = () => (
  	<div className="container history-container">
  		<h1>Histórico - Banco {adminSelectedDb === 'old' ? 'Antigo' : 'Novo'}</h1>
  		{historyLoading && <div className="loading">Carregando histórico...</div>}
  		{adminError && <div className="error-message"><p>{adminError}</p></div>}
  		
  		{!historyLoading && allDbResults.length > 0 && (
  			
  			  <ul className="result-list">
  				{allDbResults.map((result) => (
  					// Usar uma chave mais robusta, caso id_u não seja único na lista (raro, mas possível)
  					<li key={`${result.id_u}-${result.date}-${result.time}`} className="result-item">
  						<div>
  							<strong>Apelido: </strong>
  							<button 
  								onClick={() => handleViewHistoryDetails(result.id_u, result.nickname)}
  								className="history-nickname-button"
  							>
  								{result.nickname}
  							</button>
  							 (ID: {result.id_u})
  						</div>
  						<div><strong>Data:</strong> {result.date} às {result.time}</div>
  						<div><strong>Foco:</strong> {result.foco}</div>
  					</li>
  				))}
  			  </ul>

  		)}

  		{!historyLoading && allDbResults.length === 0 && !adminError && (
  			<p style={{ margin: '20px 0', color: 'var(--amarelo-wall-e)' }}>Nenhum resultado encontrado neste banco de dados.</p>
  		)}

  		<div className="extra-buttons">
  			<button onClick={() => setView('admin_db_select')} className="back-button">
  				Voltar (Seleção)
  			</button>
  			<button onClick={handleGoToRegister} className="back-button">
  				Sair
  			</button>
  		</div>
  	</div>
  );

// Tela 7: Detalhes do Histórico (TOTALMENTE CORRIGIDA - CONFORME CSS)
const renderDetailView = () => {
  	if (!detailedUser) {
  		setView('history'); 
  		return null;
  	}

  	return (
  		<div className="container detail-view-container">
  			<h1>Detalhes de {detailedUser.nickname}</h1>
  			<p>(ID do Usuário: {detailedUser.id})</p>

  			{historyDetailsLoading && <div className="loading">Carregando detalhes...</div>}
  			{adminError && <div className="error-message"><p>{adminError}</p></div>}
  			
  			{/* --- SEÇÃO DO RANKING (NOVO) --- */}
  			{historyRanking && historyRanking.length > 0 && (
  				<div className="ranking-list" style={{ width: '100%', marginBottom: '20px' }}>
  					<h3 style={{ color: 'var(--amarelo-wall-e)' }}>Ranking de Focos (Salvo no DB)</h3>
  					{/*   						 Usando estilos inline para se parecer com .history-details-list
  						 já que o CSS não tem classes "ranking-list"
  					*/}
  					<ul style={{ listStyle: 'none', padding: '10px', margin: '15px 0', width: '100%', border: '1px solid #444', borderRadius: '5px', backgroundColor: 'rgba(0, 0, 0, 0.2)', textAlign: 'left' }}>
  						{historyRanking.map((item, index) => (
  							<li key={index} className="ranking-item" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'var(--eve-branco)', padding: '10px 15px', marginBottom: '8px', borderRadius: '4px', borderLeft: '5px solid var(--amarelo-wall-e)' }}>
  								{index + 1}. {prettyFocusNames[item.foco] || item.foco}: {item.percentual}%
  							</li>
  						))}
  					</ul>
  				</div>
  			)}
  			
  			{/* --- SEÇÃO DE PERGUNTAS E RESPOSTAS (CORRIGIDA) --- */}
  			{historyDetails && historyDetails.length > 0 && (
  				<div style={{ width: '100%' }}>
  					<h3 style={{ color: 'var(--amarelo-wall-e)' }}>Respostas Dadas</h3>
  					
  					<ul className="history-details-list">
  						{historyDetails.map((item, index) => (
  							<li key={index} className="history-detail-item">
  								<p>
  									<strong>Pergunta:</strong> {item.questoes?.enunciado || 'Enunciado não encontrado'}
  								</p>
  								<p>
  									<strong>Resposta:</strong> {item.opcoes?.opcao || 'Opção não encontrada'}
  								</p>
  							</li>
  						))}
  					</ul>
  				</div>
  			)}
  			
  			{!historyDetailsLoading && (!historyDetails || historyDetails.length === 0) && (!historyRanking || historyRanking.length === 0) && !adminError && (
  				<p style={{ margin: '20px 0', color: 'var(--amarelo-wall-e)' }}>Nenhum detalhe (respostas ou ranking) encontrado para este usuário.</p>
  			)}

  			<div className="extra-buttons">
  				<button onClick={() => { 
  					setView('history'); 
  					setHistoryDetails(null); 
  					setDetailedUser(null); 
  					setHistoryRanking(null); 
  					setAdminError(null); 
  				}} className="back-button">
  					Voltar (Histórico)
  				</button>
  			</div>
  		</div>
  	);
  };


  // --- RENDERIZAÇÃO PRINCIPAL ---
  
  // Função para selecionar qual tela renderizar
  const renderCurrentView = () => {
  	// Se houver um erro GERAL (ex: falha ao carregar questões)
  	// e não for um erro de admin ou registro, mostre aqui.
  	if (error && view !== 'adminLogin' && view !== 'register') {
  		return (
  			<div className="container error-container">
  				<h1>Erro Crítico</h1>
  				<div className="error-message"><p>{error}</p></div>
  				<div className="extra-buttons">
  					<button onClick={handleGoToRegister} className="restart-button">
  						Tentar Novamente
  					</button>
  				</div>
  			</div>
  		);
  	}

  	// Se estiver carregando os dados iniciais (questões, etc.)
  	if (loading && questions.length === 0 && view === 'register') {
  		return <div className="loading">Carregando dados iniciais...</div>;
  	}
  	
  	switch (view) {
  		case 'quiz':
  			return renderQuiz();
  		case 'result':
  			return renderResult();
  		case 'adminLogin':
  			return renderAdminLogin();
  		case 'admin_db_select':
  			return renderAdminDbSelect();
  		case 'history':
  			return renderHistory();
  		case 'detailView':
  			return renderDetailView();
  		case 'register':
  		default:
  			return renderRegister();
  	}
  };

  // O retorno final do componente App
  return (
  	<div className="app-container">
  		{/* O Wall-E decorativo. Ele não é clicável, conforme o CSS */}
  		<div className="admin-trigger"></div>
  		
  		{/* Renderiza a tela atual (seja registro, quiz, resultado, etc.) */}
  		{renderCurrentView()}
  	</div>
  );
}

export default App;