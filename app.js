// app.js (ES Module)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
  getDatabase,
  ref,
  onValue,
  onChildAdded,
  push,
  set,
  off
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// ─── Firebase Setup ─────────────────────────────────────────────
const app = initializeApp({
  databaseURL: 'https://fidgety-6bac3-default-rtdb.firebaseio.com/'
});
const db = getDatabase(app);

// ─── State ──────────────────────────────────────────────────────
let username = 'guest';
let currentServer = null;
let currentChannel = null;
let activeUnsubscribe = null;

// ─── DOM Helpers ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── Login Popup ────────────────────────────────────────────────
function promptUsername() {
  const name = prompt("Enter your display name:");
  if (name && name.trim()) {
    username = name.trim();
  }
}
promptUsername(); // Ask on load

// ─── Load Servers ───────────────────────────────────────────────
function loadServers() {
  const serversRef = ref(db, 'servers');
  onValue(serversRef, snap => {
    const list = $('serverList');
    list.innerHTML = '';
    snap.forEach(child => {
      const serverId = child.key;
      const data = child.val();
      const name = data?.name || serverId;

      const li = document.createElement('li');
      li.textContent = name;
      li.onclick = () => {
        currentServer = serverId;
        currentChannel = null;
        $('chatTitle').textContent = name;
        $('chatBox').innerHTML = '';
        loadChannels(serverId);
      };
      list.appendChild(li);
    });
  });
}

// ─── Load Channels ──────────────────────────────────────────────
function loadChannels(serverId) {
  const chanRef = ref(db, `servers/${serverId}/channels`);
  onValue(chanRef, snap => {
    const list = $('channelList');
    list.innerHTML = '';
    snap.forEach(ch => {
      const data = ch.val();
      const name = data?.name || ch.key;
      const topic = data?.topic || '';

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

// ─── Bind Chat ──────────────────────────────────────────────────
function bindChat(path) {
  if (activeUnsubscribe) activeUnsubscribe();

  const msgRef = ref(db, path);
  const unsub = onChildAdded(msgRef, snap => {
    const data = snap.val();
    const author = data?.author || 'anonymous';
    const content = data?.content || '[missing content]';

    const div = document.createElement('div');
    div.className = 'message';
    div.textContent = `${author}: ${content}`;
    $('chatBox').appendChild(div);
    $('chatBox').scrollTop = $('chatBox').scrollHeight;
  });

  activeUnsubscribe = () => off(msgRef, 'child_added', unsub);
}

// ─── Message Sending ────────────────────────────────────────────
$('sendBtn').onclick = () => {
  const content = $('msgInput').value.trim();
  if (!content || !currentServer || !currentChannel) return;

  const msgRef = push(
    ref(db, `servers/${currentServer}/channels/${currentChannel}/messages`)
  );

  set(msgRef, {
    author: username,
    content,
    timestamp: Date.now()
  }).then(() => {
    $('msgInput').value = '';
  });
};

// ─── Server Creation ────────────────────────────────────────────
$('createServerBtn').onclick = () => {
  const name = prompt('New server name:');
  if (!name) return;

  const id = push(ref(db, 'servers')).key;
  set(ref(db, `servers/${id}`), {
    name,
    channels: {
      general: { name: 'general', topic: 'Welcome to general', messages: {} }
    }
  });
};

// ─── Channel Creation ───────────────────────────────────────────
$('createChannelBtn').onclick = () => {
  if (!currentServer) return alert("No server selected.");
  const name = prompt('Channel name:');
  const topic = prompt('Topic:') || '';
  if (!name) return;

  set(ref(db, `servers/${currentServer}/channels/${name}`), {
    name,
    topic,
    messages: {}
  });
};

// ─── Load on Start ──────────────────────────────────────────────
window.addEventListener('load', () => {
  loadServers();
});