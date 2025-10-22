import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// ========================================================================
// NOVO: MAPA DE "NOMES BONITOS"
// Mapeia os nomes do Banco de Dados (esquerda) para nomes amigáveis (direita)
// ========================================================================
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
  'Foco_Artes_Design': 'Artes, Design e Arquitetura'
  // Certifique-se que as chaves (esquerda) são IDÊNTICAS aos nomes no seu BD
};


function App() {
  // Estados Principais
  const [userId, setUserId] = useState(null);
  const [userNickname, setUserNickname] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [finalResult, setFinalResult] = useState(null); 
  const [pastResults, setPastResults] = useState([]);
  const [view, setView] = useState('register'); // Começa no registro

  // Controle de Acessibilidade (Fonte)
  const [fontSizeAdjustment, setFontSizeAdjustment] = useState(0);

  // Estados de Carga e Erro
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // LÓGICA DE NORMALIZAÇÃO
  const [maxScores, setMaxScores] = useState({}); // Armazena { 'Foco_TI': 45.0, ... }
  const [courseMap, setCourseMap] = useState({}); // Armazena { 'Foco_TI': ['Curso A', 'Curso B'], ... }


  // ESTADOS PARA O ADMIN
  const [adminApelido, setAdminApelido] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [allDbResults, setAllDbResults] = useState([]); // Histórico global
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false); 

  // --- NOVOS ESTADOS PARA FLUXO ADMIN (Request 3, 4, 5) ---
  const [adminSelectedDb, setAdminSelectedDb] = useState(null); // 'new' ou 'old'
  const [viewingHistoryDetails, setViewingHistoryDetails] = useState(null); // Guarda o id_u do usuário
  const [historyDetails, setHistoryDetails] = useState(null); // Guarda as respostas do usuário
  const [historyDetailsLoading, setHistoryDetailsLoading] = useState(false);


  // Efeito para carregar as questões E A LÓGICA DE CÁLCULO
  useEffect(() => {
    async function getInitialData() {
      setLoading(true);

      // 1. Buscar Questões e Opções (com o 'foco')
      const { data: questionsData, error: questionsError } = await supabase
        .from('questoes')
        .select(`
          id_q,
          enunciado,
          opcoes(id_o, opcao, pontuacao(foco, valor)) 
        `);

      if (questionsError) {
        console.error('Erro ao carregar questões:', questionsError);
        setError('Erro ao carregar os dados do teste.');
        setLoading(false);
        return;
      }
      setQuestions(questionsData);

      // 2. Buscar Pontuações Máximas
      const { data: maxScoresData, error: maxScoresError } = await supabase
        .from('foco_pontuacao_maxima')
        .select('foco, valor_maximo');

      if (maxScoresError) {
        console.error('Erro ao carregar pontuações máximas:', maxScoresError);
        setError('Erro ao carregar a lógica de cálculo.');
        setLoading(false);
        return;
      }
      
      const maxScoresMap = maxScoresData.reduce((acc, item) => {
        acc[item.foco] = item.valor_maximo;
        return acc;
      }, {});
      setMaxScores(maxScoresMap);

      // 3. Buscar Mapeamento de Cursos
      const { data: coursesData, error: coursesError } = await supabase
        .from('cursos_por_foco')
        .select('foco, curso_nome');

      if (coursesError) {
        console.error('Erro ao carregar sugestões de cursos:', coursesError);
        setError('Erro ao carregar as sugestões de curso.');
        setLoading(false);
        return;
      }

      const courseMapObject = coursesData.reduce((acc, item) => {
        if (!acc[item.foco]) {
          acc[item.foco] = [];
        }
        acc[item.foco].push(item.curso_nome);
        return acc;
      }, {});
      setCourseMap(courseMapObject);

      // 4. Carregar histórico local
      const savedResults = localStorage.getItem('testHistory');
      if (savedResults) {
        setPastResults(JSON.parse(savedResults));
      }

      setLoading(false);
    }
    
    getInitialData();
  }, []);

  // Efeito para carregar o histórico do DB se for admin (ATUALIZADO)
  useEffect(() => {
      async function loadAdminHistory() {
          if (isMasterAdmin && adminSelectedDb) { // Só carrega se um DB foi selecionado
              const results = await fetchAllResults(adminSelectedDb); // Passa a seleção
              setAllDbResults(results);
          }
      }
      
      if (view === 'history' && isMasterAdmin && adminSelectedDb) { 
          loadAdminHistory();
      }
  // Depende da seleção do DB
  }, [view, isMasterAdmin, adminSelectedDb]); 


  // Alterna classes no <body> (Inalterado)
  useEffect(() => {
    const bodyClassList = document.body.classList;
    bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page', 'adminLogin');

    if (view === 'quiz') {
      bodyClassList.add('question-page');
    } else {
      bodyClassList.add('gif-active');
      if (view === 'register' || view === 'adminLogin' || view === 'admin_db_select') { // Adicionado 'admin_db_select'
        bodyClassList.add('nickname-page');
      } else if (view === 'result') {
        bodyClassList.add('final-page');
      } else if (view === 'history') {
        bodyClassList.add('history-page');
      }
    }
    
    return () => {
      bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page', 'adminLogin');
    };
  }, [view]);

  // Efeito para aplicar o ajuste de fonte (Inalterado)
  useEffect(() => {
    const baseFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const newSize = baseFontSize + fontSizeAdjustment;
    document.body.style.fontSize = `${newSize}px`;

    return () => {
      document.body.style.fontSize = ''; 
    };
  }, [fontSizeAdjustment]);

  // Funções de Fonte (Inalterado)
  function increaseFontSize() {
    setFontSizeAdjustment(currentAdjustment => Math.min(currentAdjustment + 2, 8));
  }

  function decreaseFontSize() {
    setFontSizeAdjustment(currentAdjustment => Math.max(currentAdjustment - 2, -4));
  }


  // --- FUNÇÕES DE ADMIN ---
  
  // handleAdminLogin (ATUALIZADO)
  async function handleAdminLogin(e) {
    e.preventDefault();
    setAdminError(null);
    setLoading(true);

    const { data: userData, error: userError } = await supabase
        .from('user_mestre')
        .select('apelido, senha_hash') 
        .eq('apelido', adminApelido)
        .single();
    
    setLoading(false);

    if (userError && userError.code !== 'PGRST116') { 
        console.error('Erro de busca no DB:', userError);
        setAdminError('Erro de conexão ao verificar o admin. Tente novamente.');
        return;
    }
    
    if (!userData || userError) { 
        setAdminError('Apelido ou senha mestre incorretos.');
        return;
    }

    const savedPassword = userData.senha_hash;
    
    // ATENÇÃO: Comparação de texto plano.
    // Se a senha no DB for um hash (criptografada), isso falhará.
    if (adminPassword === savedPassword) {
        setIsMasterAdmin(true);
        setView('admin_db_select'); // NOVO: Vai para a seleção de banco (Request 3)
    } else {
        setAdminError('Apelido ou senha mestre incorretos.');
    }
  }

  // fetchAllResults (ATUALIZADO - Request 3, 4, 5)
  async function fetchAllResults(dbSource) {
      setHistoryLoading(true);

      // NOVO: Lógica stub para o "Antigo Banco" (Request 4)
      if (dbSource === 'old') {
        console.warn('Lógica para "Antigo Banco" não implementada.');
        setError('Ainda não recebi os detalhes de acesso para o "Antigo Banco". Por favor, forneça os detalhes para implementar esta busca.');
        setHistoryLoading(false);
        return [];
      }
      
      // Lógica do "Novo Banco" (como era antes)
      const { data, error } = await supabase
          .from('resultado')
          .select(`
              id_u, 
              foco_principal, 
              data_criacao:created_at,
              usuarios(apelido)
          `)
          .order('created_at', { ascending: false }); 

      setHistoryLoading(false);

      if (error) {
          console.error("Erro ao buscar histórico admin:", error);
          setError('Erro ao carregar o histórico de testes do banco de dados.');
          return [];
      }

      // Usa o "Nome Bonito" e passa o id_u (Request 5)
      return data.map(item => ({
          id_u: item.id_u, // Passa o ID do usuário para o clique
          nickname: item.usuarios ? item.usuarios.apelido : 'Usuário Deletado',
          date: new Date(item.data_criacao).toLocaleDateString('pt-BR'),
          time: new Date(item.data_criacao).toLocaleTimeString('pt-BR'), // NOVO: Adiciona a hora
          foco: prettyFocusNames[item.foco_principal] || item.foco_principal, // Traduz o nome
      }));
  }

  // --- NOVO: handleViewHistoryDetails (Request 5) ---
  async function handleViewHistoryDetails(userId) {
      if (!userId) {
        console.error('ID do usuário nulo, não é possível buscar detalhes.');
        return;
      }
      
      setHistoryDetailsLoading(true);
      setViewingHistoryDetails(userId); // Abre o modal
      setHistoryDetails(null);

      const { data, error } = await supabase
        .from('respostas_usuario')
        .select(`
          questoes(enunciado),
          opcoes(opcao)
        `)
        .eq('id_u', userId);

      if (error) {
        console.error("Erro ao buscar detalhes do histórico:", error);
        setAdminError('Erro ao buscar as respostas deste usuário.');
        setHistoryDetails([]); // Define como vazio para parar o loading
      } else {
        // Filtra dados nulos (caso uma questão ou opção tenha sido deletada)
        const validData = data.filter(d => d.questoes && d.opcoes);
        setHistoryDetails(validData);
      }
      
      setHistoryDetailsLoading(false);
  }


  // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---

  // handleRegister (Inalterado)
  async function handleRegister(e) { 
    e.preventDefault();
    setRegistrationError(null);

    if (!userNickname.trim()) {
        setRegistrationError('Por favor, digite um apelido.');
        return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('usuarios')
      .insert({ apelido: userNickname.trim() })
      .select();
    
    setLoading(false);

    if (error) {
      console.error('Erro ao cadastrar usuário:', error);
      if (error.code === '23505') {
        setRegistrationError('Apelido já em uso. Por favor, escolha outro.');
      } else {
        setError('Erro ao cadastrar usuário. Tente novamente.');
      }
    } else {
      setUserId(data[0].id_u);
      setCurrentQuestionIndex(0);
      setView('quiz');
    }
  }

  // handleAnswer (Inalterado)
  function handleAnswer(questionId, optionId) { 
    const filteredAnswers = userAnswers.filter((answer) => answer.id_q !== questionId);
    const newAnswers = [...filteredAnswers, { id_u: userId, id_q: questionId, id_o: optionId }];
    setUserAnswers(newAnswers);

    if (currentQuestionIndex === questions.length - 1) {
      handleSubmitTest(newAnswers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  // handleBack (Inalterado)
  function handleBack() { 
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  // handleGoToRegister (ATUALIZADO)
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
    setViewingHistoryDetails(null);
    setHistoryDetails(null);
    setAdminError(null);
    setError(null);

    setView('register');
  }

  // handleRestartTest (Inalterado)
  function handleRestartTest() {
    handleGoToRegister();
  }

  // handleSaveResult (Inalterado)
  function handleSaveResult(result) { 
    // NOVO: Salva o nome bonito no histórico local
    const resultToSave = {
      ...result,
      foco: prettyFocusNames[result.foco] || result.foco 
    };
    const newHistory = [...pastResults, resultToSave];
    setPastResults(newHistory);
    localStorage.setItem('testHistory', JSON.stringify(newHistory));
  }

  // handleClearHistory (Inalterado)
  function handleClearHistory() { 
    setPastResults([]);
    localStorage.removeItem('testHistory');
  }

  // --- handleSubmitTest (Lógica 3-2-2 Inalterada) ---
  async function handleSubmitTest(answers) { 
    setLoading(true);

    // 1. Salva as Respostas
    const { error: answersError } = await supabase
        .from('respostas_usuario')
        .insert(answers);

    if (answersError) {
        console.error('Erro ao salvar respostas:', answersError);
        setError('Houve um erro ao salvar suas respostas. Tente novamente.');
        setLoading(false);
        return;
  }

    // 2. Calcula a Pontuação BRUTA
    const scoreMap = {};
    answers.forEach(answer => {
      const question = questions.find(q => q.id_q === answer.id_q);
      if (question) {
        const option = question.opcoes.find(o => o.id_o === answer.id_o);
        if (option && option.pontuacao) {
          option.pontuacao.forEach(p => {
            scoreMap[p.foco] = (scoreMap[p.foco] || 0) + (p.valor || 0);
          });
        }
      }
    });

    // 3. NORMALIZAÇÃO: Calcula o PERCENTUAL
    const percentMap = {};
    Object.keys(scoreMap).forEach(foco => {
        const rawScore = scoreMap[foco];
        const maxScore = maxScores[foco]; 
        if (maxScore && maxScore > 0) {
            percentMap[foco] = (rawScore / maxScore) * 100;
        } else {
            percentMap[foco] = 0;
            console.warn(`Foco "${foco}" não encontrado em foco_pontuacao_maxima.`);
        }
    });

    // 4. Ordena os Focos pelo PERCENTUAL
    let focosOrdenados = Object.entries(percentMap)
      .map(([foco, percentual]) => ({ 
        foco, 
        percentual: parseFloat(percentual.toFixed(2))
      }))
      .sort((a, b) => b.percentual - a.percentual);

    // 5. LÓGICA PARA GERAR OS 7 CURSOS (FUNIL 3-2-2)
    const top3Focos = focosOrdenados.slice(0, 3);
    const suggestedCourses = [];

    if (top3Focos.length > 0) {
      // Pega os 3 primeiros cursos do Foco #1
      const foco1_cursos = courseMap[top3Focos[0].foco] || [];
      suggestedCourses.push(...foco1_cursos.slice(0, 3));

      // Pega os 2 primeiros cursos do Foco #2 (se existir)
      if (top3Focos.length > 1) {
        const foco2_cursos = courseMap[top3Focos[1].foco] || [];
        suggestedCourses.push(...foco2_cursos.slice(0, 2));
      }

      // Pega os 2 primeiros cursos do Foco #3 (se existir)
      if (top3Focos.length > 2) {
        const foco3_cursos = courseMap[top3Focos[2].foco] || [];
        suggestedCourses.push(...foco3_cursos.slice(0, 2));
      }

      const final7Courses = suggestedCourses.slice(0, 7);
      const focoPrincipal = top3Focos[0];
      const nomeFocoPrincipal = focoPrincipal.foco; 

      // 6. Estrutura do Resultado Final (ATUALIZADO)
      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'),
        foco: nomeFocoPrincipal,   
        topFocosRank: focosOrdenados, // O ranking completo (AGORA SÓ USADO INTERNAMENTE)
        sugestoes: final7Courses     // A lista 3-2-2
      };

      // 7. Salva o Resultado Principal no Banco
      const { error: saveError } = await supabase
        .from('resultado')
        .insert({
          id_u: userId,
          foco_principal: nomeFocoPrincipal,
          percentual_principal: focoPrincipal.percentual
        })
        .select();

      if (saveError) {
        if (saveError.code === '23505') {
            console.warn('Resultado para este usuário já existe no DB.');
        } else {
            console.error('Erro ao salvar o resultado final:', saveError.message);
            setError('Erro ao salvar o resultado final no banco de dados.');
        }
      } 
      
      setFinalResult(currentResult);
      handleSaveResult(currentResult); 
      setView('result');
      
    } else {
      setError('Não foi possível calcular seu resultado. Você respondeu a todas as questões?');
      setView('register');
    }
    setLoading(false);
  }

  // --- RENDERIZAÇÃO ---

  // Loading
  if (loading && view !== 'history') { 
    return <div className="loading">Carregando...</div>;
  }

  // Error (Global)
  if (error) {
    return (
      <div className="app-container">
        <div className="error">{error}</div>
        <button onClick={handleGoToRegister} className="back-to-test-button">
            Voltar ao Início
        </button>
      </div>
    );
  }

  // Switch (com Renders atualizados)
  switch (view) {
    case 'register':
      // Render 'register' (Inalterado)
      return (
        <div className="app-container">
          <div 
            className="admin-trigger" 
            onClick={() => setView('adminLogin')}
            title="Acesso Administrativo" 
          >
          </div>
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
            <button className="start-button">Começar o Teste</button>
          </form>
          {registrationError && <div className="error-message"><p>{registrationError}</p></div>}
          
          <div className="font-controls">
            <button 
              onClick={decreaseFontSize} 
              className="font-toggle-button"
              aria-label="Diminuir tamanho da fonte"
            >
              A-
            </button>
            <button 
              onClick={increaseFontSize} 
              className="font-toggle-button"
              aria-label="Aumentar tamanho da fonte"
            >
              A+
            </button>
          </div>
        </div>
      );

    case 'adminLogin':
      // Render 'adminLogin' (Inalterado)
      return (
        <div className="app-container">
          <div 
            className="admin-trigger" 
            onClick={handleGoToRegister}
            title="Voltar ao Início"
          >
          </div>
          <h1>Acesso Administrativo</h1>
          <form onSubmit={handleAdminLogin} className="register-form">
            <p>Apelido Mestre:</p>
            <input
              type="text"
              value={adminApelido}
              onChange={(e) => setAdminApelido(e.target.value)}
              placeholder="Apelido do Administrador"
              required
            />
            <p>Senha:</p>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto 15px' }}>
              <input
                type={showAdminPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="********"
                required
                style={{ 
                    width: '100%', 
                    padding: '10px', 
                    paddingRight: '40px', 
                    boxSizing: 'border-box', 
                    borderRadius: '5px',
                    border: '1px solid #ccc'
                }} 
              />
              <button
                type="button" 
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                style={{
                  position: 'absolute',
                  right: '5px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#2e2e2e', 
                  fontSize: '1.2rem',
                }}
                aria-label={showAdminPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showAdminPassword ? '🔒' : '👁️'}
              </button>
            </div>
            
            <button className="start-button" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar como Administrador'}
            </button>
          </form>
          {adminError && <div className="error-message"><p>{adminError}</p></div>}
          <div className="extra-buttons">
            <button onClick={handleGoToRegister} className="back-button">
                Voltar
            </button>
          </div>
        </div>
      );
    
    // --- NOVO: 'admin_db_select' (Request 3) ---
    case 'admin_db_select':
      return (
        <div className="app-container">
          <div 
            className="admin-trigger" 
            onClick={handleGoToRegister}
            title="Sair do modo Admin"
          >
          </div>
          <h1>Seleção de Histórico</h1>
          <p>Olá, {adminApelido}. De qual banco de dados você deseja ver o histórico?</p>
          <div className="admin-db-select-buttons">
            <button 
              className="start-button"
              onClick={() => { setAdminSelectedDb('new'); setView('history'); }}
            >
              Histórico (Novo Banco)
            </button>
            <button 
              className="start-button"
              onClick={() => { setAdminSelectedDb('old'); setView('history'); }}
            >
              Histórico (Antigo Banco)
            </button>
          </div>
          <div className="extra-buttons">
            <button onClick={handleGoToRegister} className="back-button">
                Sair
            </button>
          </div>
        </div>
      );

    case 'quiz': 
      // Render 'quiz' (Inalterado)
      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) {
         return <div className="loading">Carregando questão...</div>;
      }
      const selectedOption = userAnswers.find(a => a.id_q === currentQuestion.id_q);
      
      return (
        <div className="app-container">
          <div 
            className="admin-trigger" 
            onClick={() => setView('adminLogin')}
            title="Acesso Administrativo"
          >
          </div>
          <h1>Teste Vocacional</h1>
          <p className="question-text">
            Questão {currentQuestionIndex + 1} de {questions.length}
          </p>
          <div className="question-item">
            <p className="question-enunciado">{currentQuestion.enunciado}</p>
            <div className="options-container option-buttons-container">
              {currentQuestion.opcoes.map(o => (
                <button
                  key={o.id_o}
                  className={`option-button ${selectedOption && selectedOption.id_o === o.id_o ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQuestion.id_q, o.id_o)}>
                  {o.opcao}
                </button>
              ))}
            </div>
          </div>
          <div className="extra-buttons">
            {currentQuestionIndex > 0 && (
              <button onClick={handleBack} className="back-button">Voltar</button>
            )}
            <button onClick={handleRestartTest} className="restart-button">
              Reiniciar Teste
            </button>
          </div>
        </div>
      );

    // ========================================================================
    // ATUALIZADO: RENDER 'result' (Request 1 - Apenas 7 Cursos)
    // ========================================================================
    case 'result': 
      if (!finalResult) return <div className="error">Resultado indisponível.</div>;

      const focoPrincipalBD = finalResult.foco; 
      const focoPrincipalNomeBonito = prettyFocusNames[focoPrincipalBD] || focoPrincipalBD;

      return (
        <div className="app-container">
          <div 
            className="admin-trigger" 
            onClick={() => setView('adminLogin')}
            title="Acesso Administrativo"
          >
          </div>
          <h1>Seu Resultado</h1>
          <p className="result-text">Olá, {userNickname}! Sua área principal de interesse é:</p>
          <div className="main-result">
            <p className="result-area-principal">{focoPrincipalNomeBonito}</p>
          </div>
          
          {/* A LISTA 3-2-2 (7 CURSOS) */}
          {finalResult.sugestoes.length > 0 && (
            <div className="suggestions-courses">
              <h2>Os 7 Cursos Mais Recomendados para seu perfil:</h2>
              <ul className="suggestions">
                {finalResult.sugestoes.map((curso, index) => (
                  <li key={index}>
                     <strong>{index + 1}º. {curso}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/*             ================================================================
              Bloco de Ranking de Percentual REMOVIDO (Request 1)
            ================================================================
          */}
          
          <div className="extra-buttons">
            <button onClick={() => setView('history')} className="history-button">
              Ver Histórico
            </button>
            <button onClick={handleRestartTest} className="restart-button">
              Reiniciar Teste
            </button>
          </div>
        </div>
      );

    // ========================================================================
    // ATUALIZADO: RENDER 'history' (Request 5)
    // ========================================================================
    case 'history':
      const displayedResults = isMasterAdmin ? allDbResults : pastResults;
      const historyTitle = isMasterAdmin 
          ? `Histórico Geral (${adminSelectedDb === 'new' ? 'Novo Banco' : 'Antigo Banco'})`
          : 'Seu Histórico Local';

      if (historyLoading) {
        return <div className="loading">Carregando histórico do servidor...</div>;
      }
      
      return (
        <>
          {/* --- NOVO: Modal de Detalhes (Request 5) --- */}
          {viewingHistoryDetails && (
            <div className="history-details-modal-backdrop">
              <div className="history-details-modal">
                <h2>Respostas do Usuário</h2>
                <button 
                  className="close-modal-button"
                  onClick={() => setViewingHistoryDetails(null)}
                >
                  &times;
                </button>
                {historyDetailsLoading && <div className="loading">Carregando respostas...</div>}
                
                {adminError && <div className="error-message"><p>{adminError}</p></div>}

                {historyDetails && historyDetails.length > 0 && (
                  <ul className="history-details-list">
                    {historyDetails.map((detail, index) => (
                      <li key={index} className="history-detail-item">
                        <p><strong>Pergunta:</strong> {detail.questoes.enunciado}</p>
                        <p><strong>Resposta:</strong> {detail.opcoes.opcao}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {historyDetails && historyDetails.length === 0 && !historyDetailsLoading && (
                  <p>Nenhum detalhe de resposta encontrado para este usuário.</p>
                )}
              </div>
            </div>
          )}

          {/* --- Página de Histórico Principal --- */}
          <div className="app-container">
            <div 
              className="admin-trigger" 
              onClick={handleGoToRegister} 
              title="Sair do modo Admin / Voltar ao Início"
            >
            </div>
            
            <h1>{historyTitle}</h1>
            
            {displayedResults.length > 0 ? (
              <>
                <ul className="result-list">
                  {displayedResults.map((result, index) => (
                    <li key={result.id_u || index} className="result-item">
                      <div>
                        {/* NOVO: Botão no apelido (Request 5) */}
                        {isMasterAdmin ? (
                          <button 
                            className="history-nickname-button" 
                            onClick={() => handleViewHistoryDetails(result.id_u)}
                            title="Ver respostas do usuário"
                          >
                            Apelido: <strong>{result.nickname}</strong> 
A                        </button>
                        ) : (
                          <div>Apelido: <strong>{result.nickname}</strong></div>
                        )}
                      </div>
                      {/* NOVO: Exibe data E hora (Request 4) */}
                      <div>Data: {result.date} {isMasterAdmin ? `às ${result.time}` : ''}</div>
                      <div>Área Principal: {result.foco}</div>
                    </li>
                  ))}
                </ul>
                <div className="extra-buttons">
                  {!isMasterAdmin && (
                      <button onClick={handleClearHistory} className="clear-history-button">
                        Limpar Histórico Local
                      </button>
                  )}
                  <button onClick={handleGoToRegister} className="back-to-test-button">
                    {isMasterAdmin ? 'Sair do Admin e Voltar' : 'Voltar para Registro'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Nenhum resultado {isMasterAdmin ? 'encontrado no banco de dados.' : 'anterior encontrado localmente.'}</p>
                <div className="extra-buttons">
                  <button onClick={handleGoToRegister} className="back-to-test-button">
                    Voltar para Registro
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      );

    default:
      return null;
  }
}

export default App;