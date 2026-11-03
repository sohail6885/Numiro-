const $ = (id) => document.getElementById(id);
const messages = $("messages");
let history = [];
let currentView = "chat";

function showView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  $(view + "View").classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  $("pageTitle").textContent = ({chat:"AI Assistant",search:"Internet search",builder:"Website planner"})[view];
  $("sidebar").classList.remove("open");
}
document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("newChat").addEventListener("click", () => {
  history = []; messages.innerHTML = ""; $("welcome").style.display = "block"; showView("chat");
});
document.querySelectorAll(".suggestion").forEach(btn => btn.addEventListener("click", () => {
  $("chatInput").value = btn.dataset.prompt; $("chatInput").focus();
}));

function addMessage(role, content) {
  $("welcome").style.display = "none";
  const wrap = document.createElement("div");
  wrap.className = "message " + role;
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = role === "user" ? "Y" : "N";
  const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = content;
  wrap.append(avatar, bubble); messages.append(wrap); messages.scrollTop = messages.scrollHeight;
  return bubble;
}

async function checkHealth() {
  try {
    const r = await fetch("/api/health"); const data = await r.json();
    $("connection").textContent = "API online • model: " + data.model;
    $("modelName").textContent = data.model;
  } catch {
    $("connection").textContent = "API unavailable";
  }
}
checkHealth();

$("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("chatInput"); const prompt = input.value.trim(); if (!prompt) return;
  input.value = ""; addMessage("user", prompt);
  const pending = addMessage("assistant", "Numiro is thinking…");
  const prior = history.slice();
  try {
    const r = await fetch("/api/chat", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt,history:prior})});
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Request failed");
    pending.textContent = data.answer;
    history.push({role:"user",content:prompt},{role:"assistant",content:data.answer});
    speakText(data.answer);
  } catch (err) { pending.textContent = "⚠ " + err.message; }
});

$("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault(); const q = $("searchInput").value.trim(); if (!q) return;
  $("searchResults").textContent = "Searching…";
  try {
    const r = await fetch("/api/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:q})});
    const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Search failed");
    const area = $("searchResults"); area.innerHTML = "";
    if (!data.results.length) { area.textContent = "No results found."; return; }
    data.results.forEach(item => {
      const div = document.createElement("article"); div.className = "result";
      const a = document.createElement("a"); a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = item.title;
      const p = document.createElement("p"); p.textContent = item.snippet;
      const small = document.createElement("small"); small.textContent = item.url;
      div.append(a,p,small); area.append(div);
    });
  } catch (err) { $("searchResults").textContent = "⚠ " + err.message; }
});

$("builderForm").addEventListener("submit", async (e) => {
  e.preventDefault(); const prompt = $("builderInput").value.trim(); if (!prompt) return;
  $("builderOutput").textContent = "Creating your website plan…";
  try {
    const r = await fetch("/api/website-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:prompt})});
    const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Request failed");
    $("builderOutput").textContent = data.plan;
  } catch (err) { $("builderOutput").textContent = "⚠ " + err.message; }
});

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));


// Voice input/output: uses browser speech APIs; availability varies by browser.
const micBtn = $("micBtn");
const micLabel = $("micLabel");
const voiceStatus = $("voiceStatus");
const voiceLanguage = $("voiceLanguage");
const speakReplies = $("speakReplies");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

function speakText(text) {
  if (!speakReplies.checked || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLanguage.value;
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function stopListening() {
  if (recognition && isListening) recognition.stop();
}

if (!SpeechRecognition) {
  micBtn.disabled = true;
  micBtn.title = "Speech recognition is not supported in this browser.";
  voiceStatus.textContent = "Voice typing is not supported here. Try the latest Chrome browser, or use your tablet keyboard's microphone.";
} else {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    micLabel.textContent = "Listening…";
    voiceStatus.textContent = "Numiro is listening. Speak now.";
  };
  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      else interimText += event.results[i][0].transcript;
    }
    if (finalText) {
      const input = $("chatInput");
      input.value = (input.value ? input.value + " " : "") + finalText.trim();
      voiceStatus.textContent = "Speech captured. Tap Send to ask Numiro.";
    } else if (interimText) {
      voiceStatus.textContent = "Hearing: " + interimText;
    }
  };
  recognition.onerror = (event) => {
    voiceStatus.textContent = event.error === "not-allowed"
      ? "Microphone permission was denied. Allow microphone access in browser settings."
      : "Voice input issue: " + event.error + ". You can still type your message.";
  };
  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    micLabel.textContent = "Speak";
  };
  micBtn.addEventListener("click", () => {
    if (isListening) { stopListening(); return; }
    try {
      recognition.lang = voiceLanguage.value;
      recognition.start();
    } catch (err) {
      voiceStatus.textContent = "Could not start microphone. Wait a moment and try again.";
    }
  });
}

$("chatForm").addEventListener("submit", () => {
  stopListening();
});

// Speak the assistant's answer after the API response is received.
const originalChatSubmit = $("chatForm").onsubmit;

$("chatInput").addEventListener("input", () => {
  if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
    // Do not interrupt automatically while typing; user can disable reply speech.
  }
});
speakReplies.addEventListener("change", () => {
  if (!speakReplies.checked && "speechSynthesis" in window) window.speechSynthesis.cancel();
});
