import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// Mapa de Nomes Bonitos
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
  
  // --- Nomes do BANCO ANTIGO ---
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
  year: '2-digit', month: '2-digit', day: '2-digit'
};
const brasiliaTimeOptions = {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false
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
  const [historyRanking, setHistoryRanking] = useState(null); 
  const [adminClickCount, setAdminClickCount] = useState(0); 
  const [adminClickTimer, setAdminClickTimer] = useState(null);

  // Efeitos
  useEffect(() => { // Carrega dados iniciais
    async function getInitialData() {
        setLoading(true);
        setError(null);
        try {
          const { data: questionsData, error: questionsError } = await supabase
            .from('questoes')
            .select(`id_q, enunciado, opcoes(id_o, opcao, pontuacao(foco, valor))`);
          if (questionsError) throw questionsError;
          if (!questionsData || questionsData.length === 0) throw new Error("Nenhuma questão encontrada.");
          setQuestions(questionsData);

          const { data: maxScoresData, error: maxScoresError } = await supabase
            .from('foco_pontuacao_maxima')
            .select('foco, valor_maximo');
          if (maxScoresError) throw maxScoresError;
          if (!maxScoresData) throw new Error("Dados de pontuação máxima não retornados.");
          const maxScoresMap = maxScoresData.reduce((acc, item) => {
              if (item.foco && typeof item.valor_maximo === 'number') { 
                acc[item.foco] = item.valor_maximo;
              } else { console.warn("Item de pontuação máxima inválido:", item); }
              return acc;
          }, {});
          if (Object.keys(maxScoresMap).length === 0) throw new Error("Nenhuma pontuação máxima válida encontrada.");
          setMaxScores(maxScoresMap);

          const { data: coursesData, error: coursesError } = await supabase
            .from('cursos_por_foco')
            .select('foco, curso_nome');
          if (coursesError) throw coursesError;
          if (!coursesData) throw new Error("Dados de cursos por foco não retornados.");
          const courseMapObject = coursesData.reduce((acc, item) => {
              if (item.foco && item.curso_nome) { 
                if (!acc[item.foco]) acc[item.foco] = [];
                acc[item.foco].push(item.curso_nome);
              } else { console.warn("Item de curso por foco inválido:", item); }
              return acc;
          }, {});
          if (Object.keys(courseMapObject).length === 0) console.warn("Nenhum curso por foco encontrado.");
          setCourseMap(courseMapObject);

          // Carrega histórico local AO INICIAR A APLICAÇÃO
          const savedResults = localStorage.getItem('testHistory');
          if (savedResults) {
              try { setPastResults(JSON.parse(savedResults)); } 
              catch (parseError) { 
                console.error("Erro ao parsear histórico local:", parseError); 
                localStorage.removeItem('testHistory'); 
              }
          }
        } catch (err) {
            console.error('Erro ao carregar dados iniciais:', err);
            setError(`Falha ao carregar dados: ${err.message}. Verifique sua conexão e o RLS.`);
        } finally { setLoading(false); }
      }
      getInitialData();
  }, []); // Array vazio garante que rode só uma vez

  useEffect(() => { // Carrega histórico admin (sem alterações)
    async function loadAdminHistory() {
      if (view === 'history' && isMasterAdmin && adminSelectedDb) { 
        setHistoryLoading(true); setError(null); setAdminError(null); 
        const results = await fetchAllResults(adminSelectedDb); 
        setAllDbResults(results);
        console.log(`[loadAdminHistory] Histórico carregado com ${results.length} resultados.`);
      }
    }
    loadAdminHistory(); 
    return () => {
      if (view !== 'history' && isMasterAdmin && adminSelectedDb) { setAllDbResults([]); }
    };
  }, [view, isMasterAdmin, adminSelectedDb]); 

  useEffect(() => { // Classes do body (sem alterações)
      const bodyClassList = document.body.classList;
      const classMap = {
        quiz: 'question-page',
        register: 'nickname-page',
        adminLogin: 'nickname-page',
        admin_db_select: 'nickname-page',
        result: 'final-page',
        history: 'history-page',
        localHistory: 'history-page', 
        detailView: 'detail-page'
      };
      Object.values(classMap).forEach(cls => bodyClassList.remove(cls));
      bodyClassList.remove('gif-active'); 
      const currentClass = classMap[view];
      if (currentClass) {
        bodyClassList.add(currentClass);
        if (view !== 'quiz') { bodyClassList.add('gif-active'); }
      } else if (view !== 'quiz') { bodyClassList.add('gif-active'); }
      return () => {
        Object.values(classMap).forEach(cls => bodyClassList.remove(cls));
        bodyClassList.remove('gif-active');
      };
  }, [view]);

  useEffect(() => { // Ajuste de fonte (sem alterações)
      const initialBaseSizeStr = document.documentElement.getAttribute('data-initial-font-size');
      let initialBaseSize = 16; 
      if (initialBaseSizeStr) { initialBaseSize = parseFloat(initialBaseSizeStr); } 
      else {
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

  // --- FUNÇÃO PARA ACESSO ADMIN SECRETO --- (sem alterações)
  function handleSecretAdminTrigger() {
    const newClickCount = adminClickCount + 1;
    setAdminClickCount(newClickCount);
    if (adminClickTimer) { clearTimeout(adminClickTimer); }
    if (newClickCount >= 5) { 
      console.log("Acesso admin secreto ativado!");
      setAdminClickCount(0); setView('adminLogin'); 
    } else {
      const timer = setTimeout(() => { setAdminClickCount(0); setAdminClickTimer(null); }, 1000); 
      setAdminClickTimer(timer);
    }
  }

  // --- FUNÇÕES DE ADMIN --- (sem alterações)
  async function handleAdminLogin(e) { /* ... */ 
    e.preventDefault(); setAdminError(null); setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.from('user_mestre').select('apelido, senha_hash').eq('apelido', adminApelido).single();
      if (userError && userError.code !== 'PGRST116') throw userError; 
      if (!userData || userError) throw new Error('Apelido ou senha mestre incorretos.');
      const savedPassword = userData.senha_hash;
      if (adminPassword === savedPassword) { setIsMasterAdmin(true); setView('admin_db_select'); } 
      else { throw new Error('Apelido ou senha mestre incorretos.'); }
    } catch (err) { console.error('Erro no login admin:', err); setAdminError(err.message || 'Erro.'); } 
    finally { setLoading(false); }
  }
  async function fetchAllResults(dbSource) { /* ... */ 
    let data, error; let results = []; 
    try {
      if (dbSource === 'old') {
        ({ data, error } = await supabase.from('resultado_antigo').select(`id_u, area_principal, usuarios_antigo(apelido, data_criacao)`).order('id_r', { ascending: false }).limit(10000)); 
        if (error) throw new Error(`Banco Antigo: ${error.message}`); if (!data) throw new Error("Banco Antigo: Nenhum dado.");
        results = data.map(item => { const ud = item.usuarios_antigo || {}; const ts = ud.data_criacao ? new Date(ud.data_criacao) : new Date(); return { id_u: item.id_u, nickname: ud.apelido || '?', date: ts.toLocaleDateString('pt-BR', brasiliaDateOptions), time: ts.toLocaleTimeString('pt-BR', brasiliaTimeOptions), foco: prettyFocusNames[item.area_principal] || item.area_principal, }; });
      } else {
        ({ data, error } = await supabase.from('resultado').select(`id_u, foco_principal, usuarios(apelido, data_criacao)`).order('id_r', { ascending: false }).limit(10000)); 
        if (error) throw new Error(`Banco Novo: ${error.message}`); if (!data) throw new Error("Banco Novo: Nenhum dado.");
        results = data.map(item => { const ud = item.usuarios || {}; const ts = ud.data_criacao ? new Date(ud.data_criacao) : new Date(); return { id_u: item.id_u, nickname: ud.apelido || '?', date: ts.toLocaleDateString('pt-BR', brasiliaDateOptions), time: ts.toLocaleTimeString('pt-BR', brasiliaTimeOptions), foco: prettyFocusNames[item.foco_principal] || item.foco_principal, }; });
      }
    } catch (err) { console.error("Erro histórico:", err); setAdminError(`Falha: ${err.message}. Verifique RLS.`); results = []; } 
    finally { setHistoryLoading(false); } return results; 
  }
  async function handleViewHistoryDetails(userId, userNickname) { /* ... */ 
    if (!userId || !userNickname) { setAdminError('ID/Apelido ausente.'); return; }
    setDetailedUser({ id: userId, nickname: userNickname }); setView('detailView'); setHistoryDetailsLoading(true); setHistoryDetails(null); setHistoryRanking(null); setAdminError(null); 
    const isOldDb = adminSelectedDb === 'old'; const respT = isOldDb ? 'respostas_usuario_antigo' : 'respostas_usuario'; const questT = isOldDb ? 'questoes_antigo' : 'questoes'; const opT = isOldDb ? 'opcoes_antigo' : 'opcoes';
    try {
      if (!isOldDb) {
        const { data: rD, error: rE } = await supabase.from('resultado').select('ranking_completo').eq('id_u', userId).order('id_r', { ascending: false }).limit(1);
        if (rE) throw new Error(`ranking: ${rE.message}. RLS!`);
        if (rD && rD.length > 0 && rD[0].ranking_completo) { const sR = [...rD[0].ranking_completo].sort((a, b) => b.percentual - a.percentual); setHistoryRanking(sR); } 
        else { setHistoryRanking(null); }
      } else { setHistoryRanking(null); }
      const { data: respD, error: respE } = await supabase.from(respT).select('id_q, id_o').eq('id_u', userId);
      if (respE) throw new Error(`${respT}: ${respE.message}. RLS!`);
      if (!respD || respD.length === 0) { setHistoryDetails([]); } 
      else {
        const qIds = [...new Set(respD.map(r => r.id_q))].filter(id => id != null); const oIds = [...new Set(respD.map(r => r.id_o))].filter(id => id != null);     
        if (qIds.length === 0 || oIds.length === 0) { const msg = `Dados ${qIds.length === 0 ? 'questões' : 'opções'} ausentes.`; setAdminError(p => p ? `${p} ${msg}` : msg); setHistoryDetails([]); } 
        else {
            const { data: qD, error: qE } = await supabase.from(questT).select('id_q, enunciado').in('id_q', qIds); if (qE) throw new Error(`${questT}: ${qE.message}`); if (!qD || qD.length === 0) throw new Error(`Nenhuma questão ${questT}.`);
            const { data: oD, error: oE } = await supabase.from(opT).select('id_o, opcao').in('id_o', oIds); if (oE) throw new Error(`${opT}: ${oE.message}`); if (!oD || oD.length === 0) throw new Error(`Nenhuma opção ${opT}.`);
            const qMap = new Map((qD || []).map(q => [q.id_q, q.enunciado])); const oMap = new Map((oD || []).map(o => [o.id_o, o.opcao]));
            const cD = respD.filter(r => qMap.has(r.id_q) && oMap.has(r.id_o)).map(r => ({ questoes: { enunciado: qMap.get(r.id_q) }, opcoes: { opcao: oMap.get(r.id_o) } }));
            setHistoryDetails(cD.length > 0 ? cD : []); 
        }
      }
    } catch (err) { console.error("Erro detalhes:", err); setAdminError(`Erro ${err.message}. RLS.`); setHistoryDetails([]); setHistoryRanking(null); } 
    finally { setHistoryDetailsLoading(false); }
  }

  // --- FUNÇÕES DE NAVEGAÇÃO E TESTE ---
  function handleGoToRegister() { 
      setFontSizeAdjustment(0); setUserId(null); setUserNickname(''); setUserAnswers([]);
      setCurrentQuestionIndex(0); setFinalResult(null); setIsMasterAdmin(false); 
      setAdminApelido(''); setAdminPassword(''); setAllDbResults([]); setAdminSelectedDb(null);
      setDetailedUser(null); setHistoryDetails(null); setHistoryRanking(null); 
      setAdminError(null); setError(null); setAdminClickCount(0); 
      if (adminClickTimer) clearTimeout(adminClickTimer); setAdminClickTimer(null);
      document.documentElement.removeAttribute('data-initial-font-size'); 
      document.documentElement.style.fontSize = ''; 
      setView('register');
  }
  
  async function handleRegister(e) { 
      e.preventDefault(); setRegistrationError(null); setError(null);
      if (!userNickname.trim()) { setRegistrationError('Por favor, digite um apelido.'); return; }
      setLoading(true);
      try {
          const { data, error: insertError } = await supabase.from('usuarios').insert({ apelido: userNickname.trim() }).select('id_u').single(); 
          if (insertError) throw insertError;
          setUserId(data.id_u); setCurrentQuestionIndex(0); setUserAnswers([]); setView('quiz');
      } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        if (err.code === '23505') { setRegistrationError('Apelido já em uso.'); } 
        else { setError('Erro ao cadastrar. Tente mais tarde.'); }
      } finally { setLoading(false); }
  }
  
  // AQUI ESTÁ A TRANSIÇÃO AUTOMÁTICA
  function handleAnswer(questionId, optionId) { 
      const newAnswers = [...userAnswers.filter(a => a.id_q !== questionId), { id_u: userId, id_q: questionId, id_o: optionId }];
      setUserAnswers(newAnswers);
      if (currentQuestionIndex === questions.length - 1) {
        handleSubmitTest(newAnswers); // Passa as respostas ATUALIZADAS
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
  }

  function handleBack() { 
      if (currentQuestionIndex > 0) { setCurrentQuestionIndex(currentQuestionIndex - 1); }
  }

  function handleRestartTest() { handleGoToRegister(); }

  function handleSaveResult(result) { 
      try {
        const resultToSave = { ...result, foco: prettyFocusNames[result.foco] || result.foco || '?' };
        const currentHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
        if (!currentHistory.some(r => r.nickname === resultToSave.nickname && r.date === resultToSave.date && r.foco === resultToSave.foco)) {
          const newHistory = [...currentHistory, resultToSave];
          setPastResults(newHistory); localStorage.setItem('testHistory', JSON.stringify(newHistory));
        } else { console.log("Resultado duplicado no local, não salvo."); }
      } catch (e) { console.error("Erro ao salvar no localStorage:", e); }
  }

  function handleClearHistory() { 
      try { 
          setPastResults([]); 
          localStorage.removeItem('testHistory'); 
      } catch (e) { 
          console.error("Erro ao limpar localStorage:", e); 
          // Define um erro específico para a tela de histórico local
          setError("Não foi possível limpar o histórico local."); 
      }
  }

  async function handleSubmitTest(answersToSubmit) { 
    setLoading(true); setError(null); 
    const currentAnswers = answersToSubmit || userAnswers; 
    if (!currentAnswers || currentAnswers.length === 0) { setError("Nenhuma resposta."); setLoading(false); setView('quiz'); return; }
    // A validação de completude é feita implicitamente pelo fluxo de handleAnswer
    // if (currentAnswers.length !== questions.length) { ... } 

    try {
      console.log("Submetendo respostas:", currentAnswers);
      const { error: answersError } = await supabase.from('respostas_usuario').insert(currentAnswers);
      if (answersError) throw new Error(`salvar respostas: ${answersError.message}`);
      
      const scoreMap = {};
      currentAnswers.forEach(a => { const q = questions.find(q => q.id_q === a.id_q); if (!q) return; const opt = q.opcoes?.find(o => o.id_o === a.id_o); if (!opt || !opt.pontuacao) return; opt.pontuacao.forEach(p => { if (p.foco && typeof p.valor === 'number') scoreMap[p.foco] = (scoreMap[p.foco] || 0) + p.valor; }); });
      
      const percentMap = {}; let hasValidScore = false;
      Object.keys(maxScores).forEach(foco => { const raw = scoreMap[foco] || 0; const max = maxScores[foco]; if (typeof max === 'number' && max > 0) { percentMap[foco] = (raw / max) * 100; hasValidScore = true; } else { percentMap[foco] = 0; } });
      if (!hasValidScore && Object.keys(scoreMap).length > 0) throw new Error("Não normalizar pontuações."); else if (!hasValidScore) throw new Error("Não calcular pontuação.");

      let focosOrdenados = Object.keys(percentMap).map(f => ({ foco: f, percentual: parseFloat(percentMap[f].toFixed(2)) })).sort((a, b) => b.percentual - a.percentual);
      
      const top3 = focosOrdenados.slice(0, 3); if (top3.length === 0 || !top3[0]?.foco) throw new Error("Não determinar área principal.");
      const pool = []; const search = top3.map(f => f.foco);
      if (search[0]) pool.push(...(courseMap[search[0]] || [])); if (search[1]) pool.push(...(courseMap[search[1]] || [])); if (search[2]) pool.push(...(courseMap[search[2]] || []));
      const suggestions = [...new Set(pool)].slice(0, 7); const mainFocus = top3[0];
      
      const resultData = { nickname: userNickname, date: new Date().toLocaleDateString('pt-BR'), foco: mainFocus.foco, sugestoes: suggestions };
      const dbResultData = { id_u: userId, foco_principal: mainFocus.foco, percentual_principal: mainFocus.percentual, ranking_completo: focosOrdenados };

      console.log("Salvando resultado...");
      const { error: resultError } = await supabase.from('resultado').insert(dbResultData);
      if (resultError) throw new Error(`salvar resultado: ${resultError.message}`);

      handleSaveResult(resultData); setFinalResult(resultData); setView('result');
    } catch (err) { console.error('Erro ao submeter:', err); setError(`Erro: ${err.message}.`); setCurrentQuestionIndex(questions.length - 1); setView('quiz'); } 
    finally { setLoading(false); }
  } 

  // --- FUNÇÕES DE RENDERIZAÇÃO ---

  const renderFontControls = () => (
    <div className="font-controls">
      <button onClick={decreaseFontSize} title="Diminuir fonte" className="font-toggle-button">A-</button>
      <button onClick={increaseFontSize} title="Aumentar fonte" className="font-toggle-button">A+</button>
    </div>
  );

  // Tela 1: Registro (SEM histórico local)
  const renderRegister = () => (
    <div className="container register-container">
      <h1>Teste Vocacional</h1>
      <p>Digite seu apelido para começar:</p>
      <form onSubmit={handleRegister}>
        <input
            type="text" value={userNickname}
            onChange={(e) => setUserNickname(e.target.value)}
            placeholder="Seu apelido" maxLength="50"
            style={{ width: '80%', padding: '10px', margin: '10px 0', borderRadius: '5px', border: '1px solid #555', background: '#333', color: '#fff' }}
        />
        <button type="submit" disabled={loading || !userNickname.trim()}>
            {loading ? 'Carregando...' : 'Iniciar Teste'}
        </button>
      </form>
      {registrationError && <div className="error-message"><p>{registrationError}</p></div>} 
      {/* Histórico local e botões relacionados removidos daqui */}
      {renderFontControls()} 
    </div>
  );

  // Tela 2: Quiz (Sem alterações significativas)
  const renderQuiz = () => {
    if (loading && questions.length === 0) { return <div className="loading">Carregando questões...</div>; }
    if (error && questions.length === 0) { return <div className="error-message"><p>{error}</p></div>; }
    if (!loading && questions.length === 0 && !error) { return <div className="error-message"><p>Nenhuma questão encontrada.</p></div>; }
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) { return <div className="loading">Carregando questão...</div>; }
    const selectedAnswer = userAnswers.find(a => a.id_q === currentQuestion.id_q);
    return (
        <div className="container question-container">
            <h2>Questão {currentQuestionIndex + 1} de {questions.length}</h2>
            <p className="question-enunciado" style={{ fontSize: '1.1rem', color: 'var(--eve-branco)', margin: '20px 0' }}>{currentQuestion.enunciado}</p> 
            {error && view === 'quiz' && <div className="error-message"><p>{error}</p></div>} 
            <div className="option-buttons-container"> 
                {(currentQuestion.opcoes || []).map(option => (
                    <button key={option.id_o} className={`option-button ${selectedAnswer?.id_o === option.id_o ? 'selected' : ''}`} onClick={() => handleAnswer(currentQuestion.id_q, option.id_o)}> {option.opcao} </button>
                ))}
            </div>
            <div className="extra-buttons"> 
                {currentQuestionIndex > 0 && ( <button onClick={handleBack} className="back-button"> Voltar </button> )}
            </div>
        </div>
    );
  };

  // Tela 3: Resultado MODIFICADA (Sem ranking, com botão de histórico local)
  const renderResult = () => {
    if (loading && !finalResult) { return <div className="loading">Processando resultado...</div>; }
    if (!finalResult) { return <div className="error-message"><p>Erro ao exibir resultado.</p></div>; }
    const prettyFoco = prettyFocusNames[finalResult.foco] || finalResult.foco;
    return (
      <div className="container result-container">
        <h1>Resultado</h1>
        <p className="result-text">Obrigado, {finalResult.nickname}!</p>
        <p className="result-text">Seu foco principal é:</p>
        <h2 className="main-result">{prettyFoco}</h2>
        {finalResult.sugestoes && finalResult.sugestoes.length > 0 && (
            <div className="suggestions">
              <h3>Sugestões de cursos ({finalResult.sugestoes.length}):</h3>
              <ul> {finalResult.sugestoes.map((curso, index) => ( <li key={index}>{curso}</li> ))} </ul>
            </div>
        )}
        {/* Ranking removido */}
        <div className="extra-buttons">
            <button onClick={handleRestartTest} className="restart-button"> Reiniciar Teste </button>
            <button onClick={() => setView('localHistory')} className="history-button"> Ver Histórico Local </button>
        </div>
      </div>
    );
  };

  // Telas Admin (4, 5, 6, 7) - Sem alterações
  const renderAdminLogin = () => ( 
    <div className="container admin-login-container"><h1>Acesso Mestre</h1><form onSubmit={handleAdminLogin} style={{width:'100%'}}><input type="text" value={adminApelido} onChange={(e)=>setAdminApelido(e.target.value)} placeholder="Apelido Mestre" style={{width:'80%',padding:'10px',margin:'10px 0',borderRadius:'5px',border:'1px solid #555',background:'#333',color:'#fff'}}/><div style={{position:'relative',width:'80%',margin:'10px auto'}}><input type={showAdminPassword?'text':'password'} value={adminPassword} onChange={(e)=>setAdminPassword(e.target.value)} placeholder="Senha Mestre" style={{width:'100%',padding:'10px',borderRadius:'5px',border:'1px solid #555',background:'#333',color:'#fff'}}/><span onClick={()=>setShowAdminPassword(!showAdminPassword)} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',cursor:'pointer',color:'#fff',userSelect:'none',fontSize:'1.2rem'}}>{showAdminPassword?'🙈':'👁️'}</span></div><button type="submit" disabled={loading} className="start-button">{loading?'Verificando...':'Entrar'}</button></form>{adminError&&<div className="error-message"><p>{adminError}</p></div>}<div className="extra-buttons"><button onClick={handleGoToRegister} className="back-button">Voltar</button></div></div> );
  const renderAdminDbSelect = () => ( 
    <div className="container admin-db-select"><h1>Painel Mestre</h1><p>Olá, {adminApelido}. Selecione:</p><div className="extra-buttons"><button onClick={()=>{setAdminSelectedDb('new');setView('history');}} className="history-button">Histórico (Novo)</button><button onClick={()=>{setAdminSelectedDb('old');setView('history');}} className="history-button">Histórico (Antigo)</button></div><div className="extra-buttons" style={{marginTop:'20px'}}><button onClick={handleGoToRegister} className="back-button">Sair</button></div></div> );
  const renderHistory = () => ( 
    <div className="container history-container"><h1>Histórico - Banco {adminSelectedDb==='old'?'Antigo':'Novo'}</h1>{historyLoading&&<div className="loading">Carregando...</div>}{adminError&&<div className="error-message"><p>{adminError}</p></div>}{!historyLoading&&allDbResults.length>0&&( <ul className="result-list">{allDbResults.map((r)=>( <li key={`${r.id_u}-${r.date}-${r.time}`} className="result-item"><div><strong>Apelido: </strong><button onClick={()=>handleViewHistoryDetails(r.id_u,r.nickname)} className="history-nickname-button">{r.nickname}</button> (ID: {r.id_u})</div><div><strong>Data:</strong> {r.date} às {r.time}</div><div><strong>Foco:</strong> {r.foco}</div></li> ))}</ul> )}{!historyLoading&&allDbResults.length===0&&!adminError&&( <p style={{margin:'20px 0',color:'var(--amarelo-wall-e)'}}>Nenhum resultado.</p> )}<div className="extra-buttons"><button onClick={()=>setView('admin_db_select')} className="back-button">Voltar</button><button onClick={handleGoToRegister} className="back-button">Sair</button></div></div> );
  const renderDetailView = () => { 
    if (!detailedUser) { setView('history'); return null; }
    return ( <div className="container detail-view-container"><h1>Detalhes de {detailedUser.nickname}</h1><p>(ID: {detailedUser.id})</p>{historyDetailsLoading&&<div className="loading">Carregando...</div>}{adminError&&<div className="error-message"><p>{adminError}</p></div>}{historyRanking&&historyRanking.length>0&&( <div style={{width:'100%',marginBottom:'20px'}}><h3 style={{color:'var(--amarelo-wall-e)'}}>Ranking (DB)</h3><ul style={{listStyle:'none',padding:'10px',margin:'15px 0',width:'100%',border:'1px solid #444',borderRadius:'5px',backgroundColor:'rgba(0,0,0,0.2)',textAlign:'left'}}>{historyRanking.map((item,i)=>(<li key={i} style={{backgroundColor:'rgba(0,0,0,0.6)',color:'var(--eve-branco)',padding:'10px 15px',marginBottom:'8px',borderRadius:'4px',borderLeft:'5px solid var(--amarelo-wall-e)'}}>{i+1}. {prettyFocusNames[item.foco]||item.foco}: {item.percentual}%</li>))}</ul></div> )}{historyDetails&&historyDetails.length>0&&( <div style={{width:'100%'}}><h3 style={{color:'var(--amarelo-wall-e)'}}>Respostas</h3><ul className="history-details-list">{historyDetails.map((item,i)=>( <li key={i} className="history-detail-item"><p><strong>P:</strong> {item.questoes?.enunciado||'?'}</p><p><strong>R:</strong> {item.opcoes?.opcao||'?'}</p></li> ))}</ul></div> )}{!historyDetailsLoading&&(!historyDetails||historyDetails.length===0)&&(!historyRanking||historyRanking.length===0)&&!adminError&&(<p style={{margin:'20px 0',color:'var(--amarelo-wall-e)'}}>Nenhum detalhe.</p>)}<div className="extra-buttons"><button onClick={()=>{setView('history');setHistoryDetails(null);setDetailedUser(null);setHistoryRanking(null);setAdminError(null);}} className="back-button">Voltar</button></div></div> );
  };

  // === NOVA TELA: Histórico Local ===
  const renderLocalHistory = () => (
    <div className="container local-history-container"> 
        <h1>Histórico Local</h1>
        {error && view === 'localHistory' && <div className="error-message"><p>{error}</p></div>} 
        {pastResults.length === 0 && !error && (
            <p style={{ margin: '20px 0', color: 'var(--amarelo-wall-e)' }}>Nenhum resultado salvo localmente.</p>
        )}
        {pastResults.length > 0 && (
             <ul className="result-list"> 
                {[...pastResults].reverse().map((result, index) => (
                  <li key={`${result.date}-${result.nickname}-${index}`} className="result-item"> 
                    <div><strong>Data:</strong> {result.date}</div>
                    <div><strong>Apelido:</strong> {result.nickname}</div>
                    <div><strong>Foco:</strong> {result.foco}</div>
                  </li>
                ))}
             </ul>
        )}
        <div className="extra-buttons">
            <button onClick={handleClearHistory} className="clear-history-button" disabled={pastResults.length === 0}>
                Limpar Histórico
            </button>
            <button onClick={handleGoToRegister} className="back-to-test-button"> 
                Voltar ao Início
            </button>
        </div>
    </div>
  );

  // --- RENDERIZAÇÃO PRINCIPAL ---
  const renderCurrentView = () => {
    if (error && !['adminLogin', 'register', 'quiz', 'localHistory'].includes(view)) {
      return ( <div className="container error-container"> <h1>Erro Crítico</h1> <div className="error-message"><p>{error}</p></div> <div className="extra-buttons"> <button onClick={handleGoToRegister} className="restart-button"> Tentar Novamente </button> </div> </div> );
    }
    if (loading && questions.length === 0 && ['register', 'quiz'].includes(view)) {
      return <div className="loading">Carregando dados iniciais...</div>;
    }
    switch (view) {
      case 'quiz': return renderQuiz();
      case 'result': return renderResult();
      case 'adminLogin': return renderAdminLogin();
      case 'admin_db_select': return renderAdminDbSelect();
      case 'history': return renderHistory();
      case 'detailView': return renderDetailView();
      case 'localHistory': return renderLocalHistory(); // <-- Nova view
      case 'register': default: return renderRegister();
    }
  };

  // Retorno final
  return (
    <div className="app-container">
      <div className="admin-trigger" onClick={handleSecretAdminTrigger} title=""></div> 
      {renderCurrentView()}
    </div>
  );
}

export default App;