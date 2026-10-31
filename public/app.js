'use strict';

const joinView = document.querySelector('#joinView');
const chatView = document.querySelector('#chatView');
const joinForm = document.querySelector('#joinForm');
const nicknameInput = document.querySelector('#nicknameInput');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#messageInput');
const sendButton = document.querySelector('#sendButton');
const messagesBox = document.querySelector('#messages');
const onlineCount = document.querySelector('#onlineCount');
const activeNickname = document.querySelector('#activeNickname');
const statusBox = document.querySelector('#status');
const changeName = document.querySelector('#changeName');

const clientId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
let nickname = '';
let source = null;
const seen = new Set();

try { nicknameInput.value = localStorage.getItem('genel-sohbet-nickname') || ''; } catch (_) {}

function addMessage(message) {
  if (!message || seen.has(message.id)) return;
  const nearBottom = messagesBox.scrollHeight - messagesBox.scrollTop - messagesBox.clientHeight < 85;
  seen.add(message.id);
  const empty = messagesBox.querySelector('.empty-state');
  if (empty) empty.remove();

  const mine = message.clientId === clientId;
  const wrapper = document.createElement('div');
  wrapper.className = `message${mine ? ' mine' : ''}`;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const name = document.createElement('strong');
  name.textContent = message.nickname;
  const time = document.createElement('time');
  time.dateTime = message.createdAt;
  time.textContent = new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  meta.append(name, time);

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = message.text;
  wrapper.append(meta, bubble);
  messagesBox.append(wrapper);
  if (nearBottom || mine) messagesBox.scrollTop = messagesBox.scrollHeight;
}

function resetHistory(history) {
  seen.clear();
  messagesBox.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const heading = document.createElement('strong');
    heading.textContent = 'Henüz mesaj yok';
    const content = document.createElement('span');
    content.textContent = 'İlk mesajı sen gönder!';
    empty.append(heading, content);
    messagesBox.append(empty);
  } else {
    for (const message of history) addMessage(message);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }
}

function connect() {
  if (source) source.close();
  onlineCount.textContent = 'Bağlanıyor...';
  source = new EventSource('/events');
  source.addEventListener('history', event => {
    resetHistory(JSON.parse(event.data));
    statusBox.textContent = '';
  });
  source.addEventListener('message', event => addMessage(JSON.parse(event.data)));
  source.addEventListener('presence', event => {
    const { count } = JSON.parse(event.data);
    onlineCount.textContent = `${count} kişi bağlı`;
  });
  source.addEventListener('error', () => {
    onlineCount.textContent = 'Bağlantı yeniden kuruluyor...';
  });
}

joinForm.addEventListener('submit', event => {
  event.preventDefault();
  const selectedName = nicknameInput.value.trim();
  if (!selectedName || selectedName.length > 24) return;
  nickname = selectedName;
  try { localStorage.setItem('genel-sohbet-nickname', nickname); } catch (_) {}
  activeNickname.textContent = nickname;
  joinView.classList.add('hidden');
  chatView.classList.remove('hidden');
  connect();
  messageInput.focus();
});

changeName.addEventListener('click', () => {
  source?.close();
  source = null;
  chatView.classList.add('hidden');
  joinView.classList.remove('hidden');
  nicknameInput.focus();
  nicknameInput.select();
});

messageForm.addEventListener('submit', async event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !nickname) return;
  sendButton.disabled = true;
  statusBox.textContent = '';
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, text, clientId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Mesaj gönderilemedi.');
    messageInput.value = '';
    messageInput.focus();
  } catch (error) {
    statusBox.textContent = error.message || 'Bağlantı hatası, tekrar dene.';
  } finally {
    sendButton.disabled = false;
  }
});
