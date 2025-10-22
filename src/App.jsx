import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// Mapa de Nomes Bonitos (sem alterações)
const prettyFocusNames = { /* ...inalterado... */ 
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
  // Estados (sem alterações)
  /* ...estados inalterados... */
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

  // Efeitos (sem alterações lógicas significativas)
  useEffect(() => { // Carrega dados iniciais
    async function getInitialData() {
        setLoading(true);
        setError(null); // Limpa erros anteriores
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
             if (item.foco && typeof item.valor_maximo === 'number') { // Validação
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
             if (item.foco && item.curso_nome) { // Validação
              if (!acc[item.foco]) acc[item.foco] = [];
              acc[item.foco].push(item.curso_nome);
             } else {
               console.warn("Item de curso por foco inválido:", item);
             }
            return acc;
          }, {});
          if (Object.keys(courseMapObject).length === 0) console.warn("Nenhum curso por foco encontrado."); // Apenas um aviso
          setCourseMap(courseMapObject);

          // Carrega histórico local
          const savedResults = localStorage.getItem('testHistory');
          if (savedResults) {
              try {
                  setPastResults(JSON.parse(savedResults));
              } catch (parseError) {
                  console.error("Erro ao parsear histórico local:", parseError);
                  localStorage.removeItem('testHistory'); // Limpa se estiver corrompido
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
  }, []); // Roda apenas uma vez

  useEffect(() => { // Carrega histórico admin
    async function loadAdminHistory() {
      // Só executa se estiver na tela de histórico, for admin e um DB estiver selecionado
      if (view === 'history' && isMasterAdmin && adminSelectedDb) { 
        console.log(`[loadAdminHistory] Carregando histórico para DB: ${adminSelectedDb}`);
        setHistoryLoading(true); 
        setError(null); 
        setAdminError(null); 
        // Chama fetchAllResults e atualiza o estado com o resultado (ou array vazio em caso de erro)
        const results = await fetchAllResults(adminSelectedDb); 
        setAllDbResults(results);
        console.log(`[loadAdminHistory] Histórico carregado com ${results.length} resultados.`);
        // setHistoryLoading(false) é chamado dentro de fetchAllResults
      }
    }
    
    loadAdminHistory(); // Chama a função interna

    // Limpa resultados se sair da tela de histórico ou trocar admin/DB
    return () => {
      // Condição modificada para limpar apenas se não estiver mais na tela de histórico
      if (view !== 'history' && isMasterAdmin && adminSelectedDb) {
         console.log("[loadAdminHistory Cleanup] Limpando resultados do histórico (saindo da view 'history').");
         setAllDbResults([]);
      }
    };
  }, [view, isMasterAdmin, adminSelectedDb]); // Re-executa se a view, status de admin ou DB selecionado mudar

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

      // Limpa todas as classes de view
      Object.values(classMap).forEach(cls => bodyClassList.remove(cls));
      bodyClassList.remove('gif-active'); // Remove gif-active também

      const currentClass = classMap[view];
      if (currentClass) {
        bodyClassList.add(currentClass);
        // Adiciona gif-active se não for quiz
        if (view !== 'quiz') {
          bodyClassList.add('gif-active');
        }
      } else if (view !== 'quiz') {
         bodyClassList.add('gif-active'); // Default com gif
      }

      return () => {
        Object.values(classMap).forEach(cls => bodyClassList.remove(cls));
        bodyClassList.remove('gif-active');
      };
  }, [view]);

  useEffect(() => { // Ajuste de fonte
      const initialBaseSizeStr = document.documentElement.getAttribute('data-initial-font-size');
      let initialBaseSize = 16; // Default
      if (initialBaseSizeStr) {
        initialBaseSize = parseFloat(initialBaseSizeStr);
      } else {
        // Tenta pegar o tamanho computado atual como base na primeira vez
        const computedSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        initialBaseSize = computedSize;
        document.documentElement.setAttribute('data-initial-font-size', initialBaseSize.toString());
      }
      
      const newSize = initialBaseSize + fontSizeAdjustment; 
      document.documentElement.style.fontSize = `${newSize}px`;

  }, [fontSizeAdjustment]);

  // Funções de Fonte (sem alteração)
  function increaseFontSize() { setFontSizeAdjustment(adj => Math.min(adj + 2, 8)); }
  function decreaseFontSize() { setFontSizeAdjustment(adj => Math.max(adj - 2, -4)); }

  // --- FUNÇÕES DE ADMIN ---
  
  // Login Admin (sem alteração)
  async function handleAdminLogin(e) { /* ...código inalterado... */ 
    e.preventDefault();
    setAdminError(null);
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_mestre')
        .select('apelido, senha_hash') 
        .eq('apelido', adminApelido)
        .single();
    
      if (userError && userError.code !== 'PGRST116') throw userError; // Erro real
      if (!userData || userError) throw new Error('Apelido ou senha mestre incorretos.');

      const savedPassword = userData.senha_hash;
    
      // Comparação de texto plano
      if (adminPassword === savedPassword) {
        setIsMasterAdmin(true);
        setView('admin_db_select'); // Vai para a seleção de banco
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

  // Busca o histórico (com Horário de Brasília - sem alteração lógica)
  async function fetchAllResults(dbSource) { /* ...código inalterado... */ 
    // Loading/Error resetados antes de chamar
    let data, error;
    let results = []; 

    try {
      // Lógica do Banco Antigo
      if (dbSource === 'old') {
        ({ data, error } = await supabase
          .from('resultado_antigo')
          .select(`id_u, area_principal, usuarios_antigo(apelido, data_criacao)`)
          .order('id_r', { ascending: false })
          .limit(10000)); 
        if (error) throw new Error(`Banco Antigo: ${error.message}`);
        if (!data) throw new Error("Banco Antigo: Nenhum dado retornado."); // Verifica se data é nulo

        results = data.map(item => {
          const userData = item.usuarios_antigo || {};
          // Cria objeto Date, ou usa data atual como fallback
          const timestamp = userData.data_criacao ? new Date(userData.data_criacao) : new Date(); 
          return {
            id_u: item.id_u,
            nickname: userData.apelido || 'Usuário Deletado',
            // --- MUDANÇA: Formata em Brasília ---
            date: timestamp.toLocaleDateString('pt-BR', brasiliaDateOptions),
            time: timestamp.toLocaleTimeString('pt-BR', brasiliaTimeOptions),
            foco: prettyFocusNames[item.area_principal] || item.area_principal, 
          };
        });
      } 
      // Lógica do Banco Novo
      else {
        ({ data, error } = await supabase
          .from('resultado')
          .select(`id_u, foco_principal, usuarios(apelido, data_criacao)`)
          .order('id_r', { ascending: false }) 
          .limit(10000)); 
        if (error) throw new Error(`Banco Novo: ${error.message}`);
         if (!data) throw new Error("Banco Novo: Nenhum dado retornado."); // Verifica se data é nulo


        results = data.map(item => {
          const userData = item.usuarios || {};
          const timestamp = userData.data_criacao ? new Date(userData.data_criacao) : new Date(); 
          return {
            id_u: item.id_u,
            nickname: userData.apelido || 'Usuário Deletado',
            // --- MUDANÇA: Formata em Brasília ---
            date: timestamp.toLocaleDateString('pt-BR', brasiliaDateOptions),
            time: timestamp.toLocaleTimeString('pt-BR', brasiliaTimeOptions),
            foco: prettyFocusNames[item.foco_principal] || item.foco_principal,
          };
        });
      }
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
      // Define o erro para ser mostrado na tela
      setAdminError(`Falha ao carregar histórico: ${err.message}. Verifique o RLS.`); 
      results = []; // Garante que a lista fique vazia em caso de erro
    } finally {
      setHistoryLoading(false); // Termina o loading aqui, após try/catch
    }
    return results; // Retorna os resultados (ou array vazio)
  }

  // Busca detalhes (com Logs - sem alteração lógica)
  async function handleViewHistoryDetails(userId, userNickname) { /* ...código com console.log inalterado... */ 
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
    setAdminError(null); 

    const isOldDb = adminSelectedDb === 'old';
    const respostasTable = isOldDb ? 'respostas_usuario_antigo' : 'respostas_usuario';
    const questoesTable = isOldDb ? 'questoes_antigo' : 'questoes';
    const opcoesTable = isOldDb ? 'opcoes_antigo' : 'opcoes';
    console.log(`[handleViewHistoryDetails] Usando tabelas: ${respostasTable}, ${questoesTable}, ${opcoesTable}`);

    try {
      // 1. Buscar Respostas
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
        // Não definir erro aqui, apenas mostrar lista vazia
        // setAdminError("Nenhuma resposta encontrada para este usuário."); 
        setHistoryDetailsLoading(false);
        return;
      }

      // 2. Coletar IDs (Filtrando nulos/undefined explicitamente)
      const questionIds = [...new Set(respostasData.map(r => r.id_q))].filter(id => id != null); 
      const optionIds = [...new Set(respostasData.map(r => r.id_o))].filter(id => id != null);   
      console.log(`[handleViewHistoryDetails] IDs de Questões válidos:`, questionIds);
      console.log(`[handleViewHistoryDetails] IDs de Opções válidos:`, optionIds);

        // Verifica se há IDs válidos para buscar
        if (questionIds.length === 0 || optionIds.length === 0) {
             const missingIdsMsg = `Dados de ${questionIds.length === 0 ? 'questões' : 'opções'} ausentes nas respostas encontradas (${respostasData.length} respostas). Verifique a integridade dos dados em ${respostasTable} para o usuário ${userId}.`;
             console.warn(`[handleViewHistoryDetails] ${missingIdsMsg}`);
             setAdminError(missingIdsMsg); // Informa sobre a inconsistência
             setHistoryDetails([]);
             setHistoryDetailsLoading(false);
             return;
        }

      // 3. Buscar Textos
      console.log(`[handleViewHistoryDetails] Buscando textos da tabela ${questoesTable} para ${questionIds.length} IDs`);
      const { data: questoesData, error: questoesError } = await supabase
        .from(questoesTable)
        .select('id_q, enunciado')
        .in('id_q', questionIds);
      if (questoesError) throw new Error(`ao buscar ${questoesTable}: ${questoesError.message}. VERIFIQUE O RLS!`);
      console.log(`[handleViewHistoryDetails] Questões encontradas:`, questoesData);
      // Verifica se a busca retornou dados
      if (!questoesData || questoesData.length === 0) { 
         // Se não encontrou NENHUMA questão, lança um erro mais claro
         console.error(`[handleViewHistoryDetails] ERRO: Nenhuma questão encontrada para os IDs ${questionIds}. Verifique RLS de ${questoesTable}.`);
         throw new Error(`Nenhuma questão encontrada em ${questoesTable} para os IDs fornecidos. Verifique o RLS.`);
      } else if (questoesData.length < questionIds.length) {
         // Se encontrou algumas, mas não todas, apenas avisa
         console.warn(`[handleViewHistoryDetails] Nem todas as questões (${questoesData.length}/${questionIds.length}) foram encontradas. IDs faltantes podem indicar dados inconsistentes.`);
      }


      console.log(`[handleViewHistoryDetails] Buscando textos da tabela ${opcoesTable} para ${optionIds.length} IDs`);
      const { data: opcoesData, error: opcoesError } = await supabase
        .from(opcoesTable)
        .select('id_o, opcao')
        .in('id_o', optionIds);
      if (opcoesError) throw new Error(`ao buscar ${opcoesTable}: ${opcoesError.message}. VERIFIQUE O RLS!`);
      console.log(`[handleViewHistoryDetails] Opções encontradas:`, opcoesData);
       // Verifica se a busca retornou dados
       if (!opcoesData || opcoesData.length === 0) {
         console.error(`[handleViewHistoryDetails] ERRO: Nenhuma opção encontrada para os IDs ${optionIds}. Verifique RLS de ${opcoesTable}.`);
         throw new Error(`Nenhuma opção encontrada em ${opcoesTable} para os IDs fornecidos. Verifique o RLS.`);
      } else if (opcoesData.length < optionIds.length) {
         console.warn(`[handleViewHistoryDetails] Nem todas as opções (${opcoesData.length}/${optionIds.length}) foram encontradas. IDs faltantes podem indicar dados inconsistentes.`);
      }

      // 4. Mapear Textos (Garante que dados existem antes de mapear)
      const questoesMap = new Map((questoesData || []).map(q => [q.id_q, q.enunciado]));
      const opcoesMap = new Map((opcoesData || []).map(o => [o.id_o, o.opcao]));
      console.log(`[handleViewHistoryDetails] Mapa de questões criado com ${questoesMap.size} entradas.`);
      console.log(`[handleViewHistoryDetails] Mapa de opções criado com ${opcoesMap.size} entradas.`);

      // 5. Combinar
      const combinedDetails = respostasData
         // Filtra respostas que não têm questão ou opção correspondente nos mapas
         .filter(resposta => questoesMap.has(resposta.id_q) && opcoesMap.has(resposta.id_o)) 
         .map(resposta => ({
            questoes: {
            enunciado: questoesMap.get(resposta.id_q) // Já sabemos que existe pelo filter
            },
            opcoes: {
            opcao: opcoesMap.get(resposta.id_o) // Já sabemos que existe pelo filter
            }
      }));
        
      // Avisa se alguma resposta foi filtrada por inconsistência
      if (combinedDetails.length < respostasData.length) {
          console.warn(`[handleViewHistoryDetails] ${respostasData.length - combinedDetails.length} respostas foram ignoradas por falta de questão/opção correspondente.`);
          // Opcional: Adicionar um aviso no adminError?
          // setAdminError(prev => prev ? `${prev} Algumas respostas podem não estar sendo exibidas devido a dados inconsistentes.` : `Algumas respostas podem não estar sendo exibidas devido a dados inconsistentes.`);
      }

      console.log(`[handleViewHistoryDetails] Detalhes combinados (válidos):`, combinedDetails);

      // Define os detalhes APENAS se houver algo para mostrar após a filtragem
      setHistoryDetails(combinedDetails.length > 0 ? combinedDetails : []); 


    } catch (err) {
      console.error("[handleViewHistoryDetails] Erro durante a busca:", err);
      // Mostra o erro específico no adminError para o usuário ver
      setAdminError(`Erro ${err.message}. Verifique o RLS e a consistência dos dados.`);
      setHistoryDetails([]); // Garante que a lista fique vazia em caso de erro
    } finally {
      console.log(`[handleViewHistoryDetails] Finalizando busca.`);
      setHistoryDetailsLoading(false);
    }
  }


  // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---
  
  // Funções handleGoToRegister, handleRegister, handleAnswer, handleBack, 
  // handleRestartTest, handleSaveResult, handleClearHistory, handleSubmitTest 
  // (sem alterações lógicas significativas)
  /* ...código inalterado... */
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
        
        // Reseta os novos estados
        setAdminSelectedDb(null);
        setDetailedUser(null); 
        setHistoryDetails(null);
        setAdminError(null);
        setError(null); // Limpa o erro global
        // Limpa a base da fonte ao voltar para o início
        document.documentElement.removeAttribute('data-initial-font-size'); 
        document.documentElement.style.fontSize = ''; // Reseta o estilo inline

        setView('register');
    }
    
    async function handleRegister(e) { 
        e.preventDefault();
        setRegistrationError(null);
        setError(null); // Limpa erro global

        if (!userNickname.trim()) {
        setRegistrationError('Por favor, digite um apelido.');
        return;
        }
        setLoading(true);

        try {
        const { data, error: insertError } = await supabase
            .from('usuarios') 
            .insert({ apelido: userNickname.trim() })
            .select('id_u') // Seleciona apenas o ID necessário
            .single(); // Espera um único resultado
        
        if (insertError) throw insertError;
        
        setUserId(data.id_u);
        setCurrentQuestionIndex(0);
        setUserAnswers([]); // Limpa respostas anteriores se houver
        setView('quiz');

        } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        if (err.code === '23505') { // Código para violação de unique constraint
            setRegistrationError('Apelido já em uso. Por favor, escolha outro.');
        } else {
            setError('Erro ao cadastrar usuário. Tente novamente mais tarde.');
        }
        } finally {
        setLoading(false);
        }
    }
    
    function handleAnswer(questionId, optionId) { 
        // Atualiza as respostas do usuário
        setUserAnswers(prevAnswers => {
             // Remove a resposta anterior para esta pergunta, se houver
            const filtered = prevAnswers.filter(answer => answer.id_q !== questionId);
             // Adiciona a nova resposta
            return [...filtered, { id_u: userId, id_q: questionId, id_o: optionId }];
        });

        // Avança ou finaliza
        if (currentQuestionIndex === questions.length - 1) {
            // Chama handleSubmitTest com o estado atualizado (após a renderização)
             // Precisamos garantir que o estado `userAnswers` esteja atualizado antes de chamar
             // Uma forma é passar as 'newAnswers' diretamente, como antes:
             const newAnswers = [...userAnswers.filter(a => a.id_q !== questionId), { id_u: userId, id_q: questionId, id_o: optionId }];
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
            // Garante que o foco seja traduzido, ou usa o original
            foco: prettyFocusNames[result.foco] || result.foco || 'Foco Desconhecido'
        };
        const currentHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
        // Evita duplicatas (comparação mais robusta)
        if (!currentHistory.some(r => 
            r.nickname === resultToSave.nickname && 
            r.date === resultToSave.date && 
            r.foco === resultToSave.foco
        )) {
            const newHistory = [...currentHistory, resultToSave];
            setPastResults(newHistory); // Atualiza o estado
            localStorage.setItem('testHistory', JSON.stringify(newHistory));
        } else {
             console.log("Resultado duplicado no histórico local, não salvo novamente.");
        }
        } catch (e) {
        console.error("Erro ao salvar no localStorage:", e);
        // Opcional: Informar o usuário sobre o erro?
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

   async function handleSubmitTest(answers) { 
     setLoading(true);
    setError(null); // Limpa erros antes de processar

    // Validação básica das respostas
    if (!answers || answers.length === 0) {
        setError("Nenhuma resposta fornecida para processar.");
        setLoading(false);
        setView('quiz'); // Volta para o quiz
        return;
    }
     if (answers.length !== questions.length) {
         console.warn(`Número de respostas (${answers.length}) diferente do número de questões (${questions.length}). Processando mesmo assim.`);
         // Poderia adicionar um erro mais forte se necessário
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
            console.warn(`Questão ID ${answer.id_q} não encontrada nos dados carregados.`);
            return; // Pula se questão não for encontrada
        }
        const option = question.opcoes?.find(o => o.id_o === answer.id_o); // Usa optional chaining
        if (!option) {
             console.warn(`Opção ID ${answer.id_o} não encontrada para a questão ID ${answer.id_q}.`);
             return; // Pula se opção não for encontrada
        }
        
        if (option.pontuacao && Array.isArray(option.pontuacao)) { // Verifica se pontuacao existe e é array
          option.pontuacao.forEach(p => {
             if (p.foco && typeof p.valor === 'number') { // Valida cada item da pontuação
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
       let hasValidScore = false; // Flag para verificar se algum percentual foi calculado
      Object.keys(scoreMap).forEach(foco => {
        const rawScore = scoreMap[foco];
        const maxScore = maxScores[foco]; 
        if (typeof maxScore === 'number' && maxScore > 0) { // Verifica se maxScore é número > 0
            percentMap[foco] = (rawScore / maxScore) * 100;
            hasValidScore = true; // Marcar que pelo menos um score foi calculado
        } else {
            percentMap[foco] = 0;
            if (maxScore === 0) console.warn(`Pontuação máxima para "${foco}" é zero.`);
            else if (typeof maxScore === 'undefined') console.warn(`Pontuação máxima para "${foco}" não encontrada no estado 'maxScores'. Verifique a tabela 'foco_pontuacao_maxima'.`);
            else console.warn(`Valor inválido para pontuação máxima de "${foco}":`, maxScore);
        }
      });
       console.log("PercentMap (pontuação normalizada):", percentMap);

       // Se nenhum score válido foi calculado, lança erro
       if (!hasValidScore) {
           throw new Error("Não foi possível calcular nenhum percentual válido. Verifique os dados de pontuação e pontuações máximas.");
       }


      // 4. Ordena os Focos
      let focosOrdenados = Object.entries(percentMap)
        .map(([foco, percentual]) => ({ 
          foco, 
          percentual: parseFloat(percentual.toFixed(2)) || 0 // Garante que seja número
        }))
        .sort((a, b) => b.percentual - a.percentual);
        console.log("Focos Ordenados:", focosOrdenados);


      // 5. LÓGICA 7 CURSOS (3-2-2)
      const top3Focos = focosOrdenados.slice(0, 3);
        // Validação mais forte: Garante que o primeiro foco existe e tem nome
       if (top3Focos.length === 0 || !top3Focos[0]?.foco) { 
           console.error("Erro: Nenhum foco principal válido encontrado após ordenação.", focosOrdenados);
           throw new Error("Não foi possível determinar a área principal. Verifique os cálculos de pontuação.");
       }
  
      const suggestedCourses = [];
      const getCourses = (foco, count) => {
         const courses = courseMap[foco] || [];
         if (courses.length === 0) console.warn(`Nenhum curso encontrado para o foco "${foco}".`);
         return courses.slice(0, count);
      };

      suggestedCourses.push(...getCourses(top3Focos[0].foco, 3));
      if (top3Focos.length > 1 && top3Focos[1]?.foco) suggestedCourses.push(...getCourses(top3Focos[1].foco, 2));
      if (top3Focos.length > 2 && top3Focos[2]?.foco) suggestedCourses.push(...getCourses(top3Focos[2].foco, 2));

      const final7Courses = suggestedCourses.slice(0, 7);
      const focoPrincipal = top3Focos[0];
      const nomeFocoPrincipal = focoPrincipal.foco; 
       console.log("Sugestões de Cursos (Top 7):", final7Courses);

      // 6. Estrutura do Resultado Final
      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'), // Usar data local para o resultado atual
        foco: nomeFocoPrincipal,   
        topFocosRank: focosOrdenados, 
        sugestoes: final7Courses
      };

      // 7. Salva o Resultado Principal no Banco
        console.log("Salvando resultado principal no DB:", { id_u: userId, foco_principal: nomeFocoPrincipal, percentual_principal: focoPrincipal.percentual });
      const { error: saveError } = await supabase
        .from('resultado')
        .insert({
          id_u: userId,
          foco_principal: nomeFocoPrincipal,
          percentual_principal: focoPrincipal.percentual
        }); // Não precisa do .select() aqui

      // Não lança erro se for 'unique constraint', apenas loga
      if (saveError && saveError.code !== '23505') {
        throw new Error(`ao salvar resultado: ${saveError.message}`);
      } else if (saveError?.code === '23505') {
        console.warn('Resultado para este usuário já existe no DB (ignorado).');
      } else {
          console.log("Resultado principal salvo no DB com sucesso.");
      }
      
      setFinalResult(currentResult);
      handleSaveResult(currentResult); 
      setView('result');

    } catch (err) {
      console.error("Erro ao submeter o teste:", err);
      setError(`Erro ao processar o teste: ${err.message}. Tente novamente.`);
      setView('register'); // Volta para o início em caso de erro grave
    } finally {
      setLoading(false);
    }
  }


  // --- RENDERIZAÇÃO ---

  // Loading Global
  if (loading && view !== 'history' && view !== 'detailView') { 
    return <div className="loading">Carregando...</div>;
  }

  // Error Global
  if (error) {
    // ... (renderização do erro inalterada) ...
     return (
      <div className="app-container nickname-page"> {/* Usa estilo de página inicial */}
        <h1>Erro Inesperado</h1>
        <div className="error-message">
          <p>{error}</p>
        </div>
        <div className="extra-buttons">
          <button onClick={handleGoToRegister} className="back-to-test-button">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Switch de Telas
  switch (view) {
    case 'register': return ( /* ...JSX inalterado... */ 
        <div className="app-container">
          <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
          <h1>Teste Vocacional</h1>
          <form onSubmit={handleRegister} className="register-form">
            <p>Qual seu apelido?</p>
            <input type="text" value={userNickname} onChange={(e) => setUserNickname(e.target.value)} placeholder="Seu apelido aqui" required />
            <button type="submit" className="start-button">Começar o Teste</button>
          </form>
          {registrationError && <div className="error-message"><p>{registrationError}</p></div>}
          <div className="font-controls">
            <button onClick={decreaseFontSize} className="font-toggle-button" aria-label="Diminuir tamanho da fonte">A-</button>
            <button onClick={increaseFontSize} className="font-toggle-button" aria-label="Aumentar tamanho da fonte">A+</button>
          </div>
 	 	 </div>
     );
  	 case 'adminLogin': return ( /* ...JSX inalterado... */ 
        <div className="app-container">
          <div className="admin-trigger" onClick={handleGoToRegister} title="Voltar ao Início"></div>
          <h1>Acesso Administrativo</h1>
          <form onSubmit={handleAdminLogin} className="register-form">
            <p>Apelido Mestre:</p>
            <input type="text" value={adminApelido} onChange={(e) => setAdminApelido(e.target.value)} placeholder="Apelido do Administrador" required />
            <p>Senha:</p>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto 15px' }}>
              <input type={showAdminPassword ? 'text' : 'password'} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="********" required style={{ width: '100%', padding: '10px', paddingRight: '40px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ccc' }} />
              <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#2e2e2e', fontSize: '1.2rem' }} aria-label={showAdminPassword ? 'Esconder senha' : 'Mostrar senha'}>
                {showAdminPassword ? '🔒' : '👁️'}
              </button>
            </div>
            <button type="submit" className="start-button" disabled={loading}>{loading ? 'Entrando...' : 'Entrar como Administrador'}</button>
          </form>
          {adminError && <div className="error-message"><p>{adminError}</p></div>}
          <div className="extra-buttons">
            <button onClick={handleGoToRegister} className="back-button">Voltar</button>
          </div>
        </div>
     );
  	 case 'admin_db_select': return ( /* ...JSX inalterado... */ 
        <div className="app-container">
          <div className="admin-trigger" onClick={handleGoToRegister} title="Sair do modo Admin"></div>
          <h1>Seleção de Histórico</h1>
          <p>Olá, {adminApelido}. De qual banco de dados você deseja ver o histórico?</p>
          <div className="admin-db-select-buttons">
            <button className="start-button" onClick={() => { setAdminSelectedDb('new'); setView('history'); }}>Histórico (Novo Banco)</button>
            <button className="start-button" onClick={() => { setAdminSelectedDb('old'); setView('history'); }}>Histórico (Antigo Banco)</button>
          </div>
          <div className="extra-buttons">
            <button onClick={handleGoToRegister} className="back-button">Sair</button>
          </div>
        </div>
     );
  	 case 'quiz': { /* ...JSX inalterado... */ 
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return <div className="loading">Carregando questão...</div>; 
        const selectedOptionId = userAnswers.find(a => a.id_q === currentQuestion.id_q)?.id_o; 
        
        return (
          <div className="app-container">
            <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
            <h1>Teste Vocacional</h1>
            <p className="question-text">Questão {currentQuestionIndex + 1} de {questions.length}</p>
            <div className="question-item">
              <p className="question-enunciado">{currentQuestion.enunciado}</p>
              <div className="options-container option-buttons-container">
                {currentQuestion.opcoes.map(o => (
                  <button key={o.id_o} className={`option-button ${selectedOptionId === o.id_o ? 'selected' : ''}`} onClick={() => handleAnswer(currentQuestion.id_q, o.id_o)} aria-pressed={selectedOptionId === o.id_o}>
                    {o.opcao}
                  </button>
                ))}
              </div>
            </div>
            <div className="extra-buttons">
              {currentQuestionIndex > 0 && (<button onClick={handleBack} className="back-button">Voltar</button>)}
              <button onClick={handleRestartTest} className="restart-button">Reiniciar Teste</button>
            </div>
          </div>
        );
     }
  	 case 'result': { /* ...JSX inalterado... */ 
        if (!finalResult) { 
         console.warn("Tentativa de renderizar 'result' sem 'finalResult'. Voltando ao registro.");
         setView('register'); 
         return null; 
        }
        const focoPrincipalBD = finalResult.foco; 
        const focoPrincipalNomeBonito = prettyFocusNames[focoPrincipalBD] || focoPrincipalBD;

        return (
          <div className="app-container">
            <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
            <h1>Seu Resultado</h1>
            <p className="result-text">Olá, {userNickname || finalResult.nickname}! Sua área principal de interesse é:</p> 
            <div className="main-result"> <p className="result-area-principal">{focoPrincipalNomeBonito}</p> </div>
            {finalResult.sugestoes?.length > 0 && ( 
              <div className="suggestions-courses">
                <h2>Os 7 Cursos Mais Recomendados para seu perfil:</h2>
                <ul className="suggestions">
                  {finalResult.sugestoes.map((curso, index) => (<li key={index}><strong>{index + 1}º. {curso}</strong></li>))}
                </ul>
              </div>
            )}
            <div className="extra-buttons">
              <button onClick={() => setView('history')} className="history-button">Ver Histórico</button>
              <button onClick={handleRestartTest} className="restart-button">Reiniciar Teste</button>
            </div>
          </div>
        );
     }
  	 case 'history': { /* ...JSX inalterado... */ 
        const displayedResults = isMasterAdmin ? allDbResults : pastResults;
        const historyTitle = isMasterAdmin ? `Histórico Geral (${adminSelectedDb === 'new' ? 'Novo Banco' : 'Antigo Banco'})` : 'Seu Histórico Local';
        
        return (
          <div className="app-container">
            <div className="admin-trigger" onClick={handleGoToRegister} title={isMasterAdmin ? "Sair do modo Admin" : "Voltar ao Início"}></div>
            <h1>{historyTitle}</h1>
            {adminError && <div className="error-message"><p>{adminError}</p></div>}
            {historyLoading && <div className="loading">Carregando histórico...</div>}
            {!historyLoading && displayedResults.length > 0 ? (
              <>
                <ul className="result-list">
                  {displayedResults.map((result, index) => (
                    <li key={`${result.id_u || 'local'}-${index}`} className="result-item"> 
                      <div>
                        {isMasterAdmin && result.id_u ? ( 
                          <button className="history-nickname-button" onClick={() => handleViewHistoryDetails(result.id_u, result.nickname)} title="Ver respostas do usuário">
                            Apelido: <strong>{result.nickname}</strong> 
                          </button>
                        ) : ( <div>Apelido: <strong>{result.nickname}</strong></div> )}
                      </div>
                      <div>Data: {result.date} {isMasterAdmin && result.time ? `às ${result.time}` : ''}</div>
                      <div>Área Principal: {result.foco}</div>
                    </li>
                  ))}
                </ul>
                <div className="extra-buttons">
                  {!isMasterAdmin && (<button onClick={handleClearHistory} className="clear-history-button">Limpar Histórico Local</button>)}
                  {isMasterAdmin && ( <button onClick={() => { setView('admin_db_select'); setAllDbResults([]); setAdminError(null); }} className="back-button">Trocar Banco</button>)}
                  <button onClick={handleGoToRegister} className="back-to-test-button">{isMasterAdmin ? 'Sair do Admin' : 'Voltar para Registro'}</button>
                </div>
              </>
            ) : ( !historyLoading && !adminError && ( <> <p>Nenhum resultado {isMasterAdmin ? 'encontrado neste banco de dados.' : 'anterior encontrado localmente.'}</p> <div className="extra-buttons"> {isMasterAdmin && ( <button onClick={() => { setView('admin_db_select'); setAllDbResults([]); setAdminError(null);}} className="back-button">Trocar Banco</button>)} <button onClick={handleGoToRegister} className="back-to-test-button">Voltar para Registro</button> </div> </> ) )}
          </div>
        );
     }
      case 'detailView': { /* ...JSX inalterado... */ 
        if (!detailedUser) { 
          console.warn("Tentativa de acessar 'detailView' sem 'detailedUser'. Voltando ao histórico.");
          setView('history');
          return null;
        }
        return (
          <div className="app-container detail-page-container"> 
            <div className="admin-trigger" onClick={() => { setView('history'); setHistoryDetails(null); setDetailedUser(null); setAdminError(null); }} title="Voltar ao Histórico"></div>
            <h1>Respostas de {detailedUser.nickname}</h1>
            {adminError && <div className="error-message"><p>{adminError}</p></div>}
            {historyDetailsLoading && <div className="loading">Carregando respostas...</div>}
            {!historyDetailsLoading && historyDetails && historyDetails.length > 0 && (
              <ul className="history-details-list">
                {historyDetails.map((detail, index) => (
                  <li key={index} className="history-detail-item">
                    <p><strong>Pergunta:</strong> {detail.questoes.enunciado}</p>
                    <p><strong>Resposta:</strong> {detail.opcoes.opcao}</p>
                  </li>
                ))}
              </ul>
            )}
            {!historyDetailsLoading && historyDetails?.length === 0 && !adminError && ( 
              <p>Nenhuma resposta encontrada para este usuário ou falha ao carregar detalhes.</p>
            )}
            {!historyDetailsLoading && ( 
              <div className="extra-buttons">
                <button onClick={() => { setView('history'); setHistoryDetails(null); setDetailedUser(null); setAdminError(null);}} className="back-button"> Voltar para o Histórico </button>
              </div>
            )}
          </div>
        );
      }
  	 default:
        console.warn(`View desconhecida: ${view}. Voltando ao registro.`);
        setView('register'); // Segurança
  	 	 return null;
  }
}

export default App;