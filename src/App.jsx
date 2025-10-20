import { useState, useEffect } from 'react';
// Certifique-se de que o caminho para 'supabaseClient.js' está correto
import { supabase } from './supabaseClient.js'; 
import './App.css';

// DECLARAÇÃO DAS CONSTANTES DE TABELA
const RESULTADO_NOVO_TABLE = 'resultado';
const RESULTADO_ANTIGO_TABLE = 'resultado_antigo';
const RESPOSTAS_NOVO_TABLE = 'respostas_usuario';
const RESPOSTAS_ANTIGO_TABLE = 'respostas_usuario_antigo'; // Assumindo que existe uma tabela antiga de respostas.

function App() {
    // Estados Principais
    const [userId, setUserId] = useState(null);
    const [userNickname, setUserNickname] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState([]);
    const [finalResult, setFinalResult] = useState(null); 
    const [pastResults, setPastResults] = useState([]);
    // 'register', 'quiz', 'result', 'history', 'adminLogin', 'detailedHistory'
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
    const [allDbResults, setAllDbResults] = useState([]); // Histórico global (resumo)
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false); 
    // ESTADO NOVO: Detalhe do usuário selecionado no histórico admin
    const [selectedUserResults, setSelectedUserResults] = useState(null); 
    // ESTADOS ADICIONAIS DO ADMIN (Top 7 e View Toggle)
    const [top7Results, setTop7Results] = useState([]);
    const [top7Loading, setTop7Loading] = useState(false);
    const [adminHistoryView, setAdminHistoryView] = useState(RESULTADO_NOVO_TABLE); 

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

    // Efeito para carregar o Top 7 e o histórico admin ao entrar na view 'history' (ADMIN)
    useEffect(() => {
        if (view === 'history' && isMasterAdmin) {
            fetchTop7(RESULTADO_NOVO_TABLE).then(data => setTop7Results(data));
            fetchAllResults(adminHistoryView).then(data => setAllDbResults(data));
        }
    }, [view, isMasterAdmin, adminHistoryView]);

    // Alterna classes no <body>
    useEffect(() => { 
        const bodyClassList = document.body.classList;
        bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page', 'adminLogin', 'detailedHistory');

        if (view === 'quiz') {
            bodyClassList.add('question-page');
        } else {
            bodyClassList.add('gif-active');
            if (view === 'register' || view === 'adminLogin') {
                bodyClassList.add('nickname-page');
            } else if (view === 'result') {
                bodyClassList.add('final-page');
            } else if (view === 'history' || view === 'detailedHistory') { 
                bodyClassList.add('history-page');
                if (view === 'detailedHistory') bodyClassList.add('detailedHistory');
            }
        }
        
        return () => {
            bodyClassList.remove('question-page', 'gif-active', 'nickname-page', 'final-page', 'history-page', 'adminLogin', 'detailedHistory');
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


    // --- FUNÇÕES DE ADMIN E HISTÓRICO ---
    
    async function handleAdminLogin(e) {
        e.preventDefault();
        setAdminError(null);
        setLoading(true);

        const { data: userData, error: userError } = await supabase
            .from('user_mestre')
            .select(`apelido, senha_hash`)
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
            setAdminHistoryView(RESULTADO_NOVO_TABLE); // Define a visualização inicial
            setView('history'); 
        } else {
            setAdminError('Apelido ou senha mestre incorretos.');
        }
    }

    // FUNÇÃO 1: BUSCA RESUMO (Histórico Global)
    async function fetchAllResults(tableName) {
        setHistoryLoading(true);
        
        // Esta busca **requer** a Foreign Key no Supabase (resultado(id_u) -> usuarios(id_u))
        const { data, error } = await supabase
            .from(tableName) 
            .select(`
                id_u,
                area_principal,
                usuarios(apelido, data_criacao) 
            `)
            .order('usuarios.data_criacao', { ascending: false }); 

        setHistoryLoading(false);

        if (error) {
            console.error("Erro ao buscar histórico admin (resumo):", error);
            setError(`Erro PGRST: Verifique se a Foreign Key existe na tabela ${tableName}.`); 
            return [];
        }

        return data.map(item => ({
            id: item.id_u, // ID do usuário para a busca detalhada
            nickname: item.usuarios.apelido,
            date: new Date(item.usuarios.data_criacao).toLocaleDateString('pt-BR'),
            area: item.area_principal,
        }));
    }

    // FUNÇÃO 2: BUSCA DETALHES (Mantida Inalterada)
    async function fetchDetailedResults(userId) {
        if (!isMasterAdmin) return; 

        setLoading(true); 
        setAdminError(null);

        try {
            // Usa a tabela de respostas correspondente à view atual do Admin
            const respostasTable = adminHistoryView === RESULTADO_NOVO_TABLE ? RESPOSTAS_NOVO_TABLE : RESPOSTAS_ANTIGO_TABLE;
            
            // 1. Buscar todas as respostas do usuário e suas pontuações associadas
            const { data: respostas, error: resError } = await supabase
                .from(respostasTable) 
                .select('questoes(enunciado), opcoes(opcao, pontuacao(area,valor))')
                .eq('id_u', userId)
                .order('id_q', { ascending: true }); 

            if (resError) {
                console.error("Erro na busca de detalhes:", resError);
                throw resError;
            }

            // 2. Calcular o score total (Top 5)
            const scoreMap = {};
            respostas.forEach(r => {
                if (r.opcoes && r.opcoes.pontuacao) {
                    r.opcoes.pontuacao.forEach(p => {
                        scoreMap[p.area] = (scoreMap[p.area] || 0) + (p.valor || 0);
                    });
                }
            });

            let top5Areas = Object.entries(scoreMap)
                .map(([area, score]) => ({ area, score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
            
            // 3. Buscar o Apelido e a Data de Criação do Usuário
            const { data: user, error: userError } = await supabase
                .from('usuarios')
                .select('apelido, data_criacao')
                .eq('id_u', userId)
                .single();

            if (userError) throw userError;

            // 4. Estrutura o resultado detalhado
            const detailedResult = {
                nickname: user.apelido,
                date: new Date(user.data_criacao).toLocaleDateString('pt-BR'),
                principalArea: top5Areas.length > 0 ? top5Areas[0].area : 'N/A', 
                topAreas: top5Areas,
                questions: respostas.map(r => ({
                    enunciado: r.questoes.enunciado, 
                    resposta: r.opcoes.opcao, 
                    pontuacoes: r.opcoes.pontuacao ? r.opcoes.pontuacao.filter(p => p.valor && p.valor !== 0) : []
                }))
            };
            
            setSelectedUserResults(detailedResult);
            setView('detailedHistory'); 

        } catch (err) {
            console.error("Erro ao buscar detalhes do histórico:", err);
            setAdminError('Erro ao carregar os detalhes do histórico. Verifique o console.');
        } finally {
            setLoading(false);
        }
    }

    // FUNÇÃO 3: BUSCA TOP 7 (Para a área ADMIN)
    async function fetchTop7(tableName) {
        setTop7Loading(true);
        
        // Esta query *deve* calcular o TOP 7 da area_principal. 
        // Dependendo de como a tabela está estruturada, 
        // talvez precise de uma *View* ou *Function* no Supabase para agregar.
        // Assumindo que você tem uma coluna 'percentual_principal' ou similar para ordenar.
        const { data, error } = await supabase
            .from(tableName) 
            .select(`area_principal, percentual_principal`) 
            .order('percentual_principal', { ascending: false })
            .limit(7);

        setTop7Loading(false);

        if (error) {
            console.error("Erro ao buscar Top 7:", error);
            return [];
        }

        // Se 'percentual_principal' não for um percentual, ajuste a formatação aqui.
        return data.map(item => ({
            area_principal: item.area_principal,
            percentual_principal: item.percentual_principal, // Assume que é um valor numérico
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

        const { data: existingUser, error: fetchError } = await supabase
            .from('usuarios')
            .select('id_u')
            .eq('apelido', userNickname)
            .single();

        let currentUserId;

        if (fetchError && fetchError.code === 'PGRST116') { 
            const { data: newUser, error: insertError } = await supabase
                .from('usuarios')
                .insert([{ apelido: userNickname }])
                .select('id_u')
                .single();

            if (insertError) {
                console.error("Erro ao cadastrar usuário:", insertError);
                setRegistrationError('Erro ao salvar o apelido. Tente outro nome.');
                setLoading(false);
                return;
            }
            currentUserId = newUser.id_u;
        } else if (fetchError) {
            console.error("Erro ao buscar usuário existente:", fetchError);
            setRegistrationError('Erro de conexão com o banco de dados.');
            setLoading(false);
            return;
        } else {
            currentUserId = existingUser.id_u; 
        }

        setUserId(currentUserId);
        setLoading(false);
        setView('quiz');
    }

    function handleAnswer(questionId, optionId) { 
        const newAnswers = userAnswers.filter(a => a.id_q !== questionId);
        newAnswers.push({ id_q: questionId, id_o: optionId });
        setUserAnswers(newAnswers);

        if (currentQuestionIndex < questions.length - 1) {
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
        setSelectedUserResults(null); 
        setAdminHistoryView(RESULTADO_NOVO_TABLE); // Resetar view admin
        setView('register');
    }

    function handleRestartTest() { 
        setUserAnswers([]);
        setCurrentQuestionIndex(0);
        setFinalResult(null);
        setView('quiz');
    }

    function handleSaveResult(result) { 
        const updatedHistory = [result, ...pastResults];
        setPastResults(updatedHistory);
        localStorage.setItem('testHistory', JSON.stringify(updatedHistory));
    }

    function handleClearHistory() { 
        setPastResults([]);
        localStorage.removeItem('testHistory');
    }

    async function handleSubmitTest(answers) { 
        setLoading(true);

        // 1. SALVA RESPOSTAS NA TABELA `respostas_usuario` (Tabela Nova)
        const answersToSave = answers.map(a => ({
            id_u: userId,
            id_q: a.id_q,
            id_o: a.id_o,
        }));
        
        const { error: answersError } = await supabase
            .from(RESPOSTAS_NOVO_TABLE) 
            .insert(answersToSave);

        if (answersError) {
            console.error('Erro ao salvar as respostas:', answersError);
        }

        // 2. Calcula a Pontuação (Lógica inalterada)
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

        // 3. Ordena as Áreas e Pega o Top 5
        let areas = Object.entries(scoreMap)
            .map(([area, score]) => ({ area, score }))
            .sort((a, b) => b.score - a.score);

        const top5Areas = areas.slice(0, 5);
        
        // 4. Mapeamento de Sugestões de Cursos (Lógica inalterada)
        const areaMapping = { 
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

            // 5. Estrutura do Resultado Final
            const currentResult = {
                nickname: userNickname,
                date: new Date().toLocaleDateString('pt-BR'),
                area: finalArea,
                topAreas: top5Areas,
                sugestoes: suggestions
            };

            // 6. Salva o Resultado Principal no Banco (tabela 'resultado')
            const { error: saveError } = await supabase
                .from(RESULTADO_NOVO_TABLE) 
                .insert({
                    id_u: userId,
                    area_principal: finalArea,
                    percentual_principal: principalArea.score 
                })
                .select();

            if (saveError && saveError.code !== '23505') {
                console.error('Erro ao salvar o resultado final:', saveError.message);
                setError('Erro ao salvar o resultado final no banco de dados.');
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
    
    // --- RENDERIZAÇÃO DE COMPONENTES DE ADMIN ---

    const renderTop7 = () => {
        if (top7Loading) return <p>Carregando Top 7...</p>;
        if (top7Results.length === 0) return <p>Nenhum ranking de área encontrado.</p>;

        return (
            <div className="top7-list">
                <h3>Top 7 Áreas Principais ({RESULTADO_NOVO_TABLE})</h3>
                <ol className="suggestions">
                    {top7Results.map((item, index) => (
                        <li key={index}>
                            <strong className="area">{item.area_principal}</strong> 
                            <span className="percentual"> ({item.percentual_principal})</span>
                        </li>
                    ))}
                </ol>
            </div>
        );
    };

    const renderAdminHistorySwitch = () => (
        <div className="toggle-buttons-admin">
            <button 
                onClick={() => setAdminHistoryView(RESULTADO_NOVO_TABLE)} 
                className={adminHistoryView === RESULTADO_NOVO_TABLE ? 'active' : ''}
            >
                Resultados Novos ({RESULTADO_NOVO_TABLE})
            </button>
            <button 
                onClick={() => setAdminHistoryView(RESULTADO_ANTIGO_TABLE)} 
                className={adminHistoryView === RESULTADO_ANTIGO_TABLE ? 'active' : ''}
            >
                Resultados Antigos ({RESULTADO_ANTIGO_TABLE})
            </button>
        </div>
    );
    
    // --- RENDERIZAÇÃO DA VIEW ---

    if (loading && view !== 'history' && view !== 'detailedHistory') { 
        return <div className="loading">Carregando...</div>;
    }

    if (error && view !== 'history' && view !== 'detailedHistory') {
        return <div className="error">{error}</div>;
    }

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
                                style={{ width: '100%', padding: '10px', paddingRight: '40px', boxSizing: 'border-box', borderRadius: '5px', border: '1px solid #ccc' }} 
                            />
                            <button
                                type="button" 
                                onClick={() => setShowAdminPassword(!showAdminPassword)}
                                style={{
                                    position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#2e2e2e', fontSize: '1.2rem',
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
            const currentQuestion = questions[currentQuestionIndex];
            const selectedOption = userAnswers.find(a => a.id_q === currentQuestion.id_q);
            
            if (!currentQuestion) return <div className="loading">Carregando questões...</div>;
            
            return (
                <div className="app-container">
                    <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
                    <h1>Teste Vocacional</h1>
                    <p className="question-text">Questão {currentQuestionIndex + 1} de {questions.length}</p>
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
                        <button 
                            onClick={() => {
                                if (currentQuestionIndex === questions.length - 1) {
                                    handleSubmitTest(userAnswers);
                                } else {
                                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                                }
                            }} 
                            className="start-button"
                            disabled={!selectedOption && currentQuestionIndex < questions.length - 1}
                        >
                            {currentQuestionIndex === questions.length - 1 ? 'Ver Resultado' : 'Avançar'}
                        </button>
                    </div>
                </div>
            );

        case 'result': 
            if (!finalResult) return <div className="error">Resultado indisponível.</div>;

            const [principalArea] = finalResult.topAreas;

            return (
                <div className="app-container">
                    <div className="admin-trigger" onClick={() => setView('adminLogin')} title="Acesso Administrativo"></div>
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

            return (
                <div className="app-container">
                    <div 
                        className="admin-trigger" 
                        onClick={handleGoToRegister} 
                        title="Sair do modo Admin / Voltar ao Início"
                    >
                    </div>
                    
                    <h1>{historyTitle}</h1>
                    {isMasterAdmin && renderTop7()} 
                    
                    {isMasterAdmin && renderAdminHistorySwitch()} 

                    {historyLoading ? (
                        <div className="loading">Carregando histórico do servidor ({adminHistoryView})...</div>
                    ) : (
                        <>
                            {isMasterAdmin && error && <div className="error-message">{error}</div>}
                            {displayedResults.length > 0 ? (
                                <>
                                    <p className="instruction">
                                        {isMasterAdmin ? `Visualizando ${adminHistoryView}. Clique para ver os detalhes das respostas.` : 'Este é o seu histórico salvo localmente.'}
                                    </p>
                                    <ul className="result-list">
                                        {displayedResults.map((result, index) => (
                                            <li 
                                                key={index} 
                                                className={`result-item ${isMasterAdmin ? 'clickable' : ''}`}
                                                onClick={() => isMasterAdmin && fetchDetailedResults(result.id)}
                                                title={isMasterAdmin ? "Clique para ver detalhes" : "Visualização local"}
                                            >
                                                <div>Apelido: <strong>{result.nickname}</strong></div>
                                                <div>Data: {result.date}</div>
                                                <div>Área Principal: <strong>{result.area}</strong></div>
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
                                    <p>Nenhum resultado {isMasterAdmin ? `encontrado na tabela ${adminHistoryView}.` : 'anterior encontrado localmente.'}</p>
                                    <div className="extra-buttons">
                                        <button onClick={handleGoToRegister} className="back-to-test-button">
                                            Voltar para Registro
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            );

        case 'detailedHistory':
            if (loading) return <div className="loading">Carregando detalhes...</div>;
            if (!selectedUserResults || !isMasterAdmin) {
                return <div className="error">Detalhes indisponíveis ou acesso negado.</div>;
            }

            return (
                <div className="app-container">
                    <div 
                        className="admin-trigger" 
                        onClick={() => setView('history')} 
                        title="Voltar ao Histórico Geral"
                    >
                    </div>
                    <h1>Detalhes do Teste de **{selectedUserResults.nickname}**</h1>
                    <p className="result-summary">
                        **Data:** {selectedUserResults.date} | **Área Principal:** **{selectedUserResults.principalArea}**
                    </p>
                    
                    <div className="detail-section">
                        <h2>Top Áreas Calculadas:</h2>
                        <ul className="suggestions">
                            {selectedUserResults.topAreas.map((item, index) => (
                                <li key={item.area}>
                                    <strong>{index + 1}º. {item.area}</strong> (Pontuação: {item.score})
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="detail-section">
                        <h2>Respostas do Usuário:</h2>
                        <ul className="questions-answered">
                            {selectedUserResults.questions.map((q, index) => (
                                <li key={index}>
                                    <p><strong>P{index + 1}:</strong> {q.enunciado}</p>
                                    <p className="user-answer"><strong>Resposta:</strong> {q.resposta}</p>
                                    {q.pontuacoes.length > 0 && (
                                        <p className="pontuacoes-detail">
                                            (Pontuação: {q.pontuacoes.map(p => `${p.area}: +${p.valor}`).join('; ')})
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="extra-buttons">
                        <button onClick={() => setView('history')} className="back-button">
                            Voltar ao Histórico Geral
                        </button>
                    </div>
                </div>
            );
            
        default:
            return <div className="error">View inválida.</div>;
    }
}

export default App;