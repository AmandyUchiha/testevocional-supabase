import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// Mapa de Nomes Bonitos (sem alterações)
const prettyFocusNames = {
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
  'Áreas Técnicas e Científicas': 'Técnicas e Científicas (Antigo)',
  'Áreas Criativas': 'Criativas (Antigo)',
  'Áreas de Saúde e Bem-Estar': 'Saúde e Bem-Estar (Antigo)',
  'Áreas de Administração e Negócios': 'Administração e Negócios (Antigo)',
  'Áreas Humanas e Sociais': 'Humanas e Sociais (Antigo)',
  'Nenhuma Área': 'Nenhuma Área (Antigo)'
};

// Opções de formatação para Horário de Brasília
const brasiliaDateTimeOptions = {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric'
};
const brasiliaDateOptions = {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: 'numeric', day: 'numeric'
};
const brasiliaTimeOptions = {
  timeZone: 'America/Sao_Paulo',
  hour: 'numeric', minute: 'numeric', second: 'numeric'
};

function App() {
  // Estados (sem alterações significativas)
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

 // Efeitos (sem alterações, exceto useEffect de classes do body)

  useEffect(() => { // Carrega dados iniciais
    async function getInitialData() {
        setLoading(true);
        // ... (lógica de busca inalterada) ...
        try {
          // Busca Questões/Opções/Pontuação
          const { data: questionsData, error: questionsError } = await supabase
            .from('questoes')
            .select(`id_q, enunciado, opcoes(id_o, opcao, pontuacao(foco, valor))`);
          if (questionsError) throw questionsError;
          setQuestions(questionsData);

          // Busca Pontuações Máximas
          const { data: maxScoresData, error: maxScoresError } = await supabase
            .from('foco_pontuacao_maxima')
            .select('foco, valor_maximo');
          if (maxScoresError) throw maxScoresError;
          const maxScoresMap = maxScoresData.reduce((acc, item) => {
            acc[item.foco] = item.valor_maximo;
            return acc;
          }, {});
          setMaxScores(maxScoresMap);

          // Busca Mapeamento de Cursos
          const { data: coursesData, error: coursesError } = await supabase
            .from('cursos_por_foco')
            .select('foco, curso_nome');
          if (coursesError) throw coursesError;
          const courseMapObject = coursesData.reduce((acc, item) => {
            if (!acc[item.foco]) acc[item.foco] = [];
            acc[item.foco].push(item.curso_nome);
            return acc;
          }, {});
          setCourseMap(courseMapObject);

          // Carrega histórico local
          const savedResults = localStorage.getItem('testHistory');
          if (savedResults) setPastResults(JSON.parse(savedResults));

        } catch (err) {
          console.error('Erro ao carregar dados iniciais:', err);
          setError('Falha ao carregar os dados necessários para o teste. Verifique sua conexão e tente recarregar a página.');
        } finally {
          setLoading(false);
        }
      }
      getInitialData();
  }, []);

  useEffect(() => { // Carrega histórico admin
    async function loadAdminHistory() {
      if (isMasterAdmin && adminSelectedDb) { 
        setHistoryLoading(true); 
        setError(null); 
        setAdminError(null); 
        const results = await fetchAllResults(adminSelectedDb); 
        setAllDbResults(results);
      }
    }
    
    if (view === 'history') { 
      loadAdminHistory();
    }
    // Limpa resultados ao sair da tela de histórico ou trocar de DB
    return () => {
      if (view !== 'history') {
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
      const baseFontSize = 16;
      const currentFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || baseFontSize;
      // Calcula o novo tamanho baseando-se no tamanho *atual* + ajuste
      // Isso evita acumular ajustes se o useEffect rodar múltiplas vezes
      const initialBaseSize = parseFloat(document.documentElement.getAttribute('data-initial-font-size') || currentFontSize);
      if (!document.documentElement.hasAttribute('data-initial-font-size')) {
        document.documentElement.setAttribute('data-initial-font-size', initialBaseSize);
      }
      const newSize = initialBaseSize * (1 + fontSizeAdjustment / 16); // Ajuste proporcional
      
      document.documentElement.style.fontSize = `${newSize}px`;

      return () => {
        // Opcional: Resetar ao desmontar o App, mas talvez não seja necessário
        // document.documentElement.style.fontSize = '';
        // document.documentElement.removeAttribute('data-initial-font-size');
      };
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

  // --- MUDANÇA: fetchAllResults com Horário de Brasília ---
  async function fetchAllResults(dbSource) {
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

        results = data.map(item => {
          const userData = item.usuarios_antigo || {};
          const timestamp = userData.data_criacao ? new Date(userData.data_criacao) : new Date(); // Fallback para data atual
          return {
            id_u: item.id_u,
            nickname: userData.apelido || 'Usuário Deletado',
            // Formata em Brasília
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

        results = data.map(item => {
          const userData = item.usuarios || {};
          const timestamp = userData.data_criacao ? new Date(userData.data_criacao) : new Date(); // Fallback
          return {
            id_u: item.id_u,
            nickname: userData.apelido || 'Usuário Deletado',
            // Formata em Brasília
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

  // --- MUDANÇA: handleViewHistoryDetails com Logs ---
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
          setHistoryDetailsLoading(false);
          return;
        }

        // 2. Coletar IDs
        const questionIds = [...new Set(respostasData.map(r => r.id_q))];
        const optionIds = [...new Set(respostasData.map(r => r.id_o))];
        console.log(`[handleViewHistoryDetails] IDs de Questões:`, questionIds);
        console.log(`[handleViewHistoryDetails] IDs de Opções:`, optionIds);

        if (questionIds.length === 0 || optionIds.length === 0) {
             console.warn(`[handleViewHistoryDetails] Lista de IDs de questões ou opções vazia, apesar de haver respostas.`);
             setHistoryDetails([]);
             setHistoryDetailsLoading(false);
             return;
        }

        // 3. Buscar Textos
        console.log(`[handleViewHistoryDetails] Buscando textos da tabela ${questoesTable}`);
        const { data: questoesData, error: questoesError } = await supabase
          .from(questoesTable)
          .select('id_q, enunciado')
          .in('id_q', questionIds);
        if (questoesError) throw new Error(`ao buscar ${questoesTable}: ${questoesError.message}. VERIFIQUE O RLS!`);
        console.log(`[handleViewHistoryDetails] Questões encontradas:`, questoesData);
        if (!questoesData || questoesData.length === 0) {
           console.warn(`[handleViewHistoryDetails] Nenhuma questão encontrada para os IDs ${questionIds}. Verifique dados ou RLS de ${questoesTable}.`);
        }


        console.log(`[handleViewHistoryDetails] Buscando textos da tabela ${opcoesTable}`);
        const { data: opcoesData, error: opcoesError } = await supabase
          .from(opcoesTable)
          .select('id_o, opcao')
          .in('id_o', optionIds);
        if (opcoesError) throw new Error(`ao buscar ${opcoesTable}: ${opcoesError.message}. VERIFIQUE O RLS!`);
        console.log(`[handleViewHistoryDetails] Opções encontradas:`, opcoesData);
        if (!opcoesData || opcoesData.length === 0) {
           console.warn(`[handleViewHistoryDetails] Nenhuma opção encontrada para os IDs ${optionIds}. Verifique dados ou RLS de ${opcoesTable}.`);
        }

        // 4. Mapear Textos
        const questoesMap = new Map((questoesData || []).map(q => [q.id_q, q.enunciado]));
        const opcoesMap = new Map((opcoesData || []).map(o => [o.id_o, o.opcao]));
        console.log(`[handleViewHistoryDetails] Mapa de questões criado com ${questoesMap.size} entradas.`);
        console.log(`[handleViewHistoryDetails] Mapa de opções criado com ${opcoesMap.size} entradas.`);

        // 5. Combinar
        const combinedDetails = respostasData.map(resposta => ({
          questoes: {
            enunciado: questoesMap.get(resposta.id_q) || `[Questão ID ${resposta.id_q} não encontrada no mapa]`
          },
          opcoes: {
            opcao: opcoesMap.get(resposta.id_o) || `[Opção ID ${resposta.id_o} não encontrada no mapa]`
          }
        }));
        console.log(`[handleViewHistoryDetails] Detalhes combinados:`, combinedDetails);

        setHistoryDetails(combinedDetails);

      } catch (err) {
        console.error("[handleViewHistoryDetails] Erro durante a busca:", err);
        setAdminError(`Erro ${err.message}. Verifique o RLS e a consistência dos dados.`);
        setHistoryDetails([]);
      } finally {
        console.log(`[handleViewHistoryDetails] Finalizando busca.`);
        setHistoryDetailsLoading(false);
      }
  }

  // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---

  // Reseta estado e volta ao registro (sem alterações)
  function handleGoToRegister() { /* ...código inalterado... */ 
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
    setDetailedUser(null); // --- MUDANÇA ---
    setHistoryDetails(null);
    setAdminError(null);
    setError(null); // Limpa o erro global

    setView('register');
  }
 
  // Registro (sem alterações)
  async function handleRegister(e) { /* ...código inalterado... */ 
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
 
  // Salva resposta e avança (sem alterações)
  function handleAnswer(questionId, optionId) { /* ...código inalterado... */ 
    const filteredAnswers = userAnswers.filter((answer) => answer.id_q !== questionId);
    const newAnswers = [...filteredAnswers, { id_u: userId, id_q: questionId, id_o: optionId }];
    setUserAnswers(newAnswers);

    if (currentQuestionIndex === questions.length - 1) {
      handleSubmitTest(newAnswers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  // Volta questão (sem alterações)
  function handleBack() { /* ...código inalterado... */ 
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  // Reinicia teste (sem alterações)
  function handleRestartTest() { handleGoToRegister(); }

  // Salva resultado local (sem alterações)
  function handleSaveResult(result) { /* ...código inalterado... */ 
    try {
      const resultToSave = {
        ...result,
        foco: prettyFocusNames[result.foco] || result.foco 
      };
      const currentHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
      // Evita duplicatas se o usuário recarregar a página de resultado
      if (!currentHistory.some(r => r.nickname === resultToSave.nickname && r.date === resultToSave.date && r.foco === resultToSave.foco)) {
        const newHistory = [...currentHistory, resultToSave];
        setPastResults(newHistory);
        localStorage.setItem('testHistory', JSON.stringify(newHistory));
      }
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }
  }

  // Limpa histórico local (sem alterações)
  function handleClearHistory() { /* ...código inalterado... */ 
    try {
      setPastResults([]);
      localStorage.removeItem('testHistory');
    } catch (e) {
      console.error("Erro ao limpar localStorage:", e);
    }
  }

  // Processa e salva teste (sem alterações)
  async function handleSubmitTest(answers) { /* ...código inalterado... */ 
     setLoading(true);
    setError(null); // Limpa erros antes de processar

    try {
      // 1. Salva as Respostas
      const { error: answersError } = await supabase
        .from('respostas_usuario')
        .insert(answers);
      if (answersError) throw new Error(`ao salvar respostas: ${answersError.message}`);

      // 2. Calcula a Pontuação BRUTA
      const scoreMap = {};
      answers.forEach(answer => {
        const question = questions.find(q => q.id_q === answer.id_q);
        if (!question) return; // Pula se questão não for encontrada
        const option = question.opcoes.find(o => o.id_o === answer.id_o);
        if (option?.pontuacao) { // Usa optional chaining
          option.pontuacao.forEach(p => {
            scoreMap[p.foco] = (scoreMap[p.foco] || 0) + (p.valor || 0);
          });
        }
      });

      // 3. NORMALIZAÇÃO
      const percentMap = {};
      Object.keys(scoreMap).forEach(foco => {
        const rawScore = scoreMap[foco];
        const maxScore = maxScores[foco]; 
        if (maxScore && maxScore > 0) {
            percentMap[foco] = (rawScore / maxScore) * 100;
        } else {
            percentMap[foco] = 0;
            if (maxScore === 0) console.warn(`Pontuação máxima para "${foco}" é zero.`);
            else if (!maxScore) console.warn(`Pontuação máxima para "${foco}" não encontrada.`);
        }
      });


      // 4. Ordena os Focos
      let focosOrdenados = Object.entries(percentMap)
        .map(([foco, percentual]) => ({ 
          foco, 
          percentual: parseFloat(percentual.toFixed(2))
        }))
        .sort((a, b) => b.percentual - a.percentual);

      // 5. LÓGICA 7 CURSOS (3-2-2)
      const top3Focos = focosOrdenados.slice(0, 3);
      if (top3Focos.length === 0) throw new Error("Nenhum foco principal encontrado após cálculo.");
  
      const suggestedCourses = [];
      const getCourses = (foco, count) => (courseMap[foco] || []).slice(0, count);

      suggestedCourses.push(...getCourses(top3Focos[0].foco, 3));
      if (top3Focos.length > 1) suggestedCourses.push(...getCourses(top3Focos[1].foco, 2));
      if (top3Focos.length > 2) suggestedCourses.push(...getCourses(top3Focos[2].foco, 2));

      const final7Courses = suggestedCourses.slice(0, 7);
      const focoPrincipal = top3Focos[0];
       // Adiciona verificação para focoPrincipal
      if (!focoPrincipal || typeof focoPrincipal.foco === 'undefined' || typeof focoPrincipal.percentual === 'undefined') {
        throw new Error("Foco principal inválido ou não encontrado após ordenação.");
      }
      const nomeFocoPrincipal = focoPrincipal.foco; 

      // 6. Estrutura do Resultado Final
      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'),
        foco: nomeFocoPrincipal,   
        topFocosRank: focosOrdenados, 
        sugestoes: final7Courses
      };

      // 7. Salva o Resultado Principal no Banco
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
        <div className="error-message" style={{backgroundColor: '#ffdddd', border: '1px solid #ff0000', padding: '15px', borderRadius: '5px', textAlign: 'center', marginBottom: '20px'}}>
          <p style={{color: '#D8000C', margin: 0}}>{error}</p>
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
          {/* Botão Admin Trigger */}
          <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
          <h1>Teste Vocacional</h1>
          <form onSubmit={handleRegister} className="register-form">
            <p>Qual seu apelido?</p>
            <input
              type="text"
              value={userNickname}
              onChange={(e) => setUserNickname(e.target.value)}
              placeholder="Seu apelido aqui"
              required
            />
            <button type="submit" className="start-button">Começar o Teste</button>
          </form>
          {registrationError && <div className="error-message"><p>{registrationError}</p></div>}
          
          {/* Controles de Fonte */}
          <div className="font-controls">
            <button onClick={decreaseFontSize} className="font-toggle-button" aria-label="Diminuir tamanho da fonte">A-</button>
            <button onClick={increaseFontSize} className="font-toggle-button" aria-label="Aumentar tamanho da fonte">A+</button>
          </div>
 	 	 </div>
     );
  	 case 'adminLogin': return ( /* ...JSX inalterado... */ 
        <div className="app-container">
          {/* Botão Voltar Trigger */}
          <div className="admin-trigger" onClick={handleGoToRegister} title="Voltar ao Início"></div>
          <h1>Acesso Administrativo</h1>
          <form onSubmit={handleAdminLogin} className="register-form">
            <p>Apelido Mestre:</p>
            <input type="text" value={adminApelido} onChange={(e) => setAdminApelido(e.target.value)} placeholder="Apelido do Administrador" required />
            <p>Senha:</p>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto 15px' }}>
              <input
                type={showAdminPassword ? 'text' : 'password'}
                value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="********" required
                style={{ width: '100%', padding: '10px', paddingRight: '40px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ccc' }} 
              />
              <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)}
                style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#2e2e2e', fontSize: '1.2rem' }}
                aria-label={showAdminPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
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
          {/* Botão Sair Trigger */}
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
  	 case 'quiz': { /* ...JSX inalterado (com a correção do selectedOptionId)... */ 
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return <div className="loading">Carregando questão...</div>; 
        const selectedOptionId = userAnswers.find(a => a.id_q === currentQuestion.id_q)?.id_o; 
        
        return (
          <div className="app-container">
            {/* Botão Admin Trigger */}
            <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
            <h1>Teste Vocacional</h1>
            <p className="question-text">Questão {currentQuestionIndex + 1} de {questions.length}</p>
            <div className="question-item">
              <p className="question-enunciado">{currentQuestion.enunciado}</p>
              <div className="options-container option-buttons-container">
                {currentQuestion.opcoes.map(o => (
                  <button
                    key={o.id_o}
                    className={`option-button ${selectedOptionId === o.id_o ? 'selected' : ''}`} 
                    onClick={() => handleAnswer(currentQuestion.id_q, o.id_o)}
                    aria-pressed={selectedOptionId === o.id_o} // Melhora acessibilidade
                  >
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
  	 case 'result': { /* ...JSX inalterado (com a correção do userNickname)... */ 
        if (!finalResult) { 
         console.warn("Tentativa de renderizar 'result' sem 'finalResult'. Voltando ao registro.");
         setView('register'); // Volta para o início se não houver resultado
         return null; 
        }

        const focoPrincipalBD = finalResult.foco; 
        const focoPrincipalNomeBonito = prettyFocusNames[focoPrincipalBD] || focoPrincipalBD;

        return (
          <div className="app-container">
            {/* Botão Admin Trigger */}
            <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
            <h1>Seu Resultado</h1>
            <p className="result-text">Olá, {userNickname || finalResult.nickname}! Sua área principal de interesse é:</p> {/* Garante que o nickname apareça */}
            <div className="main-result">
              <p className="result-area-principal">{focoPrincipalNomeBonito}</p>
            </div>
            
            {/* Lista 7 Cursos */}
            {finalResult.sugestoes?.length > 0 && ( // Usa optional chaining
              <div className="suggestions-courses">
                <h2>Os 7 Cursos Mais Recomendados para seu perfil:</h2>
                <ul className="suggestions">
                  {finalResult.sugestoes.map((curso, index) => (
                    <li key={index}><strong>{index + 1}º. {curso}</strong></li>
                  ))}
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
  	 case 'history': { /* ...JSX inalterado (com a chamada handleViewHistoryDetails correta)... */ 
        const displayedResults = isMasterAdmin ? allDbResults : pastResults;
        const historyTitle = isMasterAdmin 
          ? `Histórico Geral (${adminSelectedDb === 'new' ? 'Novo Banco' : 'Antigo Banco'})`
          : 'Seu Histórico Local';
        
        return (
          <div className="app-container">
            {/* Botão Sair/Voltar Trigger */}
            <div className="admin-trigger" onClick={handleGoToRegister} title={isMasterAdmin ? "Sair do modo Admin" : "Voltar ao Início"}></div>
            
            <h1>{historyTitle}</h1>

          {/* Mostra erro específico do histórico, se houver */}
          {adminError && <div className="error-message" style={{backgroundColor: '#ffdddd', border: '1px solid #ff0000', padding: '10px', borderRadius: '5px', textAlign: 'center', marginBottom: '15px'}}><p style={{color: '#D8000C', margin: 0}}>{adminError}</p></div>}
              
          {/* Mostra loading específico do histórico */}
          {historyLoading && <div className="loading">Carregando histórico...</div>}

            {!historyLoading && displayedResults.length > 0 ? (
              <>
                <ul className="result-list">
                  {displayedResults.map((result, index) => (
                    <li key={`${result.id_u || 'local'}-${index}`} className="result-item"> {/* Chave mais robusta */}
                      <div>
                        {/* --- MUDANÇA: Botão chama handleView passando ID e Nickname --- */}
                        {isMasterAdmin && result.id_u ? ( // Só mostra botão se for admin e tiver ID
                          <button 
                            className="history-nickname-button" 
                            onClick={() => handleViewHistoryDetails(result.id_u, result.nickname)}
                            title="Ver respostas do usuário"
                          >
                            Apelido: <strong>{result.nickname}</strong> 
                          </button>
                        ) : (
                          <div>Apelido: <strong>{result.nickname}</strong></div>
                        )}
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
            ) : (
              // Só mostra "Nenhum resultado" se NÃO estiver carregando e NÃO houver erro
              !historyLoading && !adminError && (
                  <>
                    <p>Nenhum resultado {isMasterAdmin ? 'encontrado neste banco de dados.' : 'anterior encontrado localmente.'}</p>
                    <div className="extra-buttons">
                      {isMasterAdmin && ( <button onClick={() => { setView('admin_db_select'); setAllDbResults([]); setAdminError(null);}} className="back-button">Trocar Banco</button>)}
                      <button onClick={handleGoToRegister} className="back-to-test-button">Voltar para Registro</button>
                    </div>
                  </>
                )
            )}
          </div>
        );
     }
      // --- MUDANÇA: Nova Tela de Detalhes ---
      case 'detailView': {
        if (!detailedUser) { // Segurança
          console.warn("Tentativa de acessar 'detailView' sem 'detailedUser'. Voltando ao histórico.");
          setView('history');
          return null;
        }
        return (
          <div className="app-container detail-page-container"> 
            {/* Botão Voltar Trigger */}
            <div className="admin-trigger" onClick={() => { setView('history'); setHistoryDetails(null); setDetailedUser(null); setAdminError(null); }} title="Voltar ao Histórico"></div>
            
            <h1>Respostas de {detailedUser.nickname}</h1>

            {/* Mostra erro específico */}
            {adminError && <div className="error-message" style={{backgroundColor: '#ffdddd', border: '1px solid #ff0000', padding: '10px', borderRadius: '5px', textAlign: 'center', marginBottom: '15px'}}><p style={{color: '#D8000C', margin: 0}}>{adminError}</p></div>}

            {/* Loading */}
            {historyDetailsLoading && <div className="loading">Carregando respostas...</div>}

            {/* Detalhes */}
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

            {/* Sem detalhes */}
            {!historyDetailsLoading && historyDetails?.length === 0 && !adminError && ( // Só mostra se não houver erro
              <p>Nenhuma resposta encontrada para este usuário ou falha ao carregar detalhes.</p>
            )}

            {/* Botão Voltar */}
            {!historyDetailsLoading && ( 
              <div className="extra-buttons">
                <button 
                  onClick={() => { setView('history'); setHistoryDetails(null); setDetailedUser(null); setAdminError(null);}} 
                  className="back-button"
                >
                  Voltar para o Histórico
                </button>
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