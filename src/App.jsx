import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import './App.css';

// ========================================================================
// MAPA DE "NOMES BONITOS" ATUALIZADO
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
  
  // --- Nomes do BANCO ANTIGO ---
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

  // Acessibilidade (Fonte)
  const [fontSizeAdjustment, setFontSizeAdjustment] = useState(0);

  // Carga e Erro
  const [questions, setQuestions] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // Normalização (Novo Banco)
  const [maxScores, setMaxScores] = useState({});
  const [courseMap, setCourseMap] = useState({}); 

  // Admin
  const [adminApelido, setAdminApelido] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(null); // Erros específicos de admin/histórico
  const [allDbResults, setAllDbResults] = useState([]); 
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false); 

  // Fluxo Admin (Seleção de DB e Detalhes)
  const [adminSelectedDb, setAdminSelectedDb] = useState(null); // 'new' ou 'old'
  
  // --- MUDANÇA: Em vez de 'viewingHistoryDetails', usamos 'detailedUser' ---
  const [detailedUser, setDetailedUser] = useState(null); // Guarda { id: userId, nickname: userNickname }
  const [historyDetails, setHistoryDetails] = useState(null); // Guarda as respostas do usuário
  const [historyDetailsLoading, setHistoryDetailsLoading] = useState(false);


  // Carrega dados iniciais (Questões, Cursos, etc. do NOVO banco)
  useEffect(() => {
    async function getInitialData() {
      setLoading(true);
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


  // Carrega histórico do DB (se admin logado e DB selecionado)
  useEffect(() => {
      async function loadAdminHistory() {
          if (isMasterAdmin && adminSelectedDb) { 
              setHistoryLoading(true); // Inicia loading aqui
              setError(null); // Limpa erro global
            setAdminError(null); // Limpa erro admin
              const results = await fetchAllResults(adminSelectedDb); 
              setAllDbResults(results);
            // setHistoryLoading(false) é chamado dentro de fetchAllResults
          }
      }
      
      if (view === 'history') { // Carrega quando entra na tela de histórico
          loadAdminHistory();
      }
  }, [view, isMasterAdmin, adminSelectedDb]); // Dependências corretas


  // Efeito para classes do <body> (Adiciona 'detail-page')
  useEffect(() => {
    const bodyClassList = document.body.classList;
    // Limpa todas as classes de view anteriores
    bodyClassList.remove(
      'question-page', 'gif-active', 'nickname-page', 
      'final-page', 'history-page', 'adminLogin', 'detail-page' 
    );

    if (view === 'quiz') {
      bodyClassList.add('question-page');
    } else {
      bodyClassList.add('gif-active'); // Fundo animado padrão
      if (view === 'register' || view === 'adminLogin' || view === 'admin_db_select') { 
        bodyClassList.add('nickname-page'); // Estilos para telas de entrada/seleção
      } else if (view === 'result') {
        bodyClassList.add('final-page');
      } else if (view === 'history') {
        bodyClassList.add('history-page');
      } else if (view === 'detailView') { // --- MUDANÇA ---
        bodyClassList.add('detail-page'); // Adiciona classe para a nova tela
      }
    }
    
    // Função de limpeza para remover a classe ao desmontar ou mudar de view
    return () => {
      bodyClassList.remove(
        'question-page', 'gif-active', 'nickname-page', 
        'final-page', 'history-page', 'adminLogin', 'detail-page'
      );
    };
  }, [view]); // Reage a mudanças na 'view'


  // Efeito para ajuste de fonte
  useEffect(() => {
    const baseFontSize = 16; // Defina um valor base se necessário
    const currentFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || baseFontSize;
    const newSize = currentFontSize + fontSizeAdjustment;
    document.documentElement.style.fontSize = `${newSize}px`; // Aplica no HTML para herança

    return () => {
      document.documentElement.style.fontSize = ''; // Reseta ao sair
    };
  }, [fontSizeAdjustment]);

  // Funções de Fonte
  function increaseFontSize() {
    setFontSizeAdjustment(adj => Math.min(adj + 2, 8)); // Limita o aumento
  }

  function decreaseFontSize() {
    setFontSizeAdjustment(adj => Math.max(adj - 2, -4)); // Limita a redução
  }


  // --- FUNÇÕES DE ADMIN ---
  
  // Login do Admin (Verifica user_mestre)
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

  // Busca o histórico (Novo ou Antigo) - Verifica RLS
  async function fetchAllResults(dbSource) {
    // setHistoryLoading(true) é chamado ANTES de chamar esta função
    // setError(null) e setAdminError(null) também
    
    let data, error;
    let results = []; // Começa com array vazio

    try {
      // --- LÓGICA DO "BANCO ANTIGO" ---
      if (dbSource === 'old') {
          ({ data, error } = await supabase
              .from('resultado_antigo')
              .select(`id_u, area_principal, usuarios_antigo(apelido, data_criacao)`)
              .order('id_r', { ascending: false })
              .limit(10000)); 

          if (error) throw new Error(`Banco Antigo: ${error.message}`);

          results = data.map(item => {
            const userData = item.usuarios_antigo || {};
            const timestamp = new Date(userData.data_criacao || Date.now()); 
            return {
              id_u: item.id_u,
              nickname: userData.apelido || 'Usuário Deletado',
              date: timestamp.toLocaleDateString('pt-BR'),
              time: timestamp.toLocaleTimeString('pt-BR'),
              foco: prettyFocusNames[item.area_principal] || item.area_principal, 
            };
          });
      } 
      // --- LÓGICA DO "NOVO BANCO" ---
      else {
          ({ data, error } = await supabase
              .from('resultado')
              .select(`id_u, foco_principal, usuarios(apelido, data_criacao)`)
              .order('id_r', { ascending: false }) 
              .limit(10000)); 

          if (error) throw new Error(`Banco Novo: ${error.message}`);

          results = data.map(item => {
            const userData = item.usuarios || {};
            const timestamp = new Date(userData.data_criacao || Date.now());
            return {
              id_u: item.id_u,
              nickname: userData.apelido || 'Usuário Deletado',
              date: timestamp.toLocaleDateString('pt-BR'),
              time: timestamp.toLocaleTimeString('pt-BR'),
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

  // --- MUDANÇA: Função 'handleViewHistoryDetails' ---
  // Agora define o usuário e muda a view, além de buscar os dados
  async function handleViewHistoryDetails(userId, userNickname) {
      if (!userId || !userNickname) {
        console.error('ID ou Apelido do usuário ausente.');
        setAdminError('Não foi possível identificar o usuário para ver os detalhes.');
        return;
      }
      
      setDetailedUser({ id: userId, nickname: userNickname }); // Guarda ID e Nickname
      setView('detailView'); // Muda para a nova tela
      setHistoryDetailsLoading(true);
      setHistoryDetails(null);
      setAdminError(null); 

      const isOldDb = adminSelectedDb === 'old';
      const respostasTable = isOldDb ? 'respostas_usuario_antigo' : 'respostas_usuario';
      const questoesTable = isOldDb ? 'questoes_antigo' : 'questoes';
      const opcoesTable = isOldDb ? 'opcoes_antigo' : 'opcoes';

      try {
        // 1. Buscar todas as respostas (pares de ID)
        const { data: respostasData, error: respostasError } = await supabase
          .from(respostasTable)
          .select('id_q, id_o')
          .eq('id_u', userId);

        if (respostasError) throw new Error(`ao buscar ${respostasTable}: ${respostasError.message}`);
        if (!respostasData || respostasData.length === 0) {
          setHistoryDetails([]); // Usuário sem respostas
          setHistoryDetailsLoading(false);
          return;
        }

        // 2. Coletar IDs únicos
        const questionIds = [...new Set(respostasData.map(r => r.id_q))];
        const optionIds = [...new Set(respostasData.map(r => r.id_o))];

        // 3. Buscar os textos das perguntas e opções
        const { data: questoesData, error: questoesError } = await supabase
          .from(questoesTable)
          .select('id_q, enunciado')
          .in('id_q', questionIds);
        if (questoesError) throw new Error(`ao buscar ${questoesTable}: ${questoesError.message}`);

        const { data: opcoesData, error: opcoesError } = await supabase
          .from(opcoesTable)
          .select('id_o, opcao')
          .in('id_o', optionIds);
        if (opcoesError) throw new Error(`ao buscar ${opcoesTable}: ${opcoesError.message}`);

        // 4. Mapear os textos para facilitar a busca
        const questoesMap = new Map(questoesData.map(q => [q.id_q, q.enunciado]));
        const opcoesMap = new Map(opcoesData.map(o => [o.id_o, o.opcao]));

        // 5. Combinar tudo
        const combinedDetails = respostasData.map(resposta => ({
          questoes: {
            enunciado: questoesMap.get(resposta.id_q) || `[Questão ID ${resposta.id_q} não encontrada]`
          },
          opcoes: {
            opcao: opcoesMap.get(resposta.id_o) || `[Opção ID ${resposta.id_o} não encontrada]`
          }
        }));

        setHistoryDetails(combinedDetails);

      } catch (err) {
        console.error("Erro ao buscar detalhes do histórico:", err);
        setAdminError(`Erro ${err.message}. Verifique o RLS.`);
        setHistoryDetails([]);
      } finally {
        setHistoryDetailsLoading(false);
      }
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
    setDetailedUser(null); // --- MUDANÇA ---
    setHistoryDetails(null);
    setAdminError(null);
    setError(null); // Limpa o erro global

    setView('register');
  }
 
  // Registro (salva em 'usuarios' do NOVO banco)
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
 
  // Salva a resposta e avança ou finaliza
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

  // Reinicia o teste (volta para o registro)
  function handleRestartTest() {
    handleGoToRegister();
  }

  // Salva o resultado no Histórico Local (localStorage)
  function handleSaveResult(result) { 
    try {
      const resultToSave = {
        ...result,
        foco: prettyFocusNames[result.foco] || result.foco 
      };
      const currentHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
      const newHistory = [...currentHistory, resultToSave];
      setPastResults(newHistory);
      localStorage.setItem('testHistory', JSON.stringify(newHistory));
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }
  }

  // Limpa o Histórico Local
  function handleClearHistory() { 
    try {
      setPastResults([]);
      localStorage.removeItem('testHistory');
    } catch (e) {
      console.error("Erro ao limpar localStorage:", e);
    }
  }

  // Processa e Salva o Teste (NO BANCO NOVO)
  async function handleSubmitTest(answers) { 
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
            if (!maxScore) console.warn(`Pontuação máxima para "${foco}" não encontrada.`);
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
      // Opcional: voltar para o início ou para a última questão?
      setView('register'); // Volta para o início em caso de erro grave
    } finally {
      setLoading(false);
    }
  }


  // --- RENDERIZAÇÃO ---

  // Loading Global (exceto histórico que tem o seu)
  if (loading && view !== 'history' && view !== 'detailView') { 
    return <div className="loading">Carregando...</div>;
  }

  // Error Global (mostra mensagem e botão de voltar)
  if (error) {
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
    case 'register':
      return (
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

  	 case 'adminLogin':
  	   return (
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
  	 
  	 case 'admin_db_select':
  	 	 return (
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

  	 case 'quiz': 
  	 	 const currentQuestion = questions[currentQuestionIndex];
  	 	 if (!currentQuestion) return <div className="loading">Carregando questão...</div>; // Segurança extra
  	 	 const selectedOptionId = userAnswers.find(a => a.id_q === currentQuestion.id_q)?.id_o; // Encontra o ID da opção selecionada
  	 	 
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
  	   	 	 	 	 	 	 	 className={`option-button ${selectedOptionId === o.id_o ? 'selected' : ''}`} // Compara IDs
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

  	 case 'result': 
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

  	 case 'history':
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
  	 	 	 	 	 	 	 	 <li key={result.id_u + '-' + index} className="result-item"> {/* Chave mais robusta */}
  	 	 	 	 	 	 	 	 	 <div>
  	 	 	 	 	 	 	 	 	 	 {/* --- MUDANÇA: Botão chama handleView passando ID e Nickname --- */}
  	 	 	 	 	 	 	 	 	 	 {isMasterAdmin ? (
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
  	 	 	 	 	 	 	 	 	 <div>Data: {result.date} {isMasterAdmin ? `às ${result.time}` : ''}</div>
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

      // --- MUDANÇA: Nova Tela de Detalhes ---
      case 'detailView':
        if (!detailedUser) { // Segurança: se não houver usuário selecionado, volta pro histórico
          console.warn("Tentativa de acessar 'detailView' sem 'detailedUser'.");
          setView('history');
          return null;
        }
        return (
          <div className="app-container detail-page-container"> {/* Container específico se necessário */}
            {/* Botão Voltar Trigger (pode ser o mesmo admin-trigger ou um botão normal) */}
            <div className="admin-trigger" onClick={() => { setView('history'); setHistoryDetails(null); setDetailedUser(null); setAdminError(null); }} title="Voltar ao Histórico"></div>
            
            <h1>Respostas de {detailedUser.nickname}</h1>

            {/* Mostra erro específico do detalhe */}
            {adminError && <div className="error-message" style={{backgroundColor: '#ffdddd', border: '1px solid #ff0000', padding: '10px', borderRadius: '5px', textAlign: 'center', marginBottom: '15px'}}><p style={{color: '#D8000C', margin: 0}}>{adminError}</p></div>}

            {/* Mostra loading */}
            {historyDetailsLoading && <div className="loading">Carregando respostas...</div>}

            {/* Mostra detalhes */}
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

            {/* Mensagem se não houver detalhes */}
            {!historyDetailsLoading && historyDetails?.length === 0 && (
              <p>Nenhum detalhe de resposta encontrado para este usuário.</p>
            )}

            {/* Botão Voltar */}
            {!historyDetailsLoading && ( // Só mostra botão depois de carregar (ou falhar)
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

  	 default:
        console.warn(`View desconhecida: ${view}. Voltando ao registro.`);
        setView('register'); // Segurança: volta para o início se a view for inválida
  	 	 return null;
  }
}

export default App;