const API_BASE = "https://chat-backend.YOUR_ACCOUNT.workers.dev"; // 修改成 Worker URL
let ws = null;
let currentRoom = null;
const messages = [];

// ===== 畫面切換 =====
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
function showRegister() { showScreen("register-screen"); }
function showLogin() { showScreen("login-screen"); }
function showMain() { loadChats(); showScreen("main-screen"); }

// ===== 使用者登入 / 註冊 =====
async function login() {
  const emailOrUser = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrUser, password })
  });
  if (res.ok) { alert("登入成功！"); showMain(); }
  else alert("登入失敗");
}

async function register() {
  const data = {
    name: document.getElementById("reg-name").value,
    age: document.getElementById("reg-age").value,
    email: document.getElementById("reg-email").value,
    password: document.getElementById("reg-password").value,
  };
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (res.ok) { alert("大功告成！"); showMain(); }
  else alert("註冊失敗");
}

// ===== 聊天室列表 =====
async function loadChats() {
  const res = await fetch(`${API_BASE}/api/chats`);
  const list = document.getElementById("chat-list");
  list.innerHTML = "";
  if (res.ok) {
    const chats = await res.json();
    if (chats.length === 0) list.innerHTML = "<p>空空如也</p>";
    else {
      chats.forEach(c => {
        const div = document.createElement("div");
        div.textContent = c.name;
        div.classList.add("chat-item");
        div.onclick = () => enterChatRoom(c.name);
        list.appendChild(div);
      });
    }
  }
}
async function joinChat() {
  const code = document.getElementById("invite-code").value;
  const res = await fetch(`${API_BASE}/api/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invite: code })
  });
  if (res.ok) { alert("已加入聊天室！"); loadChats(); }
  else alert("加入失敗");
}

// ===== 進入聊天室 =====
function enterChatRoom(name) {
  document.getElementById("chat-room-title").textContent = name;
  document.getElementById("chat-messages").innerHTML = "";
  showScreen("chat-room-screen");

  if (ws) ws.close();
  ws = new WebSocket(`${API_BASE.replace(/^http/, 'ws')}/ws?room=${encodeURIComponent(name)}`);

  ws.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.type === "message") { appendMessage(data.text, data.senderSelf, data.id); markAsRead(data.id); }
    else if (data.type === "readStatus") updateReadStatus(data.readStatus);
  };
}

// ===== 訊息功能 =====
function appendMessage(text, self=false, id) {
  messages.push({ id, text, self, read: self });
  const div = document.createElement("div");
  div.classList.add("message", self ? "self" : "other");
  div.dataset.id = id;
  div.textContent = text + (self ? " ✓" : "");
  document.getElementById("chat-messages").appendChild(div);
  div.scrollIntoView();
}

function sendMessage() {
  const input = document.getElementById("chat-input-box");
  const msg = input.value.trim();
  if (!msg || !ws || ws.readyState !== WebSocket.OPEN) return;
  const user = "self"; // 可以換成真實使用者名稱
  ws.send(JSON.stringify({ type: "message", text: msg, user }));
  input.value = "";
}

function markAsRead(id) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "read", id }));
}

function updateReadStatus(status) {
  document.querySelectorAll(".message.self").forEach(div => {
    const msgId = parseInt(div.dataset.id);
    let readByOthers = Object.values(status).some(lastReadId => lastReadId >= msgId);
    if (readByOthers) div.textContent = div.textContent.replace(/ ✓?$/, " ✓✓");
  });
}

// ===== 初始顯示登入 =====
showLogin();
