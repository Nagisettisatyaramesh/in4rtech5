(() => {
  // In4rtech Assistant: our own chat window, answered by the Vitality chatbot service.
  // Configured on its script tag: data-website-id, data-api-base, data-chat-endpoint.
  const script = document.currentScript;
  if (!script) return;
  const websiteId = script.dataset.websiteId;
  const apiBase = (script.dataset.apiBase || '').replace(/\/$/, '');
  const chatEndpoint = script.dataset.chatEndpoint || '/api/chat';
  const privacyUrl = script.dataset.privacyUrl || 'privacy.html';
  if (!websiteId || !apiBase) return;

  const sessionKey = `in4rtech_chat_session_${websiteId}`;
  let sessionToken = null;
  try { sessionToken = localStorage.getItem(sessionKey); } catch (_) { /* Storage may be disabled. */ }
  const visitorKey = `in4rtech_chat_visitor_${websiteId}`;
  let visitor = null;
  try { visitor = JSON.parse(localStorage.getItem(visitorKey) || 'null'); } catch (_) { visitor = null; }
  if (!visitor || !visitor.name || !visitor.email) visitor = null;
  let config = { businessName: 'In4rtech', humanPhone: '' };
  let sending = false;

  const css = `
    :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    * { box-sizing: border-box; }
    .launcher { position: fixed; right: 20px; bottom: 20px; width: 64px; height: 64px; border: 0; border-radius: 50%;
      background: #059669; color: #fff; display: grid; place-items: center; cursor: pointer; z-index: 2147483000;
      box-shadow: 0 10px 28px rgba(5, 150, 105, .35); transition: transform .15s ease; }
    .launcher:hover { transform: scale(1.05); }
    .launcher:focus-visible, .close:focus-visible, .send:focus-visible { outline: 3px solid #a7f3d0; outline-offset: 2px; }
    .launcher svg { width: 30px; height: 30px; }
    .launcher .dot { position: absolute; top: 9px; right: 10px; width: 12px; height: 12px; border-radius: 50%;
      background: #e5e7eb; border: 2px solid #059669; }
    .launcher[aria-expanded="true"] .dot { display: none; }
    .panel { position: fixed; right: 20px; bottom: 96px; width: min(350px, calc(100vw - 32px)); height: min(560px, calc(100dvh - 120px));
      display: none; flex-direction: column; overflow: hidden; background: #f6f7f9; border-radius: 14px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, .28); z-index: 2147483000; }
    .panel.open { display: flex; }
    .header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #059669; color: #fff; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, .22); display: grid; place-items: center; font-size: 18px; }
    .title { flex: 1; margin: 0; font-size: 15px; font-weight: 700; }
    .close { width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }
    .close:hover { background: rgba(255, 255, 255, .15); }
    .notice { margin: 0; padding: 9px 14px; background: #ecfdf5; color: #1f2937; font-size: 11px; line-height: 1.5; border-bottom: 1px solid #d1fae5; }
    .notice strong { color: #065f46; }
    .notice a { color: #047857; font-weight: 700; }
    .messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 86%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
    .bot { align-self: flex-start; background: #fff; color: #111827; box-shadow: 0 2px 8px rgba(15, 23, 42, .06); border-top-left-radius: 6px; }
    .user { align-self: flex-end; background: #059669; color: #fff; border-top-right-radius: 6px; }
    .error { background: #fef2f2; color: #991b1b; }
    .call { align-self: flex-start; padding: 7px 12px; border-radius: 999px; background: #059669; color: #fff; font-size: 12.5px; font-weight: 600; text-decoration: none; }
    .typing { align-self: flex-start; display: flex; gap: 4px; padding: 14px 16px; background: #fff; border-radius: 16px; }
    .typing span { width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; animation: blink 1.2s infinite ease-in-out; }
    .typing span:nth-child(2) { animation-delay: .15s; } .typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes blink { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }
    .details { align-self: stretch; display: grid; gap: 8px; padding: 12px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(15, 23, 42, .06); }
    .details label { display: grid; gap: 4px; font-size: 12px; font-weight: 600; color: #374151; }
    .details input { height: 38px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; font-size: 13.5px; color: #111827; outline: none; }
    .details input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, .15); }
    .details button { height: 38px; border: 0; border-radius: 8px; background: #059669; color: #fff; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .details-error { color: #b91c1c; font-size: 12px; }
    .switch { align-self: flex-start; padding: 0; border: 0; background: none; color: #047857; font: inherit; font-size: 12px; text-decoration: underline; cursor: pointer; }
    .input-row[hidden] { display: none; }
    .login { align-self: stretch; display: grid; gap: 8px; padding: 12px; background: #fff; border-radius: 12px; }
    .login input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; font-size: 14px; }
    .login-row { display: flex; gap: 8px; }
    .login-row button { flex: 1; padding: 9px; border: 0; border-radius: 8px; font: inherit; font-size: 14px; cursor: pointer; }
    .login-row .primary { background: #059669; color: #fff; }
    .login-error { color: #b91c1c; font-size: 13px; }
    .input-row { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fff; border-top: 1px solid #e5e7eb; }
    .input { flex: 1; min-width: 0; height: 40px; padding: 0 16px; border: 1px solid #d1d5db; border-radius: 999px; font: inherit; font-size: 13.5px; color: #111827; outline: none; }
    .input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, .15); }
    .send { flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; background: #059669; color: #fff; display: grid; place-items: center; cursor: pointer; }
    .send:disabled { opacity: .55; cursor: default; }
    .send svg { width: 17px; height: 17px; }
    @media (max-width: 480px) {
      .panel { right: 8px; left: 8px; width: auto; bottom: 88px; height: min(80dvh, 620px); }
      .launcher { right: 16px; bottom: 16px; }
      .input, .details input { font-size: 16px; }
    }
    @media (prefers-reduced-motion: reduce) { .launcher { transition: none; } .typing span { animation: none; } }
  `;

  const host = document.createElement('div');
  host.id = 'in4rtech-chat';
  const root = host.attachShadow({ mode: 'open' });
  const name = () => `${config.businessName || 'In4rtech'} Assistant`;

  root.innerHTML = `
    <style>${css}</style>
    <section class="panel" role="dialog" aria-labelledby="chat-title">
      <div class="header">
        <div class="avatar" aria-hidden="true">🤖</div>
        <h2 class="title" id="chat-title"></h2>
        <button class="close" type="button" aria-label="Close chat">&times;</button>
      </div>
      <p class="notice"><strong>AI assistant.</strong> Answers are based on our website content only and are not technical or commercial advice. Chats are stored to improve our service; please don’t share personal or confidential information. <a href="${privacyUrl}">Privacy Policy</a></p>
      <div class="messages" aria-live="polite"></div>
      <form class="input-row">
        <input class="input" type="text" placeholder="Type your question..." maxlength="2000" aria-label="Your question" autocomplete="off">
        <button class="send" type="submit" aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l16-8L4 4v6l10 2-10 2v6Z" fill="currentColor"/></svg>
        </button>
      </form>
    </section>
    <button class="launcher" type="button" aria-label="Open chat" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.6 0 2.2 1 4.1 2.7 5.5L5.5 20l3.9-1.9c.8.2 1.7.3 2.6.3 4.7 0 8.5-3.4 8.5-7.6S16.7 3.5 12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="11.2" r="1.2" fill="currentColor"/><circle cx="12" cy="11.2" r="1.2" fill="currentColor"/><circle cx="15.5" cy="11.2" r="1.2" fill="currentColor"/></svg>
      <span class="dot"></span>
    </button>`;

  const panel = root.querySelector('.panel');
  const launcher = root.querySelector('.launcher');
  const messages = root.querySelector('.messages');
  const form = root.querySelector('.input-row');
  const input = root.querySelector('.input');
  const sendButton = root.querySelector('.send');
  const setTitle = () => { root.querySelector('.title').textContent = name(); };

  const scrollDown = () => { messages.scrollTop = messages.scrollHeight; };
  const addMessage = (role, text, isError = false) => {
    const bubble = document.createElement('div');
    bubble.className = `msg ${role === 'user' ? 'user' : 'bot'}${isError ? ' error' : ''}`;
    bubble.textContent = text;
    messages.append(bubble);
    scrollDown();
  };
  const addCallButton = (phone) => {
    const link = document.createElement('a');
    link.className = 'call';
    link.href = `tel:${String(phone).replace(/\s+/g, '')}`;
    link.textContent = '📞 Call us';
    messages.append(link);
    scrollDown();
  };
  const showTyping = () => {
    const dots = document.createElement('div');
    dots.className = 'typing';
    dots.setAttribute('aria-label', 'Assistant is typing');
    dots.innerHTML = '<span></span><span></span><span></span>';
    messages.append(dots);
    scrollDown();
    return () => dots.remove();
  };

  const post = async (path, body) => {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  };

  const showLogin = (pendingText) => {
    const box = document.createElement('div');
    box.className = 'login';
    box.innerHTML = '<input type="text" placeholder="Username" aria-label="Username" autocomplete="username"><input type="password" placeholder="Password" aria-label="Password" autocomplete="current-password"><div class="login-error" hidden></div><div class="login-row"><button type="button" class="primary">Log in</button><button type="button">Cancel</button></div>';
    const [username, password] = box.querySelectorAll('input');
    const error = box.querySelector('.login-error');
    const [submit, cancel] = box.querySelectorAll('button');
    const login = async () => {
      error.hidden = true;
      try {
        const result = await post('/api/login', { websiteId, username: username.value.trim(), password: password.value });
        sessionToken = result.sessionToken;
        try { localStorage.setItem(sessionKey, sessionToken); } catch (_) { /* Session lasts for this page only. */ }
        box.remove();
        addMessage('bot', `Logged in as ${result.name}.`);
        await send(pendingText, false);
      } catch (err) {
        error.textContent = err.message || 'Login failed';
        error.hidden = false;
      }
    };
    submit.addEventListener('click', login);
    password.addEventListener('keydown', (event) => { if (event.key === 'Enter') login(); });
    cancel.addEventListener('click', () => box.remove());
    messages.append(box);
    scrollDown();
    username.focus();
  };

  async function send(text, showUserMessage = true) {
    if (sending || !text) return;
    sending = true;
    sendButton.disabled = true;
    if (showUserMessage) addMessage('user', text);
    const stopTyping = showTyping();
    try {
      const result = await post(chatEndpoint, { websiteId, message: text, sessionToken: sessionToken || undefined });
      stopTyping();
      addMessage('bot', result.answer || 'Sorry, I could not find an answer to that.');
      if (result.requiresLogin) showLogin(text);
      if (result.humanFallback && result.callPhone) addCallButton(result.callPhone);
    } catch (err) {
      stopTyping();
      addMessage('bot', err.message || 'I’m unable to answer right now. Would you like to speak with our team?', true);
      if (config.humanPhone) addCallButton(config.humanPhone);
    } finally {
      sending = false;
      sendButton.disabled = false;
    }
  }

  const setOpen = (open) => {
    panel.classList.toggle('open', open);
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) (visitor ? input : messages.querySelector('.details input'))?.focus();
  };
  launcher.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  root.querySelector('.close').addEventListener('click', () => { setOpen(false); launcher.focus(); });
  panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); launcher.focus(); } });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    input.value = '';
    send(text);
  });

  const greet = () => {
    const firstName = visitor.name.split(/\s+/)[0];
    addMessage('bot', `Hi ${firstName}, this is ${name()}. How can I help you?`);
    const change = document.createElement('button');
    change.type = 'button';
    change.className = 'switch';
    change.textContent = `Not ${firstName}? Change details`;
    change.addEventListener('click', () => {
      visitor = null;
      try { localStorage.removeItem(visitorKey); } catch (_) { /* Nothing stored. */ }
      messages.replaceChildren();
      askForDetails();
      messages.querySelector('.details input')?.focus();
    });
    messages.append(change);
    form.hidden = false;
  };

  // Ask for the visitor's name and email before the conversation starts.
  function askForDetails() {
    form.hidden = true;
    addMessage('bot', `Hi, this is ${name()}. Before we start, please tell us your name and email address.`);
    const box = document.createElement('form');
    box.className = 'details';
    box.noValidate = true;
    box.innerHTML = '<label>Name<input name="name" type="text" maxlength="80" autocomplete="name" required></label><label>Email<input name="email" type="email" maxlength="254" autocomplete="email" required></label><div class="details-error" role="alert" hidden></div><button type="submit">Start chat</button>';
    const error = box.querySelector('.details-error');
    box.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameValue = box.elements.name.value.trim().replace(/\s+/g, ' ');
      const emailValue = box.elements.email.value.trim();
      let problem = '';
      if (!nameValue) problem = 'Please enter your name.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) problem = 'Please enter a valid email address.';
      if (problem) {
        error.textContent = problem;
        error.hidden = false;
        (nameValue ? box.elements.email : box.elements.name).focus();
        return;
      }
      visitor = { name: nameValue, email: emailValue };
      try { localStorage.setItem(visitorKey, JSON.stringify(visitor)); } catch (_) { /* Details last for this page only. */ }
      messages.replaceChildren();
      greet();
      input.focus();
    });
    messages.append(box);
    scrollDown();
  }

  setTitle();
  if (visitor) greet(); else askForDetails();
  document.body.append(host);

  fetch(`${apiBase}/api/website-config/${encodeURIComponent(websiteId)}`)
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => { if (data && data.businessName) { config = { ...config, ...data }; setTitle(); } })
    .catch(() => { /* Keep the default name. */ });
})();
