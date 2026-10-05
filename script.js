const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const sendButton = document.getElementById("sendButton");
const typing = document.getElementById("typing");
const newChatBtn = document.getElementById("newChatBtn");

let history = [];
let busy = false;

function getApiUrl(path) {
  // When James AI is served by its own Express server, same-origin is best.
  if (location.protocol === "http:" || location.protocol === "https:") {
    const currentPort = location.port;
    if (currentPort === "3000" || currentPort === "") {
      return path;
    }
  }

  // When using VS Code Live Server or opening index.html directly,
  // send API requests to the James AI backend on port 3000.
  return `http://127.0.0.1:3000${path}`;
}


function addMessage(text, role, isError = false) {
  const row = document.createElement("div");
  row.className = `message-row ${role}${isError ? " error" : ""}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  input.disabled = value;
  typing.classList.toggle("hidden", !value);
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 170) + "px";
}

async function sendMessage(text) {
  if (busy || !text.trim()) return;

  const message = text.trim();
  addMessage(message, "user");

  const oldHistory = [...history];
  history.push({ role: "user", content: message });

  setBusy(true);

  try {
    const response = await fetch(getApiUrl("/api/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        history: oldHistory
      })
    });

    const raw = await response.text();

    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(
        "Server က JSON မပြန်ပါ။ Terminal ထဲက error ကို စစ်ပေးပါ။"
      );
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "AI request failed.");
    }

    const reply = String(data.reply || "").trim();

    addMessage(reply || "James AI က အဖြေမပြန်နိုင်သေးပါ။", "ai");

    history.push({ role: "assistant", content: reply });
    history = history.slice(-24);
  } catch (error) {
    // Remove the user turn from history if the request failed,
    // so the next retry does not duplicate it.
    history = oldHistory;

    addMessage(`⚠️ ${error.message}`, "ai", true);
  } finally {
    setBusy(false);
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value;
  input.value = "";
  autoResize();

  sendMessage(text);
});

input.addEventListener("input", autoResize);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt || "";
    const categoryButtons = document.querySelectorAll(".category");
    if (button.classList.contains("category")) {
      categoryButtons.forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      input.value = prompt + " ";
      input.focus();
      autoResize();
      return;
    }

    input.value = prompt;
    autoResize();
    input.focus();
  });
});

newChatBtn.addEventListener("click", () => {
  history = [];
  messages.innerHTML = `
    <div class="welcome">
      <div class="welcome-logo">J</div>
      <h2>James AI</h2>
      <p>ဘာကူညီပေးရမလဲ?</p>
      <div class="quick-grid">
        <button class="quick" data-prompt="Python ကို beginner အနေနဲ့ ဘယ်လိုစလေ့လာရမလဲ?">💻 Coding</button>
        <button class="quick" data-prompt="Photosynthesis ကို ရိုးရိုးရှင်းရှင်းရှင်းပြပါ။">📚 Study</button>
        <button class="quick" data-prompt="2x + 7 = 19 ကို အဆင့်လိုက်ဖြေရှင်းပေးပါ။">🧮 Math</button>
        <button class="quick" data-prompt="ဒီစာကို English လို ဘာသာပြန်ပေးပါ။">🌐 Translate</button>
      </div>
    </div>
  `;

  messages.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.prompt;
      autoResize();
      input.focus();
    });
  });

  input.value = "";
  input.focus();
});
