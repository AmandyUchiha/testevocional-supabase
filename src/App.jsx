import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// ========================================================================
// MAPA DE "NOMES BONITOS" ATUALIZADO
// Mapeia os nomes de AMBOS os bancos de dados para nomes amigáveis
// ========================================================================
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


function App() {
  // Estados Principais
  const [userId, setUserId] = useState(null);
  const [userNickname, setUserNickname] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [finalResult, setFinalResult] = useState(null); 
  const [pastResults, setPastResults] = useState([]);
  const [view, setView] = useState('register'); 

  // Controle de Acessibilidade (Fonte)
  const [fontSizeAdjustment, setFontSizeAdjustment] = useState(0);

  // Estados de Carga e Erro
  const [questions, setQuestions] = useState([]); // Questões do 'novo' banco para o teste
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // LÓGICA DE NORMALIZAÇÃO (do 'novo' banco)
  const [maxScores, setMaxScores] = useState({});
  const [courseMap, setCourseMap] = useState({}); 

  // ESTADOS PARA O ADMIN
  const [adminApelido, setAdminApelido] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [allDbResults, setAllDbResults] = useState([]); 
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false); 

  // ESTADOS PARA FLUXO ADMIN (Request 3, 4, 5)
  const [adminSelectedDb, setAdminSelectedDb] = useState(null); // 'new' ou 'old'
  const [viewingHistoryDetails, setViewingHistoryDetails] = useState(null); 
  const [historyDetails, setHistoryDetails] = useState(null); 
  const [historyDetailsLoading, setHistoryDetailsLoading] = useState(false);


  // Efeito para carregar as questões DO NOVO BANCO (para fazer o teste)
  useEffect(() => {
    async function getInitialData() {
      setLoading(true);

      // 1. Buscar Questões e Opções (com o 'foco') - DO BANCO NOVO
      const { data: questionsData, error: questionsError } = await supabase
        .from('questoes') // Padrão: carrega questões do 'novo' banco
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

      // 2. Buscar Pontuações Máximas (DO BANCO NOVO)
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

      // 3. Buscar Mapeamento de Cursos (DO BANCO NOVO)
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


  // Efeito para carregar o histórico do DB se for admin
  useEffect(() => {
      async function loadAdminHistory() {
          if (isMasterAdmin && adminSelectedDb) { 
              const results = await fetchAllResults(adminSelectedDb); 
              setAllDbResults(results);
          }
      }
      
      if (view === 'history' && isMasterAdmin && adminSelectedDb) { 
          loadAdminHistory();
      }
  }, [view, isMasterAdmin, adminSelectedDb]); 


  // Efeito para classes do <body>
  useEffect(() => {
    const bodyClassList = document.body.classList;
    bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page', 'adminLogin');

    if (view === 'quiz') {
      bodyClassList.add('question-page');
    } else {
      bodyClassList.add('gif-active');
      if (view === 'register' || view === 'adminLogin' || view === 'admin_db_select') { 
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

  // Efeito para ajuste de fonte
  useEffect(() => {
    const baseFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const newSize = baseFontSize + fontSizeAdjustment;
    document.body.style.fontSize = `${newSize}px`;

    return () => {
      document.body.style.fontSize = ''; 
    };
  }, [fontSizeAdjustment]);

  // Funções de Fonte
  function increaseFontSize() {
    setFontSizeAdjustment(currentAdjustment => Math.min(currentAdjustment + 2, 8));
  }

  function decreaseFontSize() {
    setFontSizeAdjustment(currentAdjustment => Math.max(currentAdjustment - 2, -4));
  }


  // --- FUNÇÕES DE ADMIN ---
  
  // Login do Admin (Verifica user_mestre)
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
    
    // Comparação de texto plano
    if (adminPassword === savedPassword) {
        setIsMasterAdmin(true);
        setView('admin_db_select'); // Vai para a seleção de banco
    } else {
        setAdminError('Apelido ou senha mestre incorretos.');
    }
  }

  // Busca o histórico (Novo ou Antigo)
  async function fetchAllResults(dbSource) {
      setHistoryLoading(true);
      setError(null); 
      
      let data, error;

      // --- LÓGICA DO "BANCO ANTIGO" ---
      if (dbSource === 'old') {
          // Busca de 'resultado_antigo' e 'usuarios_antigo'
          ({ data, error } = await supabase
              .from('resultado_antigo')
              .select(`
                  id_u,
                  area_principal,
                  usuarios_antigo(apelido, data_criacao)
              `)
              .order('id_r', { ascending: false })); 

          setHistoryLoading(false);

          if (error) {
              console.error("Erro ao buscar histórico antigo:", error);
              setError('Erro ao carregar o histórico do BANCO ANTIGO. Verifique se as tabelas "resultado_antigo" e "usuarios_antigo" existem.');
              return [];
          }

          // Mapeia os dados do banco antigo
          return data.map(item => {
            const userData = item.usuarios_antigo || {};
            const timestamp = new Date(userData.data_criacao || Date.now()); 
            
            return {
              id_u: item.id_u,
              nickname: userData.apelido || 'Usuário Deletado',
              date: timestamp.toLocaleDateString('pt-BR'),
              time: timestamp.toLocaleTimeString('pt-BR'),
              // Usa a 'area_principal' e traduz com o mapa
              foco: prettyFocusNames[item.area_principal] || item.area_principal, 
            };
          });
      } 
      
      // --- LÓGICA DO "NOVO BANCO" (Corrigida da última vez) ---
      else {
          // Busca de 'resultado' e 'usuarios'
          ({ data, error } = await supabase
              .from('resultado')
              .select(`
                  id_u, 
                  foco_principal,
                  usuarios(apelido, data_criacao)
              `)
              .order('id_r', { ascending: false })); // Ordena pelo ID do resultado

          setHistoryLoading(false);

          if (error) {
              console.error("Erro ao buscar histórico admin (novo):", error);
              setError('Erro ao carregar o histórico do BANCO NOVO.');
              return [];
          }

          // Mapeia os dados do banco novo
          return data.map(item => {
            const userData = item.usuarios || {};
            // Pega a data de criação do usuário
            const timestamp = new Date(userData.data_criacao || Date.now());

            return {
              id_u: item.id_u,
              nickname: userData.apelido || 'Usuário Deletado',
              date: timestamp.toLocaleDateString('pt-BR'),
              time: timestamp.toLocaleTimeString('pt-BR'),
              // Usa o 'foco_principal' e traduz com o mapa
              foco: prettyFocusNames[item.foco_principal] || item.foco_principal,
            };
          });
      }
  }

  // Busca detalhes (perguntas/respostas) do usuário clicado
  async function handleViewHistoryDetails(userId) {
      if (!userId) {
        console.error('ID do usuário nulo, não é possível buscar detalhes.');
        return;
      }
      
      setHistoryDetailsLoading(true);
      setViewingHistoryDetails(userId); // Abre o modal
      setHistoryDetails(null);
      setAdminError(null); 

      // --- Lógica de seleção de Banco ---
      const isOldDb = adminSelectedDb === 'old';
      const respostasTable = isOldDb ? 'respostas_usuario_antigo' : 'respostas_usuario';
      const questoesTable = isOldDb ? 'questoes_antigo' : 'questoes';
      const opcoesTable = isOldDb ? 'opcoes_antigo' : 'opcoes';

      // Busca as respostas, questões e opções correspondentes
      const { data, error } = await supabase
        .from(respostasTable)
        .select(`
          ${questoesTable}(enunciado),
          ${opcoesTable}(opcao)
        `)
        .eq('id_u', userId);

      if (error) {
        console.error("Erro ao buscar detalhes do histórico:", error);
        setAdminError(`Erro ao buscar as respostas. Verifique se as tabelas "${respostasTable}", "${questoesTable}" e "${opcoesTable}" existem e estão relacionadas.`);
        setHistoryDetails([]); 
      } else {
        // Mapeia os dados para um formato consistente
        const validData = data
          .filter(d => d[questoesTable] && d[opcoesTable]) // Filtra nulos
          .map(d => ({ 
            // Padroniza a saída para o JSX
            questoes: { enunciado: d[questoesTable].enunciado },
            opcoes: { opcao: d[opcoesTable].opcao }
          }));
        
        setHistoryDetails(validData);
      }
      
      setHistoryDetailsLoading(false);
  }


  // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---

  // Reseta tudo para a tela de registro
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
    setError(null); // Limpa o erro global

    setView('register');
  }
 
  // Registro (salva em 'usuarios' do NOVO banco)
  async function handleRegister(e) { 
    e.preventDefault();
    setRegistrationError(null);

    if (!userNickname.trim()) {
        setRegistrationError('Por favor, digite um apelido.');
        return;
    }
    setLoading(true);

    // Usa o 'usuarios' (novo) para registro
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
 
  // Salva a resposta e avança
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

  // Volta para a questão anterior
  function handleBack() { 
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  // Reinicia o teste
  function handleRestartTest() {
    handleGoToRegister();
  }

  // Salva o resultado no Histórico Local (localStorage)
  function handleSaveResult(result) { 
    const resultToSave = {
      ...result,
      foco: prettyFocusNames[result.foco] || result.foco 
    };
    const newHistory = [...pastResults, resultToSave];
    setPastResults(newHistory);
    localStorage.setItem('testHistory', JSON.stringify(newHistory));
  }

  // Limpa o Histórico Local
  function handleClearHistory() { 
    setPastResults([]);
    localStorage.removeItem('testHistory');
  }

  // Processa e Salva o Teste (NO BANCO NOVO)
  async function handleSubmitTest(answers) { 
    setLoading(true);

    // 1. Salva as Respostas (no 'novo' banco: 'respostas_usuario')
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

    // 3. NORMALIZAÇÃO: Calcula o PERCENTUAL (usa 'maxScores' do 'novo' banco)
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
      const foco1_cursos = courseMap[top3Focos[0].foco] || [];
      suggestedCourses.push(...foco1_cursos.slice(0, 3));
      if (top3Focos.length > 1) {
        const foco2_cursos = courseMap[top3Focos[1].foco] || [];
        suggestedCourses.push(...foco2_cursos.slice(0, 2));
      }
      if (top3Focos.length > 2) {
        const foco3_cursos = courseMap[top3Focos[2].foco] || [];
        suggestedCourses.push(...foco3_cursos.slice(0, 2));
      }

      const final7Courses = suggestedCourses.slice(0, 7);
      const focoPrincipal = top3Focos[0];
      const nomeFocoPrincipal = focoPrincipal.foco; 

      // 6. Estrutura do Resultado Final
      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'),
        foco: nomeFocoPrincipal,   
        topFocosRank: focosOrdenados, // (Não usado na tela, mas salvo)
        sugestoes: final7Courses
      };

      // 7. Salva o Resultado Principal no Banco (no 'novo' banco: 'resultado')
      const { error: saveError } = await supabase
        .from('resultado')
        .insert({
          id_u: userId,
          foco_principal: nomeFocoPrincipal,
          percentual_principal: focoPrincipal.percentual
        })
        .select();

      if (saveError) {
        // Ignora erro 'unique constraint' (usuário já fez o teste)
        if (saveError.code !== '23505') {
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
        <h1>Erro</h1>
        <div className="error-message" style={{backgroundColor: '#ffdddd', border: '1px solid #ff0000', padding: '15px', borderRadius: '5px'}}>
          <p style={{color: '#D8000C', margin: 0}}>{error}</p>
        </div>
        <div className="extra-buttons" style={{marginTop: '20px'}}>
          <button onClick={handleGoToRegister} className="back-to-test-button">
              Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Switch de Telas
  switch (view) {
    case 'register':
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
    A     <h1>Seu Resultado</h1>
          <p className="result-text">Olá, {userNickname}! Sua área principal de interesse é:</p>
          <div className="main-result">
            <p className="result-area-principal">{focoPrincipalNomeBonito}</p>
          </div>
          
          {/* A LISTA 3-2-2 (7 CURSOS) - SEM PERCENTUAL */}
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
          {/* --- Modal de Detalhes (Request 5) --- */}
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
                
                {/* Mostra erro específico do modal */}
                {adminError && <div className="error-message"><p>{adminError}</p></div>}

          A     {historyDetails && historyDetails.length > 0 && (
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
                    <li key={result.id_u + '-' + index} className="result-item">
                      <div>
                        {/* Botão no apelido (Request 5) */}
                        {isMasterAdmin ? (
                          <button 
                            className="history-nickname-button" 
                            onClick={() => handleViewHistoryDetails(result.id_u)}
                            title="Ver respostas do usuário"
                          >
                            Apelido: <strong>{result.nickname}</strong> 
                          </button>
                        ) : (
                          <div>Apelido: <strong>{result.nickname}</strong></div>
                        )}
                      </div>
                      {/* Exibe data E hora (Request 4) */}
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
                  {isMasterAdmin && (
                    <button onClick={() => { setView('admin_db_select'); setAllDbResults([]); }} className="back-button">
                      Trocar Banco
                    </button>
                  )}
                  <button onClick={handleGoToRegister} className="back-to-test-button">
                    {isMasterAdmin ? 'Sair do Admin' : 'Voltar para Registro'}
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