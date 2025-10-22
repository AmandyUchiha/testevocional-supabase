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
  const [view, setView] = useState('register'); 

  // Controle de Acessibilidade (Fonte)
  const [fontSizeAdjustment, setFontSizeAdjustment] = useState(0);

  // Estados de Carga e Erro
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // NOVOS ESTADOS PARA A LÓGICA DE NORMALIZAÇÃO
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

      // 2. Buscar Pontuações Máximas (ESSENCIAL PARA NORMALIZAÇÃO)
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

  // Efeito para carregar o histórico do DB se for admin (Inalterado)
  useEffect(() => {
      async function loadAdminHistory() {
          if (isMasterAdmin) {
              const results = await fetchAllResults();
              setAllDbResults(results);
          }
      }
      
      if (view === 'history' && isMasterAdmin) { 
          loadAdminHistory();
      }
  }, [view, isMasterAdmin]); 


  // Alterna classes no <body> (Inalterado)
  useEffect(() => {
    const bodyClassList = document.body.classList;
    bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page', 'adminLogin');

    if (view === 'quiz') {
      bodyClassList.add('question-page');
    } else {
      bodyClassList.add('gif-active');
      if (view === 'register' || view === 'adminLogin') {
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


  // --- FUNÇÕES DE ADMIN (Inalterado) ---
  
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
    
    if (adminPassword === savedPassword) {
        setIsMasterAdmin(true);
        setView('history'); 
    } else {
        setAdminError('Apelido ou senha mestre incorretos.');
    }
  }

  async function fetchAllResults() {
      setHistoryLoading(true);
      
      const { data, error } = await supabase
          .from('resultado')
          .select(`
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

      // NOVO: Usa o "Nome Bonito" no histórico de admin
      return data.map(item => ({
          nickname: item.usuarios.apelido,
          date: new Date(item.data_criacao).toLocaleDateString('pt-BR'),
          foco: prettyFocusNames[item.foco_principal] || item.foco_principal, // Traduz o nome
      }));
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

  // handleGoToRegister (Inalterado)
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

  // --- handleSubmitTest (ATUALIZADO COM LÓGICA 3-2-2) ---
  async function handleSubmitTest(answers) { 
    setLoading(true);

    // 1. Salva as Respostas (Inalterado)
    const { error: answersError } = await supabase
        .from('respostas_usuario')
        .insert(answers);

    if (answersError) {
        console.error('Erro ao salvar respostas:', answersError);
        setError('Houve um erro ao salvar suas respostas. Tente novamente.');
        setLoading(false);
        return;
    }

    // 2. Calcula a Pontuação BRUTA (Inalterado)
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

    // 3. NORMALIZAÇÃO: Calcula o PERCENTUAL (Inalterado)
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

    // 4. Ordena os Focos pelo PERCENTUAL (Inalterado)
    let focosOrdenados = Object.entries(percentMap)
      .map(([foco, percentual]) => ({ 
        foco, 
        percentual: parseFloat(percentual.toFixed(2))
      }))
      .sort((a, b) => b.percentual - a.percentual);

    // ========================================================================
    // NOVO: LÓGICA PARA GERAR OS 7 CURSOS (FUNIL 3-2-2)
    // ========================================================================

    // Pega os 3 Focos principais
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

      // Garante que temos no máximo 7 cursos, caso os focos tenham menos cursos que o esperado
      const final7Courses = suggestedCourses.slice(0, 7);

      // --- Fim da nova lógica ---

      const focoPrincipal = top3Focos[0];
      const nomeFocoPrincipal = focoPrincipal.foco; // Nome do BD (ex: 'Foco_Engenharia')

      // 6. Estrutura do Resultado Final (ATUALIZADO)
      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'),
        foco: nomeFocoPrincipal,         // Nome do BD (para salvar no histórico)
        topFocosRank: focosOrdenados,  // Salva o ranking completo dos 12 focos (para o usuário ver)
        sugestoes: final7Courses       // A nova lista 3-2-2
      };

      // 7. Salva o Resultado Principal no Banco (Inalterado)
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
      handleSaveResult(currentResult); // Salva no localStorage (agora com nome bonito)
      setView('result');
      
    } else {
      setError('Não foi possível calcular seu resultado. Você respondeu a todas as questões?');
      setView('register');
    }
    setLoading(false);
  }

  // --- RENDERIZAÇÃO ---

  // Loading (Inalterado)
  if (loading && view !== 'history') { 
    return <div className="loading">Carregando...</div>;
  }

  // Error (Inalterado)
  if (error) {
    return <div className="error">{error}</div>;
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
    // NOVO: RENDER 'result' (Simplificado para 7 Cursos)
    // ========================================================================
    case 'result': 
      if (!finalResult) return <div className="error">Resultado indisponível.</div>;

      // Pega o Foco Principal (ex: 'Foco_Engenharia')
      const focoPrincipalBD = finalResult.foco; 
      // Traduz para o Nome Bonito (ex: 'Engenharias')
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
          
          {/* A NOVA LISTA 3-2-2 (7 CURSOS) */}
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

          {/* LISTA SECUNDÁRIA (OPCIONAL): Mostra o ranking de todas as áreas */}
          <div className="top-areas-list">
            <h2>Seu Perfil Vocacional Completo (%):</h2>
            <ul className="suggestions">
              {finalResult.topFocosRank.map((item) => (
                <li key={item.foco}>
                  {prettyFocusNames[item.foco] || item.foco}: {item.percentual}%
                </li>
              ))}
            </ul>
          </div>
          
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
      // Render 'history' (ATUALIZADO para 'foco')
      const displayedResults = isMasterAdmin ? allDbResults : pastResults;
      const historyTitle = isMasterAdmin 
          ? 'Histórico Geral de Testes (ADMIN)' 
          : 'Seu Histórico Local';

      if (historyLoading) {
        return <div className="loading">Carregando histórico do servidor...</div>;
      }
      
      return (
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
                  <li key={index} className="result-item">
                    <div>Apelido: **{result.nickname}**</div>
                    <div>Data: {result.date}</div>
                    {/* 'foco' já vem com nome bonito do handleSaveResult/fetchAllResults */}
                    <div>Foco Principal: {result.foco}</div>
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
      );

    default:
      return null;
  }
}

export default App;