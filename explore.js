const DB_BASE = "https://fidgety-6bac3-default-rtdb.firebaseio.com/posts";
const USER_BASE = "https://fidgety-6bac3-default-rtdb.firebaseio.com/users";

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.getElementById("feed");
  const uploadForm = document.getElementById("uploadForm");

  loadPosts(feedContainer);

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const caption = document.getElementById("caption").value.trim();
    const fileInput = document.getElementById("mediaUpload");
    const file = fileInput.files[0] || null;

    if (!username || !caption) {
      alert("Please fill in username and caption");
      return;
    }

    const password = prompt("Enter your password:");
    if (!password || password.trim() === "") {
      alert("Password is required");
      return;
    }

    try {
      const userRes = await fetch(`${USER_BASE}/${username}.json`);
      const existing = await userRes.json();

      if (existing && existing.password !== password) {
        alert("Incorrect password for this username.");
        return;
      }

      if (!existing) {
        await fetch(`${USER_BASE}/${username}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        });
      }

      let mediaUrl = null;
      let mediaType = null;

      if (file) {
        if (file.type.startsWith("image/")) {
          mediaType = "image";
        } else if (file.type.startsWith("video/")) {
          mediaType = "video";
        }
        mediaUrl = await fileToDataURI(file);
      }

      const post = {
  username,
  caption,
  mediaType,
  mediaUrl,
  timestamp: Date.now(),
  reactions: {},
  comments: {},
  verified: existing?.verified === true
};

      await fetch(`${DB_BASE}.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post)
      });

      uploadForm.reset();
      loadPosts(feedContainer);
    } catch (err) {
      alert("Failed to create post: " + err.message);
    }
  });
});

