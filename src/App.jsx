import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

function App() {
  // Estados Principais
  const [userId, setUserId] = useState(null);
  const [userNickname, setUserNickname] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [finalResult, setFinalResult] = useState(null); 
  const [pastResults, setPastResults] = useState([]);
  // 'register', 'quiz', 'result', 'history', 'adminLogin'
  const [view, setView] = useState('register'); 

  // Controle de Acessibilidade (Fonte)
  const [fontSizeAdjustment, setFontSizeAdjustment] = useState(0);

  // Estados de Carga e Erro
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // ESTADOS PARA O ADMIN
  const [adminApelido, setAdminApelido] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [allDbResults, setAllDbResults] = useState([]); // Histórico global
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false); // ESTADO DE VISIBILIDADE DE SENHA

  // Efeito para carregar as questões e histórico local
  useEffect(() => {
    async function getQuestionsAndOptions() {
      const { data, error } = await supabase
        .from('questoes')
        .select(`
          id_q,
          enunciado,
          opcoes(id_o, opcao, pontuacao(area, valor))
        `);

      if (error) {
        console.error('Erro ao carregar os dados:', error);
        setError('Erro ao carregar os dados do teste.');
      } else {
        setQuestions(data);
      }
      setLoading(false);
    }
    getQuestionsAndOptions();

    const savedResults = localStorage.getItem('testHistory');
    if (savedResults) {
      setPastResults(JSON.parse(savedResults));
    }
  }, []);

  // Alterna classes no <body>
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

  // Efeito para aplicar o ajuste de fonte
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
  
  async function handleAdminLogin(e) {
  e.preventDefault();
  setAdminError(null);
  setLoading(true);

  // 1. Busca o Apelido e a SENHA PURA (coluna 'senha_hash') do DB
  const { data: userData, error: userError } = await supabase
    .from('user_mestre')
    .select(`
        apelido, 
        senha_hash
    `)
    .eq('apelido', adminApelido) // Busca pelo apelido digitado
    .single();
  
  setLoading(false);

  // 2. Trata erro de busca (usuário não encontrado ou erro de DB)
  // Se o erro for um retorno de "não existe linha", ou se userData for nulo.
  if (userError && userError.code !== 'PGRST116') { // PGRST116 = não encontrou a linha (trataremos como credencial incorreta)
      console.error('Erro de busca no DB:', userError);
      setAdminError('Erro de conexão ao verificar o admin. Tente novamente.');
      return;
  }
  
  if (!userData || userError) { // Se não encontrou o usuário (incluindo o erro PGRST116)
      setAdminError('Apelido ou senha mestre incorretos.');
      return;
  }

  const savedPassword = userData.senha_hash;
  
  // 3. Checagem DIRETA: Compara a senha digitada (case-sensitive) com a senha PURA salva no DB
  if (adminPassword === savedPassword) {
      setIsMasterAdmin(true);
      
      // ✅ ALTERAÇÃO CHAVE: Carregar os resultados aqui!
      const results = await fetchAllResults(); 
      setAllDbResults(results); 
      
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
              area_principal,
              created_at, // <<<<< CORREÇÃO AQUI: USAR created_at (sem alias)
              usuarios(apelido)
          `)
          .order('created_at', { ascending: false }); 

      setHistoryLoading(false);

      if (error) {
          console.error("Erro ao buscar histórico admin:", error);
          setError('Erro ao carregar o histórico de testes do banco de dados.');
          return [];
      }

      return data.map(item => ({
          nickname: item.usuarios.apelido,
          // <<<<< CORREÇÃO AQUI: Mudar de item.data_criacao para item.created_at
          date: new Date(item.created_at).toLocaleDateString('pt-BR'),
          area: item.area_principal,
      }));
  }

    // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---

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

  function handleBack() { 
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

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

  function handleRestartTest() {
    handleGoToRegister();
  }

  function handleSaveResult(result) { 
    const newHistory = [...pastResults, result];
    setPastResults(newHistory);
    localStorage.setItem('testHistory', JSON.stringify(newHistory));
  }

  function handleClearHistory() { 
    setPastResults([]);
    localStorage.removeItem('testHistory');
  }

  async function handleSubmitTest(answers) { 
    setLoading(true);

    // 1. Salva as Respostas (Código Omitido para brevidade - inalterado)

    // 2. Calcula a Pontuação (Código Omitido para brevidade - inalterado)
    const scoreMap = {};
    answers.forEach(answer => {
      const question = questions.find(q => q.id_q === answer.id_q);
      if (question) {
        const option = question.opcoes.find(o => o.id_o === answer.id_o);
        if (option && option.pontuacao) {
          option.pontuacao.forEach(p => {
            scoreMap[p.area] = (scoreMap[p.area] || 0) + (p.valor || 0);
          });
        }
      }
    });

    // 3. Ordena as Áreas e Pega o Top 5 (Código Omitido para brevidade - inalterado)
    let areas = Object.entries(scoreMap)
      .map(([area, score]) => ({ area, score }))
      .sort((a, b) => b.score - a.score);

    const top5Areas = areas.slice(0, 5);
    
    // 4. Mapeamento de Sugestões de Cursos (ATUALIZADO)
    const areaMapping = {
      // ATENÇÃO: As chaves devem corresponder exatamente aos valores do campo 'area' na sua tabela 'pontuacao'.
      
      'Engenharias e Tecnologia': [
          'Engenharia Civil', 'Engenharia de Produção', 'Engenharia Mecânica', 
          'Engenharia Elétrica', 'Engenharia Química', 'Engenharia Ambiental', 
          'Engenharia de Materiais', 'Engenharia de Petróleo', 'Arquitetura e Urbanismo'
      ],
      'Ciências Exatas e da Terra': [
          'Ciência da Computação', 'Engenharia de Software', 'Sistemas de Informação', 
          'Análise e Desenvolvimento de Sistemas', 'Jogos Digitais', 'Cibersegurança', 
          'Matemática', 'Física', 'Química', 'Estatística', 'Oceanografia'
      ],
      'Saúde e Biológicas': [
          'Medicina', 'Enfermagem', 'Odontologia', 'Fisioterapia', 'Nutrição', 
          'Psicologia', 'Farmácia', 'Biologia', 'Biomedicina', 'Ciências Biológicas', 
          'Veterinária', 'Zootecnia', 'Educação Física', 'Terapia Ocupacional'
      ],
      'Ciências Humanas e Sociais Aplicadas': [
          'Direito', 'Ciência Política', 'Relações Internacionais', 'Sociologia', 
          'História', 'Geografia', 'Filosofia', 'Antropologia', 'Pedagogia', 'Licenciaturas'
      ],
      'Comunicação e Artes': [
          'Jornalismo', 'Relações Públicas', 'Publicidade e Propaganda', 'Letras', 
          'Cinema e Audiovisual', 'Design Gráfico', 'Design de Interiores', 
          'Design de Moda', 'Design de Produto', 'Artes Cênicas/Teatro', 
          'Música', 'Artes Visuais', 'Dança'
      ],
      'Negócios e Gestão': [
          'Administração', 'Ciências Contábeis', 'Gestão de Recursos Humanos', 
          'Logística', 'Secretariado Executivo', 'Ciências Econômicas', 
          'Finanças', 'Comércio Exterior', 'Marketing', 'Turismo', 
          'Hotelaria', 'Gastronomia'
      ]
    };

    if (top5Areas.length > 0) {
      const principalArea = top5Areas[0];
      const finalArea = principalArea.area;
      const suggestions = areaMapping[finalArea] || [];

      // 5. Estrutura do Resultado Final (Código Omitido para brevidade - inalterado)
      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'),
        area: finalArea,
        topAreas: top5Areas,
        sugestoes: suggestions
      };

      // 6. Salva o Resultado Principal no Banco (tabela 'resultado') (Código Omitido para brevidade - inalterado)
      const { error: saveError } = await supabase
        .from('resultado')
        .insert({
          id_u: userId,
          area_principal: finalArea,
          percentual_principal: principalArea.score 
        })
        .select();

      if (saveError) {
        if (saveError.code === '23505') {
            console.warn('Resultado para este usuário já existe no DB. Atualizando apenas o local.');
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

  if (loading && view !== 'history') { 
    return <div className="loading">Carregando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  switch (view) {
    case 'register':
      return (
        <div className="app-container">
          {/* Gatilho de Admin Clicável (SECRETO) */}
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
          {/* Gatilho de Admin Clicável para Voltar */}
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
            {/* CONTAINER PARA ALINHAR SENHA E BOTÃO */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto 15px' }}>
              <input
                // O tipo muda dinamicamente com o estado showAdminPassword
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
                type="button" // Essencial para prevenir o envio do formulário
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
                {/* ÍCONE DE ACORDO COM O ESTADO */}
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
      const currentQuestion = questions[currentQuestionIndex];
      const selectedOption = userAnswers.find(a => a.id_q === currentQuestion.id_q);
      
      return (
        <div className="app-container">
          {/* Gatilho de Admin Clicável (SECRETO) */}
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

      const [principalArea, ...outrasAreas] = finalResult.topAreas;

      return (
        <div className="app-container">
          {/* Gatilho de Admin Clicável (SECRETO) */}
          <div 
            className="admin-trigger" 
            onClick={() => setView('adminLogin')}
            title="Acesso Administrativo"
          >
          </div>
          <h1>Seu Resultado</h1>
          <p className="result-text">Olá, {userNickname}! Sua área principal de interesse é:</p>
          <div className="main-result">
            <p className="result-area-principal">{principalArea.area}</p>
          </div>
          
          <div className="top-areas-list">
            <h2>Suas 5 Maiores Aptidões:</h2>
            <ul className="suggestions">
              {finalResult.topAreas.map((item, index) => (
                <li key={item.area} className={index === 0 ? 'top-1' : ''}>
                  <strong>{index + 1}º. {item.area}</strong> 
                </li>
              ))}
            </ul>
          </div>

          {finalResult.sugestoes.length > 0 && (
            <div className="suggestions-courses">
              <h2>Sugestões de Cursos:</h2>
              <ul className="suggestions">
                {finalResult.sugestoes.map((sugestao, index) => (
                  <li key={index}>{sugestao}</li>
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
          ? 'Histórico Geral de Testes (ADMIN)' 
          : 'Seu Histórico Local';

      if (historyLoading) {
        return <div className="loading">Carregando histórico do servidor...</div>;
      }
      
      return (
        <div className="app-container">
          {/* Gatilho de Admin no Histórico. Clicar volta ao registro/sai do admin. */}
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
                    <div>Área Principal: {result.area}</div>
                  </li>
                ))}
              </ul>
              <div className="extra-buttons">
                {/* O botão Limpar Histórico só afeta o localStorage para usuários normais */}
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