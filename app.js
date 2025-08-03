import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
  getDatabase,
  ref,
  onValue,
  onChildAdded,
  push,
  set,
  remove,
  off,
  get
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// 🔧 Firebase Init
const app = initializeApp({ databaseURL: 'https://fidgety-6bac3-default-rtdb.firebaseio.com/' });
const db = getDatabase(app);

// 🔒 App State
let currentUser = { uid: null, name: 'guest', avatar: '', role: 'member' };
let currentServer = null;
let currentChannel = null;
let activeUnsub = null;

// 🧭 DOM Helper
const $ = id => document.getElementById(id);

// 🔐 Login Popup
function promptLogin() {
  const uid = prompt("Enter your user ID:");
  if (!uid) return;

  get(ref(db, `users/${uid}`)).then(snap => {
    if (!snap.exists()) {
      alert("User not found. Using anonymous guest.");
    } else {
      const data = snap.val();
      currentUser = {
        uid,
        name: data.name || "guest",
        avatar: data.avatar || "",
        role: data.role || "member"
      };
      $('avatarPreview').src = currentUser.avatar;
      $('displayName').textContent = currentUser.name;
    }
  });
}
promptLogin();

// 🏰 Server Loading
function loadServers() {
  onValue(ref(db, 'servers'), snap => {
    const list = $('serverList');
    list.innerHTML = '';
    snap.forEach(srv => {
      const name = srv.val()?.name || srv.key;
      const li = document.createElement("li");
      li.textContent = name;
      li.onclick = () => {
        currentServer = srv.key;
        currentChannel = null;
        $('chatTitle').textContent = name;
        $('chatBox').innerHTML = '';
        loadChannels(currentServer);
      };
      list.appendChild(li);
    });
  });
}

// 🧵 Channel Loading
function loadChannels(srvId) {
  onValue(ref(db, `servers/${srvId}/channels`), snap => {
    const list = $('channelList');
    list.innerHTML = '';
    snap.forEach(ch => {
      const name = ch.val()?.name || ch.key;
      const topic = ch.val()?.topic || "";
      const li = document.createElement("li");
      li.textContent = `#${name}${topic ? " — " + topic : ""}`;
      li.onclick = () => {
        currentChannel = ch.key;
        $('chatTitle').textContent = `#${name}`;
        $('chatBox').innerHTML = '';
        bindChat(`servers/${srvId}/channels/${ch.key}/messages`);
      };
      list.appendChild(li);
    });
  });
}

// 💬 Bind Chat Stream
function bindChat(path) {
  if (activeUnsub) activeUnsub();
  const msgRef = ref(db, path);
  const unsub = onChildAdded(msgRef, snap => {
    const msg = snap.val();
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `
      <img src="${msg.avatar || ''}" width="24" height="24" style="vertical-align: middle; border-radius: 50%; margin-right: 6px;">
      <strong>${msg.author}</strong> <span style="color:#888">[${msg.role || 'member'}]</span>: ${msg.content}
    `;
    div.onclick = () => {
      if (msg.uid === currentUser.uid || currentUser.role === "owner") {
        if (confirm("Delete this message?")) {
          remove(ref(db, `${path}/${snap.key}`));
          div.remove();
        }
      }
    };
    $('chatBox').appendChild(div);
    $('chatBox').scrollTop = $('chatBox').scrollHeight;
  });
  activeUnsub = () => off(msgRef, 'child_added', unsub);
}

// 📤 Send Message
$('sendBtn').onclick = () => {
  const content = $('msgInput').value.trim();
  if (!content || !currentServer || !currentChannel) return;

  const msg = {
    author: currentUser.name,
    avatar: currentUser.avatar,
    role: currentUser.role,
    uid: currentUser.uid,
    content,
    timestamp: Date.now()
  };

  set(push(ref(db, `servers/${currentServer}/channels/${currentChannel}/messages`)), msg);
  $('msgInput').value = '';
};

// 🏗 Server Creation
$('createServerBtn').onclick = () => {
  const name = prompt("Server name:");
  if (!name) return;
  const id = push(ref(db, 'servers')).key;
  set(ref(db, `servers/${id}`), {
    name,
    channels: {
      general: { name: 'general', topic: 'Welcome!', messages: {} }
    },
    roles: { [currentUser.uid]: currentUser.role }
  });
};

// 🧵 Channel Creation
$('createChannelBtn').onclick = () => {
  if (!currentServer) return alert("No server selected.");
  const name = prompt("Channel name:");
  const topic = prompt("Topic:") || "";
  if (!name) return;
  set(ref(db, `servers/${currentServer}/channels/${name}`), {
    name, topic, messages: {}
  });
};

// 🚀 Boot
window.addEventListener("load", () => {
  loadServers();
});