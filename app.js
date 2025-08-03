// app.js (ES Module)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  off,
  onChildAdded
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// ─── Firebase Init ──────────────────────────────────────────────────────────
const app = initializeApp({
  databaseURL: 'https://fidgety-6bac3-default-rtdb.firebaseio.com/'
});
const db = getDatabase(app);

// ─── App State ──────────────────────────────────────────────────────────────
let currentServer = null;
let currentChannel = null;

// ─── Helpers ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── Servers ────────────────────────────────────────────────────────────────
function loadServers() {
  const serversRef = ref(db, 'servers');
  onValue(serversRef, snap => {
    const list = $('serverList');
    list.innerHTML = '';
    snap.forEach(child => {
      const li = document.createElement('li');
      li.textContent = child.val().name;
      li.onclick = () => {
        currentServer = child.key;
        currentChannel = null;
        $('chatTitle').textContent = child.val().name;
        $('chatBox').innerHTML = '';
        loadChannels(child.key);
      };
      list.appendChild(li);
    });
  });
}

// ─── Channels ───────────────────────────────────────────────────────────────
function loadChannels(serverId) {
  const chanRef = ref(db, `servers/${serverId}/channels`);
  onValue(chanRef, snap => {
    const list = $('channelList');
    list.innerHTML = '';
    snap.forEach(ch => {
      const { name, topic = '' } = ch.val();
      const li = document.createElement('li');
      li.textContent = `#${name}${topic ? ' — ' + topic : ''}`;
      li.onclick = () => {
        currentChannel = ch.key;
        $('chatTitle').textContent = `#${name}`;
        $('chatBox').innerHTML = '';
        bindChat(`servers/${serverId}/channels/${ch.key}/messages`);
      };
      list.appendChild(li);
    });
  });
}

// ─── Chat Binding ───────────────────────────────────────────────────────────
let activeUnsubscribe = null;
function bindChat(path) {
  // tear down previous listener
  if (activeUnsubscribe) activeUnsubscribe();
  const messagesRef = ref(db, path);

  // use onChildAdded for real-time push
  const offFn = onChildAdded(messagesRef, snapshot => {
    const msg = snapshot.val();
    const div = document.createElement('div');
    div.className = 'message';
    div.textContent = `${msg.author}: ${msg.content}`;
    $('chatBox').appendChild(div);
    $('chatBox').scrollTop = $('chatBox').scrollHeight;
  });

  // store unsubscribe
  activeUnsubscribe = () => off(messagesRef, 'child_added', offFn);
}

// ─── UI Actions ─────────────────────────────────────────────────────────────
$('createServerBtn').onclick = () => {
  const name = prompt('Server name:');
  if (!name) return;
  const id = push(ref(db, 'servers')).key;
  set(ref(db, `servers/${id}`), {
    name,
    channels: {
      general: { name: 'general', topic: 'Welcome!', messages: {} }
    }
  });
};

$('createChannelBtn').onclick = () => {
  if (!currentServer) return alert('Select a server first.');
  const name = prompt('Channel name:');
  if (!name) return;
  const topic = prompt('Topic?') || '';
  set(
    ref(db, `servers/${currentServer}/channels/${name}`),
    { name, topic, messages: {} }
  );
};

$('sendBtn').onclick = () => {
  const content = $('msgInput').value.trim();
  if (!content || !currentServer || !currentChannel) return;
  const msgRef = push(
    ref(db, `servers/${currentServer}/channels/${currentChannel}/messages`)
  );
  set(msgRef, {
    author: 'guest',
    content,
    timestamp: Date.now()
  }).then(() => {
    $('msgInput').value = '';
  });
};

// ─── Boot ───────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  loadServers();
});