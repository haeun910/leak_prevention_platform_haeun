import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, FileWarning, LockKeyhole, MousePointer2, Send, ShieldCheck, Sparkles } from 'lucide-react';
import './Login.css';

const demoPromptText = '고객 홍길동님 연락처 010-2234-5678로 안내 메일 보내게 초안을 작성해줘';
const demoMaskedPromptText = '고객 [이름]님 연락처 [연락처]로 안내 메일 보내게 초안을 작성해줘';
const demoReplyText = `고객 [이름]님께 보낼 안내 메일 초안을 준비했습니다.
안녕하세요, 고객님. 요청하신 상담 내용을 바탕으로 안내드립니다.
연락처 [연락처]는 보안 정책에 따라 마스킹 처리했으며, 원문 정보는 외부 AI 모델로 전달되지 않습니다.
필요한 경우 담당자가 승인 절차를 거친 뒤 제한된 범위에서만 원문을 확인할 수 있습니다.
아래 내용으로 발송 전 한 번 더 검토해 주세요.`;

function Login() {
  const [typedPrompt, setTypedPrompt] = useState('');
  const [typedReply, setTypedReply] = useState('');
  const [sentPrompt, setSentPrompt] = useState('');
  const [demoPhase, setDemoPhase] = useState('select');

  useEffect(() => {
    const timers = [];

    const addTimer = (callback, delay) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };

    const typeText = (text, setter, startDelay, stepDelay, onDone) => {
      const characters = Array.from(text);

      characters.forEach((_, index) => {
        addTimer(() => {
          setter(characters.slice(0, index + 1).join(''));
        }, startDelay + index * stepDelay);
      });

      addTimer(onDone, startDelay + characters.length * stepDelay + 120);
    };

    const runAnimation = () => {
      setTypedPrompt('');
      setTypedReply('');
      setSentPrompt('');
      setDemoPhase('select');

      addTimer(() => setDemoPhase('model-click'), 850);
      addTimer(() => {
        setDemoPhase('type');
        typeText(demoPromptText, setTypedPrompt, 0, 36, () => {
          setDemoPhase('send');
          addTimer(() => {
            setSentPrompt(demoMaskedPromptText);
            setTypedPrompt('');
            setDemoPhase('reply');
            typeText(demoReplyText, setTypedReply, 450, 18, () => {
              setDemoPhase('hold');
              addTimer(runAnimation, 5000);
            });
          }, 850);
        });
      }, 1400);
    };

    runAnimation();

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="auth-brand" href="#top" aria-label="SecureAI">
          <div className="auth-brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>Veil AI</strong>
            <span>Enterprise Masking Platform</span>
          </div>
        </a>
        <div className="landing-nav-actions">
          <a href="#product">제품 소개</a>
          <a href="#contact">도입 문의</a>
          <Link className="nav-login-btn" to="/login">로그인 하러가기</Link>
        </div>
      </header>

      <section className="landing-hero" id="top">
        <div className="auth-hero-copy">
          <span className="auth-kicker">
            <Sparkles size={15} />
            실시간 정보 유출 방지
          </span>
          <h1>
            당신이 입력한 프롬프트 속 정보,<br />
            정말 안전하다고 확신하시나요?
          </h1>
          <p>
            보안 필터링을 거치지 않은 AI 대화는 기업의 자산 유출로 이어집니다.<br />
            실시간 감지와 자동 차단으로 가장 안전한 AI 대화 루트를 확보하세요.
          </p>
          <div className="hero-actions">
            <Link className="primary-hero-btn" to="/login">
              로그인 하러가기
              <ArrowRight size={18} />
            </Link>
            <a className="secondary-hero-btn" href="#product">기능 살펴보기</a>
          </div>
        </div>

        <div className="product-preview" aria-label="마스킹 플랫폼 미리보기">
          <div className="preview-topbar">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              <b>Veil Workspace</b>
              <span className="active-line"></span>
              <span></span>
              <span></span>
            </div>
            <div className="preview-chat">
              <div className="risk-card">
                <FileWarning size={18} />
                <div>
                  <strong>민감정보 감지</strong>
                  <p>이름, 연락처, 주민등록번호, 내부 프로젝트명 자동 마스킹</p>
                </div>
              </div>
              <div className="masking-demo" aria-label="실시간 자동 마스킹 채팅 예시">
                <div className="demo-thread">
                  <div className={`chat-demo-row user ${sentPrompt ? 'visible' : ''}`}>
                    <div className="message-row user sent-message">
                      {sentPrompt || demoPromptText}
                    </div>
                  </div>
                  <div className={`chat-demo-row system ${typedReply ? 'visible' : ''}`}>
                    <div className="message-row assistant masked-message">
                      <span className="reply-content">
                        <span className="reply-text">{typedReply}</span>
                        {demoPhase === 'reply' && <span className="reply-caret"></span>}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="demo-composer">
                  <div className={`demo-cursor ${demoPhase}`}>
                    <MousePointer2 size={22} strokeWidth={2.4} />
                  </div>
                  <div className="model-picker">
                    <span>응답 모델</span>
                    <button className={demoPhase !== 'select' ? 'selected' : ''} type="button">GPT</button>
                    <button type="button">Claude</button>
                    <button type="button">Gemini</button>
                  </div>
                  <div className="composer-input-row">
                    <div className="prompt-window">
                      <span className="typing-text">{typedPrompt}</span>
                      {demoPhase === 'type' && <span className="typing-caret"></span>}
                    </div>
                    <button className={`send-demo-btn ${demoPhase === 'send' ? 'pressed' : ''}`} type="button" aria-label="전송">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="simple-section" id="product">
        <div className="simple-copy">
          <span>Veil Workspace</span>
          <h2>
            AI 대화 전에 민감정보를 자동으로 가려주는<br />
            업무용 보안 워크스페이스입니다.
          </h2>
          <p>
            사용자가 프롬프트를 입력하면 이름, 연락처, 주민등록번호, 내부 프로젝트명 같은 정보를 먼저 감지합니다.
            <br />
            원문은 입력 중에만 보이고, 전송된 대화와 답변에는 마스킹된 값만 남도록 도와줍니다.
          </p>
        </div>
        <div className="simple-visual" aria-label="마스킹 흐름">
          <div>
            <ShieldCheck size={22} />
            <strong>감지</strong>
            <span>입력 문장에서 민감정보 탐지</span>
          </div>
          <div>
            <LockKeyhole size={22} />
            <strong>마스킹</strong>
            <span>[이름], [연락처]로 자동 치환</span>
          </div>
          <div>
            <BarChart3 size={22} />
            <strong>기록</strong>
            <span>사용 이력과 탐지 로그 확인</span>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-panel compact">
          <div>
            <strong>도입 문의</strong>
            <p>서비스 소개와 도입 상담은 이메일로 문의해주세요.</p>
          </div>
          <a className="contact-mail-btn" href="mailto:contact@veil-ai.com?subject=Veil%20Workspace%20%EB%8F%84%EC%9E%85%20%EB%AC%B8%EC%9D%98">
            이메일로 문의하기
            <ArrowRight size={17} />
          </a>
        </div>
      </section>

    </main>
  );
}

export default Login;