// ===== Convert file to Data URI =====
function fileToDataURI(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== Load posts =====
async function loadPosts(feedContainer) {
  feedContainer.innerHTML = `<p style="color:#ccc;">Loading posts...</p>`;
  try {
    const res = await fetch(`${DB_BASE}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();

    feedContainer.innerHTML = "";

    if (!posts) {
      feedContainer.innerHTML = `<p style="color:#ccc;">No posts yet.</p>`;
      return;
    }

    const sorted = Object.entries(posts).sort(([, a], [, b]) => (b.timestamp || 0) - (a.timestamp || 0));

    for (const [postId, post] of sorted) {
      feedContainer.appendChild(renderPost(postId, post));
    }
  } catch (err) {
    feedContainer.innerHTML = `<p style="color:red;">Error loading posts: ${err.message}</p>`;
  }
}

// ===== Render post =====
function renderPost(postId, post) {
  const postEl = document.createElement("div");
  postEl.className = "post";

  const verifiedMark = post.verified === true
  ? ' <span title="Verified" style="color:#3bf742;">VERIFIED</span>'
  : '';
  const captionEl = document.createElement("p");
  captionEl.innerHTML = `<span class="username">@${post.username}${verifiedMark}</span>: ${post.caption}`;
  postEl.appendChild(captionEl);

  if (post.mediaType === "image" && post.mediaUrl) {
    const img = document.createElement("img");
    img.src = post.mediaUrl;
    postEl.appendChild(img);
  } else if (post.mediaType === "video" && post.mediaUrl) {
    const vid = document.createElement("video");
    vid.src = post.mediaUrl;
    vid.controls = true;
    postEl.appendChild(vid);
  }

  const reactionDisplay = document.createElement("div");
  reactionDisplay.className = "reaction-display";
  reactionDisplay.style.marginTop = "8px";
  reactionDisplay.style.fontSize = "18px";
  updateReactionDisplay(reactionDisplay, post.reactions || {});
  postEl.appendChild(reactionDisplay);

  const reactBtn = document.createElement("button");
  reactBtn.type = "button";
  reactBtn.textContent = "React ✨";
  reactBtn.style.fontSize = "16px";
  reactBtn.addEventListener("click", () => openEmojiPicker(postId, reactionDisplay));
  postEl.appendChild(reactBtn);

  /*
  const commentsWrap = document.createElement("div");
  commentsWrap.className = "comments";
  if (post.comments) {
    for (const [, c] of Object.entries(post.comments)) {
      commentsWrap.appendChild(renderComment(c));
    }
  }
  postEl.appendChild(commentsWrap);

  const form = document.createElement("form");
  form.style.marginTop = "8px";
  form.innerHTML = `
    <input type="text" name="username" placeholder="Your username…" required />
    <input type="text" name="text" placeholder="Add a comment…" required />
    <button type="submit">Comment</button>
  `;
  form.addEventListener("submit", (e) => addComment(e, postId, commentsWrap, form));
  postEl.appendChild(form);

  return postEl;
  */
}

// ===== Render comment =====
function renderComment(comment) {
  const cEl = document.createElement("div");
  cEl.className = "comment";
  cEl.style.margin = "6px 0";
  cEl.style.color = "#fff";

  const verifiedMark = comment.verified === true
  ? ' <span title="Verified" style="color:#3bf742;">VERIFIED</span>'
  : '';
  cEl.innerHTML = `<strong>@${comment.username}${verifiedMark}</strong>: ${comment.text}`;
  return cEl;
}

// ===== Update reactions UI =====
function updateReactionDisplay(container, reactions) {
  container.innerHTML = "";
  const entries = Object.entries(reactions || {});
  for (const [emoji, count] of entries) {
    const span = document.createElement("span");
    span.dataset.emoji = emoji;
    span.style.marginRight = "10px";
    span.textContent = `${emoji} ${count}`;
    container.appendChild(span);
  }
}

// ===== Add comment =====
async function addComment(e, postId, commentsWrap, form) {
  e.preventDefault();
  const username = form.username.value.trim();
  const text = form.text.value.trim();
  if (!username || !text) return;

  const password = prompt("Enter your password:");
  if (!password || password.trim() === "") {
    alert("Password is required to comment.");
    return;
  }

  try {
    const userRes = await fetch(`${USER_BASE}/${username}.json`);
    const existing = await userRes.json();

    if (existing && existing.password !== password) {
      alert("Incorrect password for this username.");
      return;
    }

    if (!existing) {
      await fetch(`${USER_BASE}/${username}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
    }

    const comment = {
  username,
  text,
  timestamp: Date.now(),
  verified: existing?.verified === true
};

    await fetch(`${DB_BASE}/${postId}/comments.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment)
    });

    commentsWrap.appendChild(renderComment(comment));
    form.reset();
  } catch (err) {
    alert("Failed to post comment: " + err.message);
  }
}

// ===== Emoji picker =====
function openEmojiPicker(postId, reactionsWrap) {
  const existing = document.querySelector(".emoji-picker");
  if (existing) existing.remove();

  const picker = document.createElement("div");
  picker.className = "emoji-picker";
  Object.assign(picker.style, {
    position: "fixed",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#222",
    padding: "10px 15px",
    borderRadius: "10px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    zIndex: "999",
    color: "white"
  });

  const emojis = ["🔥", "⭐", "😂", "👍", "💀", "🎉"];
  for (const emoji of emojis) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    Object.assign(btn.style, {
      fontSize: "24px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "white"
    });
    btn.addEventListener("click", async () => {
      await react(postId, emoji, reactionsWrap);
      picker.remove();
    });
    picker.appendChild(btn);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "✖";
  Object.assign(closeBtn.style, {
    fontSize: "18px",
    color: "#ccc",
    background: "none",
        border: "none",
    cursor: "pointer"
  });
  closeBtn.addEventListener("click", () => picker.remove());
  picker.appendChild(closeBtn);

  document.body.appendChild(picker);
}

// ===== React =====
async function react(postId, emoji, reactionsWrap) {
  try {
    const res = await fetch(`${DB_BASE}/${postId}/reactions.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const current = await res.json() || {};
    const updated = { ...current, [emoji]: (current?.[emoji] || 0) + 1 };

    await fetch(`${DB_BASE}/${postId}/reactions.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });

    updateReactionDisplay(reactionsWrap, updated);
  } catch (err) {
    alert("Failed to react: " + err.message);
  }
}