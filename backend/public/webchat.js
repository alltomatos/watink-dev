(function () {
    var config = window.watinkWebchatConfig || window.WatinkWebchat;
    if (!config || (!config.webchatId && !config.whatsappId) || !config.url) {
        console.error("WatinkWebchat: Configuration missing (webchatId or url).");
        return;
    }

    var webchatId = config.webchatId || config.whatsappId;

    var STATE = {
        open: false,
        config: null,
        ticketId: localStorage.getItem("watink_ticket_" + webchatId),
        contactId: localStorage.getItem("watink_contact_" + webchatId),
        messages: [],
        lastMessageId: null,
        pollingInterval: null
    };

    // WhatsApp-like Styles
    var styles = `
        :root {
            --watink-primary: #00E676;
            --watink-msg-sent: #dcf8c6;
            --watink-msg-received: #ffffff;
            --watink-bg: #e5ddd5;
        }
        #watink-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #watink-widget-bubble {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: var(--watink-primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        #watink-widget-bubble:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        #watink-widget-bubble svg {
            width: 32px;
            height: 32px;
            fill: #fff;
        }
        #watink-widget-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 600px;
            max-height: 80vh;
            max-width: 90vw;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #f0f0f0;
            animation: watink-fade-in 0.2s ease-out;
        }
        @keyframes watink-fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        #watink-widget-header {
            padding: 16px 20px;
            background: var(--watink-primary);
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            position: relative;
            z-index: 10;
        }
        #watink-header-info h3 {
            margin: 0;
            font-size: 17px;
            font-weight: 600;
            line-height: 1.2;
        }
        #watink-header-info p {
            margin: 2px 0 0 0;
            font-size: 13px;
            opacity: 0.9;
            line-height: 1.2;
        }
        #watink-widget-close {
            cursor: pointer;
            font-size: 24px;
            padding: 4px;
            opacity: 0.8;
            transition: opacity 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #watink-widget-close:hover {
            opacity: 1;
        }
        #watink-widget-body {
            flex: 1;
            padding: 0;
            overflow-y: auto;
            background: var(--watink-bg);
            background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
            background-repeat: repeat;
            display: flex;
            flex-direction: column;
        }
        #watink-widget-footer {
            padding: 10px 16px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            min-height: 62px;
        }
        #watink-widget-input {
            flex: 1;
            border: none;
            border-radius: 24px;
            padding: 12px 16px;
            outline: none;
            font-size: 15px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        #watink-widget-input:focus {
             box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        #watink-widget-send {
            margin-left: 12px;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--watink-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            transition: transform 0.1s;
        }
        #watink-widget-send:active {
            transform: scale(0.9);
        }
        #watink-widget-send svg {
            width: 24px;
            height: 24px;
            fill: currentColor;
        }
        
        /* Message Bubbles */
        .watink-msg-container {
            display: flex;
            flex-direction: column-reverse; /* Fix bottom anchor */
            padding: 20px 16px;
            gap: 4px;
        }
        .watink-msg {
            padding: 8px 10px;
            border-radius: 7.5px;
            max-width: 85%;
            font-size: 14.2px;
            line-height: 19px;
            position: relative;
            box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
            margin-bottom: 2px;
            color: #111;
        }
        .watink-msg.from-me {
            background: var(--watink-msg-sent);
            align-self: flex-end;
            border-top-right-radius: 0;
            margin-right: 8px; /* Space for tail */
        }
        .watink-msg.from-me::after {
            content: "";
            position: absolute;
            top: 0;
            right: -8px;
            width: 0;
            height: 0;
            border: 8px solid transparent;
            border-top-color: var(--watink-msg-sent); /* Tail color */
            border-left: 0;
            border-right: 0;
            margin-left: -4px;
            margin-top: 0px;
        }
        
        .watink-msg.from-them {
            background: var(--watink-msg-received);
            align-self: flex-start;
            border-top-left-radius: 0;
             margin-left: 8px; /* Space for tail */
        }
        .watink-msg.from-them::after {
            content: "";
            position: absolute;
            top: 0;
            left: -8px;
            width: 0;
            height: 0;
            border: 8px solid transparent;
            border-top-color: var(--watink-msg-received); /* Tail color */
            border-right: 0;
            border-left: 0;
            margin-right: -4px;
            margin-top: 0px;
            transform: scaleX(-1); /* Mirror for left side */
        }

        .watink-msg-meta {
            font-size: 11px;
            color: rgba(0,0,0,0.45);
            float: right;
            margin-left: 8px;
            margin-top: 4px;
            margin-bottom: -4px;
            display: inline-block;
            vertical-align: bottom;
        }

        /* Form Styles */
        #watink-form {
            padding: 24px;
            background: #f8f9fa;
            height: 100%;
            box-sizing: border-box;
            overflow-y: auto;
        }
        #watink-greeting {
            background: #fff;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            margin-bottom: 24px !important;
            text-align: center;
            border-left: 4px solid var(--watink-primary);
            display: none;
        }
        #watink-form label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        #watink-form input, #watink-form textarea {
            display: block;
            width: 100%;
            margin-bottom: 20px;
            padding: 12px 16px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-sizing: border-box;
            font-family: inherit;
            font-size: 14px;
            background: #fff;
            transition: border-color 0.2s;
        }
        #watink-form input:focus, #watink-form textarea:focus {
            outline: none;
            border-color: var(--watink-primary);
        }
        #watink-form button {
            width: 100%;
            padding: 14px;
            background: var(--watink-primary);
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: background-color 0.2s, transform 0.1s;
            margin-top: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        #watink-form button:hover {
            filter: brightness(95%);
        }
        #watink-form button:active {
            transform: scale(0.99);
        }
        
        #watink-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            background: #fff;
            flex-direction: column;
            gap: 16px;
        }
        /* Spinner */
        .watink-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--watink-primary);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Scrollbar */
        #watink-widget-body::-webkit-scrollbar {
            width: 4px;
        }
        #watink-widget-body::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.2);
            border-radius: 4px;
        }
    `;

    // Inject Styles
    var styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Create DOM
    var container = document.createElement("div");
    container.id = "watink-widget-container";

    var bubble = document.createElement("div");
    bubble.id = "watink-widget-bubble";
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

    var windowEl = document.createElement("div");
    windowEl.id = "watink-widget-window";
    windowEl.innerHTML = `
        <div id="watink-widget-header">
            <div id="watink-header-info">
                <h3 id="watink-title">Suporte</h3>
                <p id="watink-subtitle">Estamos online!</p>
            </div>
            <span id="watink-widget-close">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </span>
        </div>
        <div id="watink-widget-body">
            <div id="watink-loading">
                <div class="watink-spinner"></div>
                <span>Carregando...</span>
            </div>
            
            <form id="watink-form" style="display:none;">
                <p id="watink-greeting"></p>
                
                <div id="watink-field-name">
                    <label>Nome Completo</label>
                    <input type="text" name="name" placeholder="Digite seu nome" required>
                </div>
                
                <div id="watink-field-email">
                    <label>E-mail</label>
                    <input type="email" name="email" placeholder="seu@email.com" required>
                </div>
                
                <div id="watink-field-phone">
                    <label>Telefone</label>
                    <input type="text" name="phone" placeholder="(DDD) 99999-9999">
                </div>
                
                <label>Mensagem</label>
                <textarea name="message" placeholder="Como podemos ajudar?" rows="3"></textarea>
                
                <button type="submit">Iniciar Conversa</button>
            </form>

            <div id="watink-chat" class="watink-msg-container" style="display:none;"></div>
        </div>
        <div id="watink-widget-footer" style="display:none;">
            <input type="text" id="watink-widget-input" placeholder="Digite uma mensagem" autocomplete="off">
            <button id="watink-widget-send">
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
        </div>
    `;

    container.appendChild(bubble); // Bubble is "behind" on Z-index usually, but here fixed. 
    container.appendChild(windowEl); // Window appended last to be on top if needed? Actually Fixed pos handles it.
    document.body.appendChild(container);

    // Elements
    var form = document.getElementById("watink-form");
    var chat = document.getElementById("watink-chat");
    var footer = document.getElementById("watink-widget-footer");
    var title = document.getElementById("watink-title");
    var subtitle = document.getElementById("watink-subtitle");
    var greeting = document.getElementById("watink-greeting");
    var input = document.getElementById("watink-widget-input");
    var loading = document.getElementById("watink-loading");
    var sendBtn = document.getElementById("watink-widget-send");
    var header = document.getElementById("watink-widget-header");
    var widgetBody = document.getElementById("watink-widget-body");

    // Event Listeners
    bubble.onclick = toggleWindow;
    document.getElementById("watink-widget-close").onclick = toggleWindow;

    form.onsubmit = function (e) {
        e.preventDefault();
        var data = {
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value,
            message: form.message.value
        };
        createTicket(data);
    };

    sendBtn.onclick = sendMessage;
    input.onkeypress = function (e) {
        if (e.key === 'Enter') sendMessage();
    };

    function toggleWindow() {
        STATE.open = !STATE.open;
        windowEl.style.display = STATE.open ? 'flex' : 'none';

        // Hide bubble when open? Or change icon?
        // bubble.style.display = STATE.open ? 'none' : 'flex'; 
        // Keeping it simple as per original, just overlay window.

        if (STATE.open) {
            if (!STATE.config) {
                init();
            } else {
                if (STATE.ticketId) {
                    scrollToBottom();
                    startPolling();
                }
            }
        } else {
            stopPolling();
        }
    }

    async function init() {
        loading.style.display = 'flex';
        form.style.display = 'none';
        chat.style.display = 'none';
        footer.style.display = 'none';

        try {
            var res = await fetch(config.url + '/api/webchat/' + webchatId);
            if (!res.ok) throw new Error('Falha ao carregar configuração');
            STATE.config = await res.json();

            // Robust parsing for chatConfig
            if (STATE.config.chatConfig && typeof STATE.config.chatConfig === 'string') {
                try {
                    STATE.config.chatConfig = JSON.parse(STATE.config.chatConfig);
                } catch (e) {
                    console.error("Erro ao processar JSON de configuração", e);
                }
            }

            applyConfig();

            loading.style.display = 'none';
            if (STATE.ticketId) {
                showChat();
                loadMessages();
                startPolling();
            } else {
                showForm();
            }
        } catch (e) {
            console.error(e);
            loading.innerHTML = "<span style='text-align:center'>Erro ao iniciar chat.<br>Verifique a conexão.</span>";
        }
    }

    function applyConfig() {
        if (STATE.config.chatConfig) {
            var c = STATE.config.chatConfig;

            // Apply CSS Variables for Colors
            if (c.buttonColor) {
                document.documentElement.style.setProperty('--watink-primary', c.buttonColor);
            }

            if (c.title) title.innerText = c.title;
            if (c.subtitle) subtitle.innerText = c.subtitle;

            // Show/Hide fields
            if (c.fields) {
                if (c.fields.phone === false) document.getElementById('watink-field-phone').style.display = 'none';
                if (c.fields.email === false) document.getElementById('watink-field-email').style.display = 'none'; // Added email toggle support just in case
            }
        }
        if (STATE.config.greetingMessage) {
            greeting.innerText = STATE.config.greetingMessage;
            greeting.style.display = 'block';
        } else {
            greeting.style.display = 'none';
        }

        checkBusinessHours();
    }

    function checkBusinessHours() {
        if (!STATE.config.chatConfig || !STATE.config.chatConfig.businessHours || !STATE.config.chatConfig.businessHours.enabled) return;

        var bh = STATE.config.chatConfig.businessHours;
        if (!bh.startTime || !bh.endTime) return;

        var now = new Date();
        var currentMinutes = now.getHours() * 60 + now.getMinutes();

        var startParts = bh.startTime.split(':');
        var startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);

        var endParts = bh.endTime.split(':');
        var endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

        var isOpen = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

        if (!isOpen) {
            showBusinessHoursMessage(bh.message);
        }
    }

    function showBusinessHoursMessage(msg) {
        var container = document.getElementById('watink-business-hours-msg');
        if (!container) {
            container = document.createElement('div');
            container.id = 'watink-business-hours-msg';
            container.style.cssText = 'background: #fff3cd; color: #856404; padding: 12px; font-size: 13px; border-bottom: 1px solid #ffeeba; text-align: center; line-height: 1.4;';
            var body = document.getElementById('watink-widget-body');
            body.insertBefore(container, body.firstChild);
        }
        container.innerText = msg || "Estamos fora do horário de atendimento.";
    }

    function showForm() {
        form.style.display = 'block';
        chat.style.display = 'none';
        footer.style.display = 'none';
        widgetBody.style.background = "#f8f9fa";
        widgetBody.style.backgroundImage = "none";
    }

    function showChat() {
        form.style.display = 'none';
        chat.style.display = 'flex';
        footer.style.display = 'flex';
        // Reset background to WhatsApp style
        widgetBody.style.background = "var(--watink-bg)";
        widgetBody.style.backgroundImage = 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")';
    }

    async function createTicket(data) {
        loading.style.display = 'flex';
        form.style.display = 'none';

        try {
            var res = await fetch(config.url + '/api/webchat/' + webchatId + '/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Falha ao criar ticket');

            var json = await res.json();

            STATE.ticketId = json.ticketId;
            STATE.contactId = json.contactId;
            localStorage.setItem("watink_ticket_" + webchatId, STATE.ticketId);
            localStorage.setItem("watink_contact_" + webchatId, STATE.contactId);

            loading.style.display = 'none';
            showChat();

            // Optimistic Render for Initial Message
            if (data.message) {
                var tempId = 'init-' + new Date().getTime();
                var initialMsg = {
                    id: tempId,
                    body: data.message,
                    fromMe: true,
                    createdAt: new Date().toISOString(),
                    timestamp: new Date().getTime() / 1000,
                    _optimistic: true
                };
                STATE.messages.push(initialMsg);
            }

            loadMessages();
            startPolling();

        } catch (e) {
            console.error(e);
            loading.innerHTML = "<span style='text-align:center'>Não foi possível conectar.<br>Tente novamente mais tarde.</span>";
            loading.style.display = 'flex';
            setTimeout(() => {
                loading.style.display = 'none';
                showForm();
            }, 3000);
        }
    }

    async function sendMessage() {
        var text = input.value.trim();
        if (!text) return;

        input.value = '';

        // Optimistic UI Update: Show message immediately
        var tempId = 'temp-' + new Date().getTime();
        var tempMsg = {
            id: tempId,
            body: text,
            fromMe: true,
            createdAt: new Date().toISOString(),
            timestamp: new Date().getTime() / 1000,
            _optimistic: true // Marker to identify pending local messages
        };

        // Add to beginning (Newest)
        STATE.messages.unshift(tempMsg);
        renderMessages();

        try {
            var res = await fetch(config.url + '/api/webchat/' + STATE.ticketId + '/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: text
                })
            });

            if (res.ok) {
                var json = await res.json();
                // Update local optimistic message with real ID from server
                // allowing us to deduplicate against server logs later
                if (json.messageId) {
                    var local = STATE.messages.find(m => m.id === tempId);
                    if (local) {
                        local.id = json.messageId;
                    }
                }
                loadMessages();
            } else {
                console.error("Erro ao enviar mensagem (Server):", res.status);
                // Optionally mark message as failed here
            }
        } catch (e) {
            console.error("Erro ao enviar mensagem:", e);
        }
    }

    function renderMessages() {
        chat.innerHTML = '';
        STATE.messages.forEach(msg => {
            var div = document.createElement('div');
            div.className = 'watink-msg ' + (msg.fromMe ? 'from-me' : 'from-them');
            if (msg._optimistic) {
                div.style.opacity = '0.7'; // Visual feedback for pending state
            }

            // Basic Markdown-ish support if needed, but keeping simple for now
            div.innerText = msg.body;

            var meta = document.createElement('span');
            meta.className = 'watink-msg-meta';

            // Format time: HH:MM
            var date = new Date(msg.createdAt ? msg.createdAt : msg.timestamp * 1000);
            var hours = date.getHours().toString().padStart(2, '0');
            var minutes = date.getMinutes().toString().padStart(2, '0');
            meta.innerText = hours + ':' + minutes;

            div.appendChild(meta);
            chat.appendChild(div);
        });
        scrollToBottom();
    }

    function scrollToBottom() {
        // Scroll to physical bottom (Newest is at bottom due to column-reverse)
        widgetBody.scrollTop = widgetBody.scrollHeight;
    }

    async function loadMessages() {
        if (!STATE.ticketId || !STATE.contactId) return;

        try {
            var res = await fetch(config.url + '/api/webchat/' + STATE.ticketId + '/messages?contactId=' + STATE.contactId);
            if (res.ok) {
                var json = await res.json();
                var serverMessages = json.messages || [];

                // Normalizing "fromMe" for Webchat Context
                serverMessages = serverMessages.map(m => ({ ...m, fromMe: !m.fromMe }));

                // Re-Merge Optimistic Messages
                // We keep any local optimistic message that is NOT yet present in the server list
                var pendingMessages = STATE.messages.filter(m => m._optimistic && !serverMessages.some(sm => sm.id === m.id));

                // Combine and Sort
                var combined = [...pendingMessages, ...serverMessages].sort((a, b) => {
                    const tA = a.createdAt ? new Date(a.createdAt).getTime() : a.timestamp * 1000;
                    const tB = b.createdAt ? new Date(b.createdAt).getTime() : b.timestamp * 1000;
                    return tB - tA; // Descending (Newest -> Oldest)
                });

                // Diff checking to avoid unnecessary re-renders (simple length check or head ID check)
                // Since we have pending messages, logic is slightly more complex, but simple assignment is safer for UI consistency
                STATE.messages = combined;
                renderMessages();

            } else if (res.status === 403 || res.status === 404) {
                // Ignore for now, keep connection open
            }
        } catch (e) {
            console.error("Erro ao buscar mensagens", e);
        }
    }

    function startPolling() {
        if (STATE.pollingInterval) return;
        STATE.pollingInterval = setInterval(loadMessages, 2000); // Polling reduced to 2s
    }

    function stopPolling() {
        if (STATE.pollingInterval) {
            clearInterval(STATE.pollingInterval);
            STATE.pollingInterval = null;
        }
    }

})();