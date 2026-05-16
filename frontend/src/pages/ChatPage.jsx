import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../features/chat/components/sidebar/Sidebar';
import MessageBubble from '../features/chat/components/window/MessageBubble';
import InputBox from '../features/chat/components/input/InputBox';
import ProjectModal from '../features/chat/components/sidebar/ProjectModal';
import { useChatProject } from '../features/chat/hooks/useChatProject';
import { generateChatTitle } from '../features/chat/utils/generateChatTitle';
import api, { previewMask, sendChat } from '../api/client';
import { labelEntityType } from '../utils/entityLabels';
import './ChatPage.css';

// =====================================================
// ChatPage 而댄룷?뚰듃
// ??븷:
// 1) 吏곸썝??梨꾪똿 UI ?꾩껜瑜?愿由ы븯??理쒖긽??而댄룷?뚰듃
// 2) 梨꾪똿 紐⑸줉, ?꾩옱 梨꾪똿, ?꾨줈?앺듃 ?곹깭瑜???怨녹뿉??愿由?// 3) localStorage瑜??꾩떆 DB濡??ъ슜 (諛깆뿏???곕룞 ?꾧퉴吏)
// 4) 梨꾪똿/?꾨줈?앺듃 CRUD ?몃뱾?щ? ?먯떇 而댄룷?뚰듃??props濡??꾨떖
// =====================================================
function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 濡쒓렇?명븳 ?ъ슜???뺣낫 (留덉슫??????踰덈쭔 ?뚯떛)
  // userEmail???ㅻ줈 ?ъ슜???ъ슜?먮퀎 梨꾪똿/?꾨줈?앺듃瑜?遺꾨━ ???  // 而댄룷?뚰듃 ?앹〈 以?sessionStorage??userInfo??蹂?섏? ?딆쑝誘濡??섏〈??諛곗뿴 鍮꾩?
  const userInfo = useMemo(
    () => JSON.parse(sessionStorage.getItem('userInfo') || '{}'),
    []
  );
  const userEmail = userInfo.email || 'guest';

  // ===== 怨듭쑀 ?곹깭 ??useChatProject hook =====
  // chats / projects 濡쒕뱶쨌??Β룰났??議곗옉??hook?쇰줈 ?꾩엫
  // (以묐났 ?쒓굅: ProjectPage???숈씪??hook ?ъ슜)
  const {
    chats, setChats,
    projects, setProjects,
    isDataLoaded,
    deleteChat,
    loadChatMessages,
    renameChat,
    createProject,
    updateProject,
    addChatToProject,
    deleteProject,
  } = useChatProject(userEmail);

  // ===== ???섏씠吏 ?꾩슜 State =====
  const [currentChatId, setCurrentChatId] = useState(null); // ?꾩옱 ?좏깮??梨꾪똿 ID
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false); // ?꾨줈?앺듃 紐⑤떖 ?대┝ ?щ?
  const [editingProject, setEditingProject] = useState(null); // ?섏젙 以묒씤 ?꾨줈?앺듃 (null?대㈃ ???앹꽦)
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmProvider, setLlmProvider] = useState('openai');

  // 硫붿떆吏 紐⑸줉 留??꾨옒瑜?媛由ы궎??ref (?먮룞 ?ㅽ겕濡ㅼ슜)
  const messagesEndRef = useRef(null);

  // ===== 珥덇린 currentChatId ?ㅼ젙 =====
  // hook??isDataLoaded媛 true媛 ?섎뒗 ?쒓컙 ??踰덈쭔 ?ㅽ뻾
  // - ProjectPage?먯꽌 navigate('/chat', { state: { chatId } })濡??섏뼱??寃쎌슦 ?대떦 梨꾪똿 ?좏깮
  // - ?쇰컲 吏꾩엯??寃쎌슦 湲곗〈 梨꾪똿???먮룞 ?좏깮?섏? ?딄퀬 ???낅젰 ?붾㈃ ?쒖떆
  useEffect(() => {
    if (!isDataLoaded) return;
    if (currentChatId) return;

    const targetChatId = location.state?.chatId;
    if (!targetChatId) return;

    if (!chats.some(chat => chat.id === targetChatId)) {
      setChats(prev => [{
        id: targetChatId,
        title: '??梨꾪똿',
        messages: [],
        projectId: location.state?.projectId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ...prev]);
    }

    setCurrentChatId(targetChatId);
    const selected = chats.find(chat => chat.id === targetChatId);
    if (!selected || selected.messages.length === 0) {
      loadChatMessages(targetChatId);
    }
  }, [isDataLoaded, chats, currentChatId, location.state?.chatId, loadChatMessages]);

  // ===== ?먮룞 ?ㅽ겕濡?=====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId]);

  // ===== ??梨꾪똿 踰꾪듉 =====
  // ?ъ씠?쒕컮??"??梨꾪똿" 踰꾪듉 ?대┃ ??鍮?梨꾪똿 ?앹꽦 ???대룞
  const handleNewChat = () => {
    const newChat = {
      // [踰꾧렇 ?섏젙] Date.now() ???crypto.randomUUID() ?ъ슜
      // Date.now()??諛由ъ큹 ?⑥쐞濡??숈씪 ?깆뿉 異⑸룎 媛?μ꽦 ?덉쓬
      id: crypto.randomUUID(),
      title: '??梨꾪똿',
      messages: [],
      projectId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  // ===== 梨꾪똿 ?좏깮 =====
  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    const selected = chats.find(chat => chat.id === chatId);
    if (selected && selected.messages.length === 0) {
      loadChatMessages(chatId);
    }
  };

  // ===== 梨꾪똿 ??젣 =====
  // hook??deleteChat?쇰줈 ??젣 ?? ??젣??梨꾪똿???꾩옱 ?좏깮 以묒씠?덈떎硫?currentChatId??媛깆떊
  // (currentChatId 媛깆떊? ???섏씠吏?먮쭔 ?덈뒗 濡쒖쭅?대씪 hook 諛뽰뿉??泥섎━)
  // deleteChat??async?대?濡?await ?꾩슂
  const handleDeleteChat = async (chatId) => {
    const deleted = await deleteChat(chatId);
    if (deleted && currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // handleRenameChat ??hook??renameChat 吏곸젒 ?ъ슜 (Sidebar??prop?쇰줈 ?꾨떖)
  // handleAddChatToProject ??hook??addChatToProject 吏곸젒 ?ъ슜

  // ===== AI ?묐떟 ?붿껌 (怨듯넻 ?⑥닔) =====
  // ??븷: AI ?묐떟 硫붿떆吏瑜??앹꽦??吏?뺣맂 梨꾪똿??異붽?
  // - handleSend / handleEditMessage ?묒そ?먯꽌 ?몄텧??以묐났 肄붾뱶 ?쒓굅
  // - 諛깆뿏???곕룞 ?????⑥닔??setTimeout 遺遺꾨쭔 API ?몄텧濡?援먯껜?섎㈃ ??  //
  // ?뚮씪誘명꽣:
  //   targetChatId ???묐떟??異붽???梨꾪똿 ID
  //                  (setTimeout ?댄썑?먮룄 ?뺥솗??梨꾪똿??異붽??섎룄濡??몄텧 ?쒖젏??罹≪쿂?댁꽌 ?꾨떖)
  //   chatTitle    ??梨꾪똿 ?쒕ぉ???④퍡 媛깆떊?????ъ슜 (泥?硫붿떆吏 ?꾩넚 ?쒖뿉留??꾨떖)
  //                  null?대㈃ 湲곗〈 ?쒕ぉ 洹몃?濡??좎?
  const saveConversation = async (targetChatId, title, messages) => {
    const safeMessages = messages.filter((message) => (
      message.role !== 'user' || message.isSanitized
    ));
    if (!safeMessages.length) return;

    try {
      const targetChat = chats.find(chat => chat.id === targetChatId);
      const projectId = targetChat?.projectId || (
        location.state?.chatId === targetChatId ? location.state?.projectId : null
      );
      await api.post(`/mask/conversations/${targetChatId}/messages`, {
        title,
        project_id: projectId || null,
        messages: safeMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.text,
          was_masked: Boolean(message.wasMasked),
          entities: message.entities || [],
          risk_level: message.riskLevel || 'none',
        })),
      });
    } catch (err) {
      console.error('梨꾪똿 ????ㅽ뙣:', err);
    }
  };

  const applyPreviewMask = async (targetChatId, originalText, userMessageId) => {
    try {
      const { data } = await previewMask({
        text: originalText,
        session_id: targetChatId,
      });
      const detectedItems = [...new Set((data.detected_entities || []).map((item) => labelEntityType(item.entity_type)))];
      const maskedUserMessage = {
        id: userMessageId,
        text: data.masked_text,
        role: 'user',
        timestamp: new Date().toISOString(),
        wasMasked: data.was_masked,
        isSanitized: true,
        detectedItems,
        entities: data.detected_entities || [],
        riskLevel: data.overall_risk || 'none',
      };

      setChats(prev => prev.map(chat => (
        chat.id === targetChatId
          ? {
              ...chat,
              messages: chat.messages.map((message) => (
                message.id === userMessageId ? maskedUserMessage : message
              )),
              updatedAt: new Date().toISOString(),
            }
          : chat
      )));

      return maskedUserMessage;
    } catch (err) {
      console.error('留덉뒪??誘몃━蹂닿린 ?ㅽ뙣:', err);
      return null;
    }
  };

  const requestAIResponse = async (targetChatId, originalText, userMessageId, chatTitle = null) => {
    const previewUserMessage = await applyPreviewMask(targetChatId, originalText, userMessageId);
    const existingTitle = chats.find(chat => chat.id === targetChatId)?.title;
    const conversationTitle = chatTitle || existingTitle || generateChatTitle(originalText);

    if (previewUserMessage) {
      await saveConversation(targetChatId, conversationTitle, [previewUserMessage]);
    }

    try {
      const { data } = await sendChat({
        text: originalText,
        session_id: targetChatId,
        provider: llmProvider,
      });

      const detectedItems = [...new Set((data.detected_entities || []).map((item) => labelEntityType(item.entity_type)))];
      const maskedUserMessage = {
        id: userMessageId,
        text: data.question,
        role: 'user',
        timestamp: new Date().toISOString(),
        wasMasked: data.was_masked,
        isSanitized: true,
        detectedItems,
        entities: data.detected_entities || [],
        riskLevel: data.overall_risk || 'none',
      };

      const aiMessage = {
        id: crypto.randomUUID(),
        text: data.answer,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        riskLevel: data.overall_risk || 'none',
      };

      setChats(prev => prev.map(chat => {
        if (chat.id !== targetChatId) return chat;
        const nextTitle = chatTitle !== null ? chatTitle : chat.title;
        const nextMessages = chat.messages
          .map((message) => (message.id === userMessageId ? maskedUserMessage : message))
          .concat(aiMessage);
        void saveConversation(targetChatId, nextTitle || conversationTitle, nextMessages);
        return {
          ...chat,
          messages: nextMessages,
          title: nextTitle,
          updatedAt: new Date().toISOString(),
        };
      }));
    } catch (err) {
      const aiMessage = {
        id: crypto.randomUUID(),
        text: err.response?.data?.detail || '諛깆뿏???묐떟 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setChats(prev => prev.map(chat => {
        if (chat.id !== targetChatId) return chat;
        const nextMessages = [
          ...chat.messages.map((message) => (
            message.id === userMessageId && previewUserMessage ? previewUserMessage : message
          )),
          aiMessage,
        ];
        void saveConversation(targetChatId, chatTitle || chat.title || conversationTitle, nextMessages);
        return {
          ...chat,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== 硫붿떆吏 ?꾩넚 =====
  // ??븷:
  // 1) ???붾㈃(梨꾪똿 ?녿뒗 ?곹깭)?먯꽌 ?꾩넚?섎㈃ ??梨꾪똿 ?먮룞 ?앹꽦
  // 2) 湲곗〈 梨꾪똿?먯꽌 ?꾩넚?섎㈃ ?대떦 梨꾪똿??硫붿떆吏 異붽?
  // 3) 泥?踰덉㎏ 硫붿떆吏 ?꾩넚 ??AI ?묐떟 ??梨꾪똿 ?쒕ぉ ?먮룞 ?앹꽦
  const handleSend = () => {
    // [踰꾧렇 ?섏젙] isLoading 媛??異붽?
    // InputBox ?대?(踰꾪듉 disabled, Enter 李⑤떒)?먯꽌??留됱?留?
    // handleSend ?먯껜?먮룄 媛?쒕? ?먯뼱 ?몃? ?몄텧 ?쒖뿉??以묐났 ?꾩넚 諛⑹?
    if (!inputText.trim() || isLoading) return;

    // ?낅젰李쎌쓣 利됱떆 鍮꾩썙 UX 吏???놁븷湲?(capturedInput???먮낯 ???
    const capturedInput = inputText;
    setInputText('');

    // ?꾩옱 梨꾪똿???놁쑝硫???梨꾪똿??留뚮뱾?댁꽌 吏꾪뻾
    let targetChatId = currentChatId;
    let isFirstMessage = false;

    if (!targetChatId) {
      // ???붾㈃?먯꽌 泥??꾩넚: ??梨꾪똿 ?앹꽦
      // [踰꾧렇 ?섏젙] Date.now() ??crypto.randomUUID()
      // Date.now()??諛由ъ큹 ?⑥쐞??媛숈? ?깆뿉 ?몄텧 ???꾨옒 userMessage.id?
      // 媛숈? 媛믪씠 ?앹꽦?섎뒗 異⑸룎??諛쒖깮?????덉쓬
      // crypto.randomUUID()??RFC 4122 湲곕컲 ?꾩뿭 怨좎쑀 ID瑜?蹂댁옣
      const newChatId = crypto.randomUUID();
      const newChat = {
        id: newChatId,
        title: '??梨꾪똿',
        messages: [],
        projectId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      targetChatId = newChatId;
      isFirstMessage = true;
    } else {
      // 湲곗〈 梨꾪똿: 硫붿떆吏媛 ?섎굹???녿뒗 寃쎌슦?먮쭔 泥?硫붿떆吏濡??먮떒
      const existingChat = chats.find(c => c.id === targetChatId);
      isFirstMessage = (existingChat?.messages?.length ?? 0) === 0;
    }

    // ?ъ슜??硫붿떆吏 媛앹껜 援ъ꽦
    const userMessage = {
      // [踰꾧렇 ?섏젙] 怨좎쑀 ID 蹂댁옣???꾪빐 crypto.randomUUID() ?ъ슜
      id: crypto.randomUUID(),
      text: capturedInput,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setIsLoading(true);

    // ?ъ슜??硫붿떆吏瑜?梨꾪똿??異붽?
    setChats(prev => prev.map(chat =>
      chat.id === targetChatId
        ? {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date().toISOString(),
          }
        : chat
    ));

    // 泥?踰덉㎏ 硫붿떆吏???뚮쭔 ?먮룞 ?앹꽦 ?쒕ぉ???꾨떖, ?댄썑 硫붿떆吏??null (湲곗〈 ?쒕ぉ ?좎?)
    requestAIResponse(
      targetChatId,
      capturedInput,
      userMessage.id,
      isFirstMessage ? generateChatTitle(capturedInput) : null
    );
  };

  // ===== 硫붿떆吏 ?섏젙 =====
  // ??븷:
  // 1) ?섏젙??硫붿떆吏 ?댄썑??紐⑤뱺 硫붿떆吏 ??젣 (留λ씫 遺덉씪移?諛⑹?)
  // 2) ?섏젙???띿뒪?몃줈 ?대떦 硫붿떆吏 ?낅뜲?댄듃
  // 3) ?섏젙???댁슜 湲곗??쇰줈 AI ?ъ쓳???앹꽦
  const handleEditMessage = (messageId, newText) => {
    if (!newText.trim()) return;

    const capturedText = newText.trim();
    // currentChatId瑜?利됱떆 罹≪쿂
    // setTimeout ?ㅽ뻾 ?꾩뿉 ?ъ슜?먭? ?ㅻⅨ 梨꾪똿?쇰줈 ?대룞?대룄
    // AI ?묐떟???먮옒 梨꾪똿???뺥솗??異붽??섎룄濡?蹂댁옣
    const capturedChatId = currentChatId;
    setIsLoading(true);

    setChats(prev => prev.map(chat => {
      if (chat.id !== capturedChatId) return chat;

      // ?섏젙??硫붿떆吏???꾩튂 ?뺤씤
      const editedIndex = chat.messages.findIndex(msg => msg.id === messageId);
      if (editedIndex === -1) return chat;

      // ?섏젙??硫붿떆吏源뚯?留??④린怨??댄썑 硫붿떆吏 ?꾨? ??젣
      const trimmedMessages = chat.messages
        .slice(0, editedIndex + 1)
        .map(msg =>
          msg.id === messageId
            ? { ...msg, text: capturedText, editedAt: new Date().toISOString() }
            : msg
        );

      return {
        ...chat,
        messages: trimmedMessages,
        updatedAt: new Date().toISOString(),
      };
    }));

    // 硫붿떆吏 ?섏젙 ?쒖뿉???쒕ぉ 蹂寃??놁씠 AI ?ъ쓳?듬쭔 ?붿껌
    requestAIResponse(capturedChatId, capturedText, messageId);
  };

  // ===== ?꾨줈?앺듃 ?앹꽦 =====
  // ProjectModal??onSave 肄쒕갚 ?쒓렇?덉쿂: (projectId, projectData)
  const handleCreateProject = (_projectId, projectData) => {
    const newProject = {
      // [踰꾧렇 ?섏젙] ?꾨줈?앺듃 ID??怨좎쑀 蹂댁옣???꾪빐 crypto.randomUUID() ?ъ슜
      id: crypto.randomUUID(),
      name: projectData.name,
      color: projectData.color || '#667eea',
      description: projectData.description || '',
      instructions: projectData.instructions || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects(prev => [...prev, newProject]);
    setIsProjectModalOpen(false);
  };

  // ===== ?꾨줈?앺듃 ?섏젙 =====
  const handleUpdateProject = (projectId, projectData) => {
    setProjects(prev => prev.map(proj =>
      proj.id === projectId
        ? {
            ...proj,
            name: projectData.name,
            color: projectData.color,
            description: projectData.description,
            instructions: projectData.instructions,
            updatedAt: new Date().toISOString(),
          }
        : proj
    ));
    setEditingProject(null);
    setIsProjectModalOpen(false);
  };

  // handleDeleteProject ??hook??deleteProject 吏곸젒 ?ъ슜 (?꾨옒 Sidebar props 李멸퀬)
  // handleAddChatToProject ??hook??addChatToProject 吏곸젒 ?ъ슜

  // ===== ?꾨줈?앺듃 ?섏씠吏濡??대룞 =====
  const handleSelectProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  // ===== ?꾨줈?앺듃 紐⑤떖 ?닿린 (?섏젙) =====
  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  // ===== ?꾨줈?앺듃 紐⑤떖 ?닿린 (???앹꽦) =====
  const handleNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  // ?꾩옱 ?좏깮??梨꾪똿 媛앹껜 (?놁쑝硫?undefined ?????붾㈃ ?쒖떆)
  const handleCreateProjectDb = async (_projectId, projectData) => {
    try {
      await createProject(projectData);
      setIsProjectModalOpen(false);
    } catch (err) {
      console.error('?꾨줈?앺듃 ?앹꽦 ?ㅽ뙣:', err);
    }
  };

  const handleUpdateProjectDb = async (projectId, projectData) => {
    try {
      await updateProject(projectId, projectData);
      setEditingProject(null);
      setIsProjectModalOpen(false);
    } catch (err) {
      console.error('?꾨줈?앺듃 ?섏젙 ?ㅽ뙣:', err);
    }
  };

  const currentChat = chats.find(chat => chat.id === currentChatId);

  return (
    <div className="chat-page">
      {/* ?쇱そ ?ъ씠?쒕컮: 梨꾪똿 紐⑸줉 + ?꾨줈?앺듃 紐⑸줉 + ?ъ슜???뺣낫 */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        projects={projects}
        selectedProjectId={null}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={renameChat}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={deleteProject}
        onAddChatToProject={addChatToProject}
      />

      {/* ?ㅻⅨ履?梨꾪똿 ?곸뿭 */}
      <div className="chat-area">
        <div className="chat-container">
          {currentChat ? (
            /* 梨꾪똿???좏깮???곹깭: 硫붿떆吏 紐⑸줉 + ?낅젰李?*/
            <>
              <div className="messages-container">
                {currentChat.messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onEditMessage={handleEditMessage}
                  />
                ))}
                {isLoading && (
                  <div className="assistant-loading-row" aria-label="답변 생성 중">
                    <span className="assistant-loading-spinner" />
                  </div>
                )}
                {/* ?먮룞 ?ㅽ겕濡?湲곗???- ??긽 硫붿떆吏 紐⑸줉 留??꾨옒???꾩튂 */}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-section">
                <InputBox
                  inputText={inputText}
                  onInputChange={setInputText}
                  onSend={handleSend}
                  isLoading={isLoading}
                  llmProvider={llmProvider}
                  onChangeLlmProvider={setLlmProvider}
                />
              </div>
            </>
          ) : (
            /* 梨꾪똿???녿뒗 ?곹깭: ???붾㈃ (?낅젰 ????梨꾪똿 ?먮룞 ?앹꽦) */
            <div className="home-screen">
              <div className="home-welcome">
                <h1 className="home-title">무엇을 도와드릴까요?</h1>
                <p className="home-subtitle">
                  입력하신 민감정보는 자동으로 마스킹되어 안전하게 처리됩니다.
                </p>
              </div>
              <div className="home-input-section">
                <InputBox
                  inputText={inputText}
                  onInputChange={setInputText}
                  onSend={handleSend}
                  isLoading={isLoading}
                  llmProvider={llmProvider}
                  onChangeLlmProvider={setLlmProvider}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ?꾨줈?앺듃 ?앹꽦 / ?섏젙 紐⑤떖 */}
      {isProjectModalOpen && (
        <ProjectModal
          project={editingProject}
          onSave={editingProject ? handleUpdateProjectDb : handleCreateProjectDb}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}

export default ChatPage;
