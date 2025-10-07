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
  const [view, setView] = useState('register'); // 'register', 'quiz', 'result', 'history'
  
  // NOVO: Estado para controlar o tamanho da fonte
  const [isFontLarge, setIsFontLarge] = useState(false);

  // Estados de Carga e Erro
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // Efeito para carregar as questões, opções e PONTUAÇÕES
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

  // Alterna classes no <body> com base na view (para o tema do Wall-E)
  useEffect(() => {
    const bodyClassList = document.body.classList;
    // Limpa todas as classes relacionadas
    bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page');

    if (view === 'quiz') {
      bodyClassList.add('question-page');
    } else {
      bodyClassList.add('gif-active');
      if (view === 'register') {
        bodyClassList.add('nickname-page');
      } else if (view === 'result') {
        bodyClassList.add('final-page');
      } else if (view === 'history') {
        bodyClassList.add('history-page');
      }
    }

    // Função de limpeza para evitar efeitos colaterais ao desmontar ou mudar
    return () => {
      bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page');
    };
  }, [view]);

  // NOVO: Efeito para aplicar a classe de fonte grande no <body>
  useEffect(() => {
    if (isFontLarge) {
      document.body.classList.add('large-font');
    } else {
      document.body.classList.remove('large-font');
    }
  }, [isFontLarge]);


  // Cadastra o usuário e inicia o teste
  async function handleRegister(e) {
    e.preventDefault();
    setRegistrationError(null);

    const { data, error } = await supabase
      .from('usuarios')
      .insert({ apelido: userNickname })
      .select();

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

  // Lida com a seleção de uma resposta
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

  // Voltar para pergunta anterior
  function handleBack() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  // Reiniciar teste (volta ao registro)
  function handleGoToRegister() {
    // NOVO: Reseta o estado da fonte para o padrão
    setIsFontLarge(false);
    setUserId(null);
    setUserNickname('');
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
    setFinalResult(null);
    setView('register');
  }

  function handleRestartTest() {
    handleGoToRegister();
  }

  // Histórico local
  function handleSaveResult(result) {
    const newHistory = [...pastResults, result];
    setPastResults(newHistory);
    localStorage.setItem('testHistory', JSON.stringify(newHistory));
  }

  function handleClearHistory() {
    setPastResults([]);
    localStorage.removeItem('testHistory');
  }

  // Submissão do teste
  async function handleSubmitTest(answers) {
    setLoading(true);

    const { error: answersError } = await supabase
      .from('respostas_usuario')
      .insert(answers);

    if (answersError) {
      console.error('Erro ao salvar respostas:', answersError);
      setError('Erro ao salvar suas respostas.');
      setLoading(false);
      return;
    }

    // Calcular resultados no frontend
    const scoreMap = {};
    answers.forEach(answer => {
      const question = questions.find(q => q.id_q === answer.id_q);
      if (question) {
        const option = question.opcoes.find(o => o.id_o === answer.id_o);
        if (option && option.pontuacao) {
          option.pontuacao.forEach(p => {
            scoreMap[p.area] = (scoreMap[p.area] || 0) + p.valor;
          });
        }
      }
    });

    const areas = Object.entries(scoreMap);
    areas.sort((a, b) => b[1] - a[1]);

    const areaMapping = {
      'Áreas Técnicas e Científicas': ['Engenharia', 'Tecnologia da Informação', 'Física', 'Matemática'],
      'Áreas Criativas': ['Design', 'Artes', 'Comunicação', 'Moda', 'Publicidade'],
      'Áreas de Saúde e Bem-Estar': ['Medicina', 'Psicologia', 'Terapias', 'Enfermagem'],
      'Áreas de Administração e Negócios': ['Gestão', 'Administração', 'Marketing', 'Finanças'],
      'Áreas Humanas e Sociais': ['Educação', 'Trabalho Social', 'Recursos Humanos', 'Direito'],
      'Áreas de Comunicação e Mídia': ['Jornalismo', 'Produção de Conteúdo', 'Relações Públicas']
    };

    if (areas.length > 0) {
      const principalArea = areas[0];
      const finalArea = principalArea[0];
      const suggestions = areaMapping[finalArea] || [];

      const currentResult = {
        nickname: userNickname,
        date: new Date().toLocaleDateString('pt-BR'),
        area: finalArea,
        sugestoes: suggestions
      };

      const { error: saveError } = await supabase
        .from('resultado')
        .insert({
          id_u: userId,
          area_principal: finalArea,
          percentual_principal: principalArea[1]
        });

      if (saveError) {
        console.error('Erro ao salvar o resultado final:', saveError.message);
        setError('Erro ao salvar o resultado final.');
      } else {
        setFinalResult(currentResult);
        handleSaveResult(currentResult);
        setView('result');
      }
    } else {
      setError('Não foi possível calcular seu resultado. Tente novamente.');
      setView('register');
    }
    setLoading(false);
  }

  // Renderização
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  switch (view) {
    case 'register':
      return (
        <div className="app-container">
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
          
          {/* NOVO: Botão para alterar o tamanho da fonte */}
          <div className="extra-buttons">
            <button 
              onClick={() => setIsFontLarge(!isFontLarge)} 
              className="font-toggle-button"
            >
              {isFontLarge ? 'Fonte Normal' : 'Aumentar Fonte'}
            </button>
          </div>
        </div>
      );

    case 'quiz':
      const currentQuestion = questions[currentQuestionIndex];
      return (
        <div className="app-container">
          <h1>Teste Vocacional</h1>
          <p className="question-text">
            Questão {currentQuestionIndex + 1} de {questions.length}
          </p>
          <div className="question-item">
            <p className="question-enunciado">{currentQuestion.enunciado}</p>
            <div className="options-container option-buttons-container"> {/* Adicionado: option-buttons-container */}
              {currentQuestion.opcoes.map(o => (
                <button
                  key={o.id_o}
                  className="option-button"
                  onClick={() => handleAnswer(currentQuestion.id_q, o.id_o)}>
                  {o.opcao}
                </button>
              ))}
            </div>
          </div>
          <div className="extra-buttons"> {/* Adicionado: extra-buttons container */}
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
      return (
        <div className="app-container">
          <h1>Seu Resultado</h1>
          <p className="result-text">Olá, {userNickname}! Sua área principal de interesse é:</p>
          <div className="main-result">
            <p className="result-area-principal">{finalResult.area}</p>
          </div>
          {finalResult.sugestoes.length > 0 && (
            <div className="suggestions">
              <h2>Alguns caminhos possíveis:</h2>
              <ul>
                {finalResult.sugestoes.map((sugestao, index) => (
                  <li key={index}>{sugestao}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="extra-buttons"> {/* Adicionado: extra-buttons container */}
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
      return (
        <div className="app-container">
          <h1>Histórico de Testes</h1>
          {pastResults.length > 0 ? (
            <>
              <ul className="result-list">
                {pastResults.map((result, index) => (
                  <li key={index} className="result-item">
                    <div>Apelido: {result.nickname}</div>
                    <div>Data: {result.date}</div>
                    <div>Área Principal: {result.area}</div>
                  </li>
                ))}
              </ul>
              <div className="extra-buttons"> {/* Adicionado: extra-buttons container */}
                <button onClick={handleClearHistory} className="clear-history-button">
                  Limpar Histórico
                </button>
                <button onClick={() => setView('register')} className="back-to-test-button">
                  Voltar para Registro
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Nenhum resultado anterior encontrado.</p>
              <div className="extra-buttons"> {/* Adicionado: extra-buttons container */}
                <button onClick={() => setView('register')} className="back-to-test-button">
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