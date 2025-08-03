const dbUrl = "https://fidgety-6bac3-default-rtdb.firebaseio.com/posts.json"; // Replace with your actual Firebase URL
const feedContainer = document.getElementById("feed");

// Load and render posts
async function loadPosts() {
  const res = await fetch(dbUrl);
  const posts = await res.json();
  feedContainer.innerHTML = "";

  Object.entries(posts || {}).forEach(([postId, post]) => {
    const postEl = document.createElement("div");
    postEl.className = "post";
    postEl.id = `post-${postId}`;
    postEl.style.color = "white";

    // Media block
    let mediaBlock = "";
    if (post.mediaType === "image") {
      mediaBlock = `<img src="${post.mediaUrl}" alt="${post.caption}" style="max-width:100%; border-radius:6px;" />`;
    } else if (post.mediaType === "video") {
      mediaBlock = `<video controls src="${post.mediaUrl}" style="max-width:100%; border-radius:6px;"></video>`;
    }

    // Reaction display (Discord-style)
    const reactionDisplay = post.reactions
      ? `<div class="reaction-display" style="margin-top:8px; font-size:18px;">
           ${Object.entries(post.reactions).map(([emoji, count]) =>
             `<span style="margin-right:10px;">${emoji} ${count}</span>`
           ).join("")}
         </div>`
      : "";

    // Comment display
    const commentList = post.comments
      ? Object.entries(post.comments).map(([cid, comment]) => `
          <div class="comment" style="margin:6px 0;">
            <strong>@${comment.username}</strong>: ${comment.text}
          </div>
        `).join("")
      : "";

    // Comment form
    const commentForm = `
      <form onsubmit="addComment('${postId}', event)" style="margin-top:8px;">
        <input type="text" name="username" placeholder="Your username…" required style="width:49%; margin-right:2%; padding:6px;" />
        <input type="text" name="text" placeholder="Add a comment…" required style="width:49%; padding:6px;" />
        <button type="submit" style="margin-top:6px;">Comment</button>
      </form>
    `;

    // Reaction button
    const reactionButton = `
      <div class="reactions" style="margin-top:10px;">
        <button onclick="openEmojiPicker('${postId}')" style="font-size:16px;">React ✨</button>
      </div>
    `;

    postEl.innerHTML = `
      <div class="media">${mediaBlock}</div>
      <div class="caption" style="margin-top:6px;">
        <strong>@${post.username}</strong>: ${post.caption}
      </div>
      ${reactionDisplay}
      ${reactionButton}
      <div class="comments">${commentList}${commentForm}</div>
    `;

    feedContainer.appendChild(postEl);
  });
}

// Submit a comment (requires username)
async function addComment(postId, e) {
  e.preventDefault();
  const form = e.target;
  const username = form.username.value.trim();
  const text = form.text.value.trim();
  if (!username || !text) return;

  const comment = {
    username,
    text,
    timestamp: Date.now()
  };

  await fetch(`https://fidgety-6bac3-default-rtdb.firebaseio.com/posts/${postId}/comments.json`, {
    method: "POST",
    body: JSON.stringify(comment),
    headers: { "Content-Type": "application/json" }
  });

  loadPosts();
}

// Open horizontal emoji picker
function openEmojiPicker(postId) {
  const existing = document.querySelector(".emoji-picker");
  if (existing) existing.remove();

  const picker = document.createElement("div");
  picker.className = "emoji-picker";
  picker.style.position = "fixed";
  picker.style.bottom = "30px";
  picker.style.left = "50%";
  picker.style.transform = "translateX(-50%)";
  picker.style.background = "#222";
  picker.style.padding = "10px 15px";
  picker.style.borderRadius = "10px";
  picker.style.display = "flex";
  picker.style.gap = "10px";
  picker.style.alignItems = "center";
  picker.style.zIndex = "999";

  const emojis = ["🔥", "⭐", "😂", "👍", "💀", "🎉"];
  emojis.forEach(emoji => {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    btn.style.fontSize = "24px";
    btn.style.background = "none";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.color = "white";
    btn.onclick = () => {
      react(postId, emoji);
      picker.remove();
    };
    picker.appendChild(btn);
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✖";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.color = "#ccc";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => picker.remove();
  picker.appendChild(closeBtn);

  document.body.appendChild(picker);
}

// Handle emoji reaction
async function react(postId, emoji) {
  const reactionUrl = `https://fidgety-6bac3-default-rtdb.firebaseio.com/posts/${postId}/reactions.json`;
  const res = await fetch(reactionUrl);
  const current = await res.json();
  const updated = { ...current, [emoji]: (current?.[emoji] || 0) + 1 };

  await fetch(reactionUrl, {
    method: "PUT",
    body: JSON.stringify(updated),
    headers: { "Content-Type": "application/json" }
  });

  loadPosts();
}

// Bootstrap
loadPosts();