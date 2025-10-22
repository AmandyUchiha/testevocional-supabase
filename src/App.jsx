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
        <button onClick={decreaseFontSize} title="Diminuir fonte">A-</button>
        <button onClick={increaseFontSize} title="Aumentar fonte">A+</button>
    </div>
  );

  // Tela 1: Registro
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
            />
            <button type="submit" disabled={loading || !userNickname.trim()}>
                {loading ? 'Carregando...' : 'Iniciar Teste'}
            </button>
        </form>
        {registrationError && <p className="error-message">{registrationError}</p>}
        
        <div className="admin-login-link">
            <button onClick={() => setView('adminLogin')}>Acesso Admin</button>
        </div>
        
        {pastResults.length > 0 && (
            <div className="past-results">
                <h3>Resultados Locais</h3>
                <ul>
                    {pastResults.map((result, index) => (
                        <li key={index}>
                            {result.date} - {result.nickname}: {result.foco}
                        </li>
                    ))}
                </ul>
                <button onClick={handleClearHistory} className="clear-history-btn">
                    Limpar Histórico Local
                </button>
            </div>
        )}
    </div>
  );

  // Tela 2: Quiz
  const renderQuiz = () => {
    if (loading) {
        return <div className="loading-spinner">Carregando questões...</div>;
    }
    if (!questions || questions.length === 0) {
        return <div className="error-message">Nenhuma questão encontrada.</div>;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
        return <div className="error-message">Erro ao carregar a questão.</div>;
    }

    return (
        <div className="container question-container">
            <h2>Questão {currentQuestionIndex + 1} de {questions.length}</h2>
            <p className="question-enunciado">{currentQuestion.enunciado}</p>
            <div className="options-grid">
                {currentQuestion.opcoes.map(option => (
                    <button
                        key={option.id_o}
                        className="option-button"
                        onClick={() => handleAnswer(currentQuestion.id_q, option.id_o)}
                    >
                        {option.opcao}
                    </button>
                ))}
            </div>
            <div className="navigation-buttons">
                {currentQuestionIndex > 0 && (
                    <button onClick={handleBack} className="back-button">
                        Voltar
                    </button>
                )}
            </div>
        </div>
    );
  };

  // Tela 3: Resultado
  const renderResult = () => {
    if (loading) {
        return <div className="loading-spinner">Calculando seu resultado...</div>;
    }
    if (!finalResult) {
        return <div className="error-message">Erro ao calcular o resultado.</div>;
    }

    const mainFocoName = prettyFocusNames[finalResult.foco] || finalResult.foco;
    const mainFocoData = finalResult.topFocosRank.find(f => f.foco === finalResult.foco);
    const mainFocoPercent = mainFocoData ? mainFocoData.percentual.toFixed(2) : 'N/A';

    return (
        <div className="container result-container">
            <h1>Seu Resultado, {finalResult.nickname}!</h1>
            <h2>Sua área principal é:</h2>
            <h3 className="main-foco">{mainFocoName} ({mainFocoPercent}%)</h3>
            
            <div className="recommended-courses">
                <h4>Os 7 Cursos Mais Recomendados para você:</h4>
                <ol>
                    {finalResult.sugestoes.map((curso, index) => (
                        <li key={index}>{curso}</li>
                    ))}
                    {/* Se tiver menos de 7, preenche com hifens para manter o layout */}
                    {Array(7 - finalResult.sugestoes.length).fill().map((_, i) => (
                         <li key={`filler-${i}`}>-</li>
                    ))}
                </ol>
            </div>

            <div className="foco-ranking">
                <h4>Ranking Completo das Áreas:</h4>
                <ul>
                    {finalResult.topFocosRank.map(item => (
                        <li key={item.foco}>
                            <strong>{prettyFocusNames[item.foco] || item.foco}:</strong> {item.percentual.toFixed(2)}%
                        </li>
                    ))}
                </ul>
            </div>

            <button onClick={handleRestartTest} className="restart-button">
                Fazer o teste novamente
            </button>
        </div>
    );
  };

  // Tela 4: Login Admin
  const renderAdminLogin = () => (
    <div className="container admin-login-container">
        <h2>Login Mestre</h2>
        <form onSubmit={handleAdminLogin}>
            <input
                type="text"
                value={adminApelido}
                onChange={(e) => setAdminApelido(e.target.value)}
                placeholder="Apelido Mestre"
            />
            <div className="password-wrapper">
              <input
                  type={showAdminPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Senha Mestre"
              />
              <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)}>
                  {showAdminPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <button type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
            </button>
        </form>
        {adminError && <p className="error-message">{adminError}</p>}
        <button onClick={handleGoToRegister} className="back-button">
            Voltar
        </button>
    </div>
  );

  // Tela 5: Seleção de DB Admin
  const renderAdminDbSelect = () => (
      <div className="container db-select-container">
          <h2>Selecionar Banco</h2>
          <p>Qual banco de dados você deseja consultar?</p>
          <div className="db-buttons">
              <button onClick={() => { setAdminSelectedDb('new'); setView('history'); }}>
                  Banco Novo (Ativo)
              </button>
              <button onClick={() => { setAdminSelectedDb('old'); setView('history'); }}>
                  Banco Antigo (Legado)
              </button>
          </div>
          <button onClick={handleGoToRegister} className="back-button">
              Sair
          </button>
      </div>
  );

  // Tela 6: Histórico Admin
  const renderHistory = () => (
      <div className="container history-container">
          <h2>Histórico Global ({adminSelectedDb === 'new' ? 'Novo' : 'Antigo'})</h2>
          {historyLoading && <div className="loading-spinner">Carregando histórico...</div>}
          {adminError && <p className="error-message">{adminError}</p>}
          {!historyLoading && allDbResults.length === 0 && (
              <p>Nenhum resultado encontrado neste banco de dados.</p>
          )}
          <table className="history-table">
              <thead>
                  <tr>
                      <th>Apelido</th>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Área Principal</th>
                      <th>Ações</th>
                  </tr>
              </thead>
              <tbody>
                  {allDbResults.map((result) => (
                      <tr key={`${result.id_u}-${result.date}-${result.time}`}>
                          <td>{result.nickname}</td>
                          <td>{result.date}</td>
                          <td>{result.time}</td>
                          <td>{result.foco}</td>
                          <td>
                              <button onClick={() => handleViewHistoryDetails(result.id_u, result.nickname)}>
                                  Ver Detalhes
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <button onClick={() => setView('admin_db_select')} className="back-button">
              Trocar Banco
          </button>
          <button onClick={handleGoToRegister} className="back-button">
              Sair
          </button>
      </div>
  );

  // Tela 7: Detalhes do Histórico (Admin)
  const renderDetailView = () => (
      <div className="container detail-container">
          <h2>Detalhes de: {detailedUser?.nickname}</h2>
          {historyDetailsLoading && <div className="loading-spinner">Carregando detalhes...</div>}
          {adminError && <p className="error-message">{adminError}</p>}
          
          {/* --- SEÇÃO DO RANKING (NOVA) --- */}
          {!historyDetailsLoading && historyRanking && historyRanking.length > 0 && (
              <div className="detail-section ranking-details">
                  <h3>Ranking de Áreas (%)</h3>
                  <ul>
                      {historyRanking.map(item => (
                          <li key={item.foco}>
                              <strong>{prettyFocusNames[item.foco] || item.foco}:</strong> {item.percentual.toFixed(2)}%
                          </li>
                      ))}
                  </ul>
              </div>
          )}
           {!historyDetailsLoading && !historyRanking && adminSelectedDb === 'new' && !adminError && (
              <div className="detail-section">
                  <h3>Ranking de Áreas (%)</h3>
                  <p>Ranking não encontrado para este resultado (pode ser um teste antigo sem o JSON salvo).</p>
              </div>
           )}

          {/* --- SEÇÃO DE RESPOSTAS (ANTIGA) --- */}
          {!historyDetailsLoading && historyDetails && historyDetails.length > 0 && (
              <div className="detail-section qa-details">
                  <h3>Respostas Q&A</h3>
                  <ol>
                      {historyDetails.map((detail, index) => (
                          <li key={index}>
                              <p><strong>P:</strong> {detail.questoes.enunciado}</p>
                              <p><strong>R:</strong> {detail.opcoes.opcao}</p>
                          </li>
                      ))}
                  </ol>
              </div>
          )}

          {!historyDetailsLoading && (!historyDetails || historyDetails.length === 0) && !adminError && (
              <div className="detail-section">
                 <h3>Respostas Q&A</h3>
                 <p>Nenhuma resposta (Q&A) encontrada para este usuário.</p>
              </div>
          )}

          <button onClick={() => setView('history')} className="back-button">
              Voltar ao Histórico
          </button>
      </div>
  );


  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <div className="App">
      {/* Controles de fonte aparecem em todas as telas */}
      {renderFontControls()} 

      {/* Erro global (carregamento inicial) */}
      {error && view === 'register' && (
          <div className="container error-message global-error">
              <h2>Erro Crítico</h2>
              <p>{error}</p>
              <p>Por favor, recarregue a página e verifique sua conexão.</p>
          </div>
      )}

      {/* Carregamento inicial */}
      {loading && view === 'register' && !error && (
          <div className="loading-spinner global-load">Carregando dados do teste...</div>
      )}

      {/* Renderização condicional da view atual */}
      {!error && !loading && view === 'register' && renderRegister()}
      {view === 'quiz' && renderQuiz()}
      {view === 'result' && renderResult()}
      {view === 'adminLogin' && renderAdminLogin()}
      {view === 'admin_db_select' && renderAdminDbSelect()}
      {view === 'history' && renderHistory()}
      {view === 'detailView' && renderDetailView()}
    </div>
  );
}

export default App;