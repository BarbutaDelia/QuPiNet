document.addEventListener("DOMContentLoaded", function () {
  const aliceInput = document.getElementById("alice-url");
  const bobInput = document.getElementById("bob-url");
  const startBtn = document.getElementById("start-btn");
  let keyHandle = null;
  let aliceKey = null;
  let bobKey = null;
  let aliceUrl = "";
  let bobUrl = "";

  startBtn.addEventListener("click", async function () {
    aliceUrl = aliceInput.value.trim();
    bobUrl = bobInput.value.trim();
    if (!aliceUrl || !bobUrl) {
      alert("Please enter both Alice and Bob URLs.");
      return;
    }
    startBtn.disabled = true;
    startBtn.textContent = "Starting...";

    try {
      // 1. Open key_handle on Alice
      const openResp = await fetch(`${aliceUrl}/qkd_open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const openData = await openResp.json();
      if (!openResp.ok) throw new Error(openData.error || "Failed to open key handle");
      keyHandle = openData.key_handle;

      // 2. Connect both nodes concurrently
      await Promise.all([
        fetch(`${aliceUrl}/qkd_connect_blocking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key_handle: keyHandle })
        }),
        fetch(`${bobUrl}/qkd_connect_blocking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key_handle: keyHandle })
        })
      ]);

      // 3. Poll for key generation
      let ready = false;
      let pollCount = 0;
      while (!ready && pollCount < 120) { // up to 10 minutes
        const [aliceKeyResp, bobKeyResp] = await Promise.all([
          fetch(`${aliceUrl}/qkd_get_key`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key_handle: keyHandle })
          }),
          fetch(`${bobUrl}/qkd_get_key`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key_handle: keyHandle })
          })
        ]);
        const aliceKeyData = await aliceKeyResp.json();
        const bobKeyData = await bobKeyResp.json();
        if (aliceKeyData.key_buffer && bobKeyData.key_buffer && aliceKeyData.key_buffer === bobKeyData.key_buffer) {
          aliceKey = aliceKeyData.key_buffer;
          bobKey = bobKeyData.key_buffer;
          ready = true;
        } else if (aliceKeyData.status === 7 || bobKeyData.status === 7) {
          alert("Key generation failed: " + (aliceKeyData.error || bobKeyData.error));
          startBtn.disabled = false;
          startBtn.textContent = "Start";
          return;
        }
        pollCount++;
        await new Promise(res => setTimeout(res, 5000));
      }
      if (!ready) {
        alert("Timeout waiting for key generation.");
        startBtn.disabled = false;
        startBtn.textContent = "Start";
        return;
      }

      // 4. Show chat UI (load from simulation.ejs or build here)
      showChatUI(aliceUrl, bobUrl, keyHandle, aliceKey);

    } catch (err) {
      alert("Error: " + err.message);
      startBtn.disabled = false;
      startBtn.textContent = "Start";
    }
  });

  function showChatUI(aliceUrl, bobUrl, keyHandle, key) {
    // Hide the setup form
    document.querySelector(".row").style.display = "none";
    // Insert chat UI (reuse simulation.ejs chat markup, but update JS to use hardware endpoints and key)
    // For brevity, you can fetch the chat HTML via AJAX or copy the markup here and adapt
    // Example placeholder:
    const chatDiv = document.createElement("div");
    chatDiv.innerHTML = `
      <div class="container mt-4">
        <h2 class="text-center">Hardware QKD Chat</h2>
        <div id="chat-messages" class="border rounded p-3 mb-3" style="height: 300px; overflow-y: auto;"></div>
        <form id="chat-form" class="d-flex">
          <input type="text" id="chat-input" class="form-control me-2" placeholder="Type your message..." autocomplete="off">
          <button type="submit" class="btn btn-success">Send</button>
        </form>
        <div class="mt-2">
          <strong>Last Encrypted Message:</strong>
          <span id="last-encrypted"></span>
        </div>
      </div>
    `;
    document.querySelector(".container").appendChild(chatDiv);

    const chatMessages = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const lastEncrypted = document.getElementById("last-encrypted");

    chatForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;
      // Send message to Bob using hardware endpoint
      const resp = await fetch(`${bobUrl}/send_encrypted_message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_handle: keyHandle, message: msg })
      });
      const data = await resp.json();
      if (data.ciphertext) {
        lastEncrypted.textContent = data.ciphertext;
        chatMessages.innerHTML += `<div><b>You:</b> ${msg}</div>`;
        chatInput.value = "";
      } else {
        alert("Failed to send: " + (data.error || "Unknown error"));
      }
    });

    // Poll for received messages
    setInterval(async () => {
      const resp = await fetch(`${aliceUrl}/messages`);
      const html = await resp.text();
      // Simple parsing: extract <li>...</li> as messages
      const matches = [...html.matchAll(/<li>(.*?)<\/li>/g)];
      chatMessages.innerHTML = matches.map(m => `<div><b>Peer:</b> ${m[1]}</div>`).join("");
    }, 3000);
  }
});