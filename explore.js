const DB_URL = "https://fidgety-6bac3-default-rtdb.firebaseio.com/posts.json"; // Replace with your Firebase URL
const feedContainer = document.getElementById("feed");

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const caption = document.getElementById("caption").value.trim();
  const file = document.getElementById("mediaUpload").files[0];
  if (!username || !caption || !file) return alert("Please fill out all fields.");

  const reader = new FileReader();
  reader.onloadend = async () => {
    const mediaType = file.type.startsWith("image") ? "image" : "video";

    const post = {
      username,
      caption,
      mediaUrl: reader.result,
      mediaType,
      likes: 0,
      timestamp: Date.now()
    };

    await fetch(DB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post)
    });

    loadPosts();
  };
  reader.readAsDataURL(file);
});

async function loadPosts() {
  const res = await fetch(DB_URL);
  const data = await res.json();

  const posts = Object.entries(data || {}).map(([id, post]) => ({ id, ...post }));
  posts.sort((a, b) => b.timestamp - a.timestamp);

  feedContainer.innerHTML = "";
  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";

    let mediaHTML = "";
    if (post.mediaType === "image") {
      mediaHTML = `<img src="${post.mediaUrl}" alt="Uploaded media" />`;
    } else if (post.mediaType === "video") {
      mediaHTML = `<video controls src="${post.mediaUrl}"></video>`;
    }

    div.innerHTML = `
      <div class="username">@${post.username}</div>
      ${mediaHTML}
      <p>${post.caption}</p>
      <button onclick="likePost('${post.id}', ${post.likes})">❤️ ${post.likes}</button>
    `;
    feedContainer.appendChild(div);
  });
}

async function likePost(id, currentLikes) {
  await fetch(`https://your-project.firebaseio.com/posts/${id}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ likes: currentLikes + 1 })
  });

  loadPosts();
}

loadPosts();