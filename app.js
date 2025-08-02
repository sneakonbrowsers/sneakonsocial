document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
  databaseURL: "https://fidgety-6bac3-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const $ = id => document.getElementById(id);

let currentUser = null;
let selectedChannel = null; // or = "general", "default", etc. based on your logic
let chatRef = db.ref("chats/" + selectedChannel);
let userCoins = 0;

// 🧪 GIS Login via Google Identity Services
function handleCredentialResponse(response) {
  const decoded = JSON.parse(atob(response.credential.split('.')[1]));
  const uid = "google-" + decoded.sub;
  const username = decoded.name;
  const avatar = decoded.picture;

  db.ref(`users/${uid}`).once("value", snap => {
    if (snap.exists()) {
      const data = snap.val();
      currentUser = { uid, username: data.username, avatar: data.avatar };
      userCoins = data.sneakoins || 0;
    } else {
      currentUser = { uid, username, avatar };
      userCoins = 100;

      db.ref(`users/${uid}`).set({
        username,
        avatar,
        sneakoins: userCoins,
        online: true
      });
    }

    db.ref(`users/${uid}`).update({ online: true });
    db.ref(`users/${uid}`).onDisconnect().update({ online: false });

    $("avatarPreview").src = currentUser.avatar;
    $("displayName").textContent = currentUser.username;
    $("coinDisplay").textContent = userCoins;

    $("modal").style.display = "none";
    $("main").classList.remove("hidden");

    loadServers();
  });
}

window.onload = () => {
  google.accounts.id.initialize({
    client_id: "YOUR_GOOGLE_CLIENT_ID", // Replace this!
    callback: handleCredentialResponse
  });

  google.accounts.id.renderButton(
    $("googleLoginBtn"),
    { theme: "outline", size: "large" }
  );
};

// 🔒 Original Username+Password Auth Flow
$("setUsernameBtn").onclick = () => {
  const name = $("usernameInput").value.trim();
  const avatarInput = $("avatarInput").value.trim();
  const password = prompt("Enter your password:");

  if (!name || !password) return alert("Username and password required");

  db.ref("users").orderByChild("username").equalTo(name).once("value", snap => {
    if (snap.exists()) {
      const uid = Object.keys(snap.val())[0];
      const data = snap.val()[uid];
      if (data.password !== password) return alert("Incorrect password");

      currentUser = { uid, username: data.username, avatar: data.avatar };
      userCoins = data.sneakoins || 0;
      $("avatarPreview").src = data.avatar;
      $("displayName").textContent = data.username;
      $("coinDisplay").textContent = userCoins;

      db.ref(`users/${uid}`).update({ online: true });
      db.ref(`users/${uid}`).onDisconnect().update({ online: false });

      $("modal").style.display = "none";
      $("main").classList.remove("hidden");
      loadServers();
    } else {
      const uid = "user-" + Date.now();
      const avatar = avatarInput || "https://via.placeholder.com/32";
      currentUser = { uid, username: name, avatar };
      userCoins = 100;

      db.ref(`users/${uid}`).set({
        username: name,
        avatar,
        password,
        online: true,
        sneakoins: userCoins
      });
      db.ref(`users/${uid}`).onDisconnect().update({ online: false });

      $("avatarPreview").src = avatar;
      $("displayName").textContent = name;
      $("coinDisplay").textContent = userCoins;

      $("modal").style.display = "none";
      $("main").classList.remove("hidden");
      loadServers();
    }
  });
};

  // ⚙️ Avatar Update via Settings
  $("updateAvatarBtn").onclick = () => {
    const newAvatar = $("settingsAvatarInput").value.trim();
    if (!newAvatar) return alert("No avatar URL provided");

    currentUser.avatar = newAvatar;
    $("avatarPreview").src = newAvatar;

    db.ref(`users/${currentUser.uid}`).update({ avatar: newAvatar });
    alert("Avatar updated!");
  };

  // 🛒 Shop Logic
  $("buyAvatarBtn").onclick = () => {
    if (userCoins < 100) return alert("Not enough Sneakoins!");
    userCoins -= 100;
    $("coinDisplay").textContent = userCoins;
    db.ref(`users/${currentUser.uid}`).update({ sneakoins: userCoins });
    alert("✨ Avatar perk unlocked! Apply it via settings.");
  };

  $("buyLoreBtn").onclick = () => {
    if (userCoins < 250) return alert("Not enough Sneakoins!");
    userCoins -= 250;
    $("coinDisplay").textContent = userCoins;
    db.ref(`users/${currentUser.uid}`).update({ sneakoins: userCoins });
    alert("📜 Lore pack unlocked! Check your server notes soon.");
  };

  // 🧭 Panel Toggles
  $("exploreBtn").onclick = () => {
    location.href = "explore.html";
  };

  $("settingsTabBtn").onclick = () => {
    $("explorePanel").classList.add("hidden");
    $("settingsPanel").classList.remove("hidden");
    $("shopPanel").classList.add("hidden");
    $("chatPanel").classList.add("hidden");
    $("channelHeader").textContent = "Settings";
  };

 // $("shopTabBtn").onclick = () => {
 //   $("explorePanel").classList.add("hidden");
 //   $("settingsPanel").classList.add("hidden");
 //   $("shopPanel").classList.remove("hidden");
 //   $("chatPanel").classList.add("hidden");
 //   $("channelHeader").textContent = "Sneakoins Shop";
 // };
//  function loadExplore() {
//    const feed = $("exploreFeed");
//    feed.innerHTML = "";
//    const posts = [
//      "🧵 Sneakon Social is nearly here!"
//    ];
//    posts.forEach(text => {
//      const div = document.createElement("div");
//      div.className = "exploreItem";
//      div.textContent = text;
//      feed.appendChild(div);
//    });
//  }

  // 🏰 Server Logic
  function loadServers() {
    const srvList = $("serverList");
    db.ref("servers").once("value", snap => {
      srvList.innerHTML = "";
      snap.forEach(s => {
        const val = s.val();
        const id = s.key;

        if (!val.members || !val.members[currentUser.uid]) {
          db.ref(`servers/${id}/members/${currentUser.uid}`).set(true);
        }

        const li = document.createElement("li");
        li.textContent = val.name;
        li.onclick = () => selectServer(id, val.name);
        srvList.appendChild(li);
      });
    });
  }

$("createServerBtn").onclick = () => {
  let name = prompt("Enter a name for your new server:");
  if (!name) return alert("Server name is required!");

  name = name.trim();

  // 🚫 Prevent forbidden characters
  const forbidden = /✔️/;
  if (forbidden.test(name)) {
    return alert("Unverified servers cannot contain the ✔️ symbol.");
  }

  const serverId = db.ref("servers").push().key;

  const newServerData = {
    name,
    editblocked: false,
    members: { [currentUser.uid]: true },
    roles: { [currentUser.uid]: "owner" },
    channels: {
      general: { topic: "General chat", messages: {} }
    },
    lore: { unlocked: false }
  };

  db.ref(`servers/${serverId}`).set(newServerData, err => {
    if (err) {
      alert("Failed to create server.");
    } else {
      console.log("Server created:", name);
      loadServers(); // Refresh list
      selectServer(serverId, name); // Auto-select
    }
  });
};

  function selectServer(srvId, name) {
    currentServer = srvId;
    currentChannel = null;
    $("channelHeader").textContent = `Channels in ${name}`;
    loadChannels(srvId);
  }

  function loadChannels(srvId) {
    const chList = $("channelList");
    db.ref(`servers/${srvId}/channels`).on("value", snap => {
      chList.innerHTML = "";
      snap.forEach(ch => {
        const li = document.createElement("li");
        li.textContent = `#${ch.key}`;
        li.onclick = () => selectChannel(ch.key);
        chList.appendChild(li);
      });
    });
  }

$("createChannelBtn").onclick = () => {
  if (!currentServer) return alert("Please select a server first.");

  db.ref(`servers/${currentServer}/roles/${currentUser.uid}`).once("value", snap => {
    const role = snap.val();
    if (!["owner", "admin"].includes(role)) {
      return alert("You don’t have permission to create channels in this server.");
    }

    const channelName = prompt("New channel name:");
    if (!channelName) return alert("Channel name is required!");

    const channelPath = `servers/${currentServer}/channels/${channelName}`;
    const channelData = {
      topic: "New topic",
      messages: {}
    };

    db.ref(channelPath).set(channelData, err => {
      if (err) {
        alert("Failed to create channel.");
      } else {
        console.log(`Channel "${channelName}" created in ${currentServer}`);
        loadChannels(currentServer); // Refresh channels
        selectChannel(channelName); // Auto-select new channel
      }
    });
  });
};

  function selectChannel(chKey) {
    currentChannel = chKey;
    currentThreadId = null;
    $("chatTitle").textContent = `#${chKey}`;
    bindChat(`servers/${currentServer}/channels/${chKey}/messages`);
  }

//  $("joinVoiceBtn").onclick = () => {
//    if (!currentServer || !currentChannel) return alert("Select channel first");
//    const vcPath = `servers/${currentServer}/vc/${currentChannel}/${currentUser.uid}`;
//    db.ref(vcPath).set({
//      username: currentUser.username,
//      avatar: currentUser.avatar
//    });
//    $("voiceStatus").textContent = `🔊 In VC: ${currentChannel}`;
//  };

  // 📩 DM and Chat follows in next part...
    // 📩 Direct Messages
  function loadUserDMs() {
    const chList = $("channelList");
    db.ref("users").on("value", snap => {
      chList.innerHTML = "";
      snap.forEach(u => {
        if (u.key === currentUser.uid) return;
        const { username, avatar, online } = u.val();
        const li = document.createElement("li");
        li.innerHTML = `
          <img src="${avatar}" class="sneakoAvatar">
          ${username}
          <span style="float:right;color:${online ? "#6f6" : "#f66"}">●</span>`;
        li.onclick = () => openDM(u.key, username);
        chList.appendChild(li);
      });
    });
  }

  function openDM(uid, uname) {
    currentThreadId = [currentUser.uid, uid].sort().join("-");
    $("chatTitle").textContent = `DM: ${uname}`;
    bindChat(`dms/${currentThreadId}`);
  }

  // 💬 Chat Rendering & Sneakoins Per Message
  function bindChat(path) {
    if (chatRef) chatRef.off();
    chatRef = db.ref(path);

    const win = $("chatWindow");
    const input = $("msgInput");

    chatRef.on("value", snap => {
      win.innerHTML = "";
      snap.forEach(msgSnap => {
        const data = msgSnap.val();
        if (!data.text || !data.timestamp) return;

        const { sender, text, timestamp, reactions = {} } = data;
        const time = new Date(timestamp).toLocaleTimeString();
        const div = document.createElement("div");
        div.className = sender === currentUser.username ? "msg-out" : "msg-in";

        const pinBtn = document.createElement("button");
        pinBtn.className = "pinBtn";
        pinBtn.textContent = "📌";
        pinBtn.onclick = () => db.ref(`pins/${path}/${msgSnap.key}`).set(true);
        div.appendChild(pinBtn);

        // 🗑️ Optional Delete Button (for sender)
        if (sender === currentUser.username) {
          const delBtn = document.createElement("button");
          delBtn.className = "pinBtn";
          delBtn.textContent = "🗑️";
          delBtn.onclick = () => db.ref(`${path}/${msgSnap.key}`).remove();
          div.appendChild(delBtn);
        }

        const contentSpan = document.createElement("span");
        contentSpan.textContent = `${sender}: ${text} (${time})`;
        div.appendChild(contentSpan);

        // 🎉 Reactions UI
        const reactionBox = document.createElement("div");
        reactionBox.className = "reactionBox";

        for (const emoji in reactions) {
          const users = Object.keys(reactions[emoji]);
          const btn = document.createElement("button");
          btn.textContent = `${emoji} ${users.length}`;
          btn.onclick = () =>
            db.ref(`${path}/${msgSnap.key}/reactions/${emoji}/${currentUser.uid}`).set(true);
          reactionBox.appendChild(btn);
        }

        const reactInput = document.createElement("input");
        reactInput.placeholder = "Emoji 💬";
        reactInput.style.width = "60px";
        const reactBtn = document.createElement("button");
        reactBtn.textContent = "React";
        reactBtn.onclick = () => {
          const emoji = reactInput.value.trim();
          if (!emoji) return;
          db.ref(`${path}/${msgSnap.key}/reactions/${emoji}/${currentUser.uid}`).set(true);
          reactInput.value = "";
        };
        reactionBox.appendChild(reactInput);
        reactionBox.appendChild(reactBtn);
        div.appendChild(reactionBox);

        win.appendChild(div);
      });

      win.scrollTop = win.scrollHeight;
    });

    // 🟢 Typing Indicator
    const typingStatus = db.ref(`typing/${currentThreadId}`);
    typingStatus.on("value", snap => {
      const typers = snap.val() || {};
      let status = "";
      for (const uid in typers) {
        if (typers[uid]) {
          status += `💬 ${typers[uid]} is typing...\n`;
        }
      }
      $("voiceStatus").textContent = status.trim();
    });

    input.addEventListener("input", () => {
      const typingRef = db.ref(`typing/${currentThreadId}/${currentUser.uid}`);
      typingRef.set(currentUser.username);
      setTimeout(() => typingRef.remove(), 3000);
    });

    $("sendBtn").onclick = () => {
      const text = input.value.trim();
      if (!text) return;

      const msgData = {
        sender: currentUser.username,
        text,
        timestamp: Date.now()
      };
      chatRef.push().set(msgData);
      input.value = "";

      // 🪙 Reward Sneakoins per message
      userCoins += 2;
      $("coinDisplay").textContent = userCoins;
      db.ref(`users/${currentUser.uid}/sneakoins`).set(userCoins);

      db.ref(`typing/${currentThreadId}/${currentUser.uid}`).remove();
    };
  }
});