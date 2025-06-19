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

    let keyHandle = null;
    let connectResults = {};
    const POLL_INTERVAL = 5000; // ms
    const MAX_WAIT_TIME = 600000; // ms (10 min)
    const CONNECT_TIMEOUT = 30000; // ms

    // Step 1: Open key_handle
    try {
      const openResp = await fetch(`${aliceUrl}/qkd_open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!openResp.ok) throw new Error("Failed to open key handle");
      const openData = await openResp.json();
      keyHandle = openData.key_handle;
      if (!keyHandle) throw new Error("No key_handle returned from Alice");
    } catch (e) {
      alert("Error opening key_handle: " + e.message);
      startBtn.disabled = false;
      startBtn.textContent = "Start";
      return;
    }

    // Step 2: Connect both nodes concurrently
    async function connectNode(nodeName, url, handle) {
      try {
        const resp = await fetch(`${url}/qkd_connect_blocking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key_handle: handle }),
          signal: AbortSignal.timeout(CONNECT_TIMEOUT)
        });
        if (!resp.ok) throw new Error(await resp.text());
        return { success: true, response: await resp.json() };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    let aliceConnect, bobConnect;
    try {
      [aliceConnect, bobConnect] = await Promise.all([
        connectNode("Alice", aliceUrl, keyHandle),
        connectNode("Bob", bobUrl, keyHandle)
      ]);
      if (!aliceConnect.success) throw new Error("Alice connect failed: " + aliceConnect.error);
      if (!bobConnect.success) throw new Error("Bob connect failed: " + bobConnect.error);
    } catch (e) {
      alert("Connection error: " + e.message);
      // Optionally: try to close key_handle here
      startBtn.disabled = false;
      startBtn.textContent = "Start";
      return;
    }

    // Step 3: Poll for key generation
    let aliceKeyData = null, bobKeyData = null;
    let startTime = Date.now();
    let success = false;
    while (Date.now() - startTime < MAX_WAIT_TIME) {
      try {
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
        const aliceStatus = await aliceKeyResp.json();
        const bobStatus = await bobKeyResp.json();

        const aliceReady = aliceKeyResp.ok && "key_buffer" in aliceStatus;
        const bobReady = bobKeyResp.ok && "key_buffer" in bobStatus;
        const aliceError = aliceStatus.status === 7;
        const bobError = bobStatus.status === 7;

        if (aliceReady && bobReady) {
          aliceKeyData = aliceStatus;
          bobKeyData = bobStatus;
          success = true;
          break;
        } else if (aliceError || bobError) {
          alert("Error during key generation:\nAlice: " + JSON.stringify(aliceStatus) + "\nBob: " + JSON.stringify(bobStatus));
          startBtn.disabled = false;
          startBtn.textContent = "Start";
          return;
        }
        // Optionally, show status to user
      } catch (e) {
        // Optionally, show polling error
      }
      await new Promise(res => setTimeout(res, POLL_INTERVAL));
    }

    if (!success) {
      alert("Timeout waiting for key generation.");
      startBtn.disabled = false;
      startBtn.textContent = "Start";
      return;
    }

    // Step 4: Check keys and show chat
    const aliceKey = aliceKeyData.key_buffer;
    const bobKey = bobKeyData.key_buffer;
    if (aliceKey && bobKey && aliceKey === bobKey && aliceKey.length > 0) {
      showChatUI(aliceUrl, bobUrl, keyHandle, aliceKey);
    } else if (aliceKey.length === 0 && bobKey.length === 0) {
      alert("Key generation resulted in empty keys (check QBER/raw bits).");
      startBtn.disabled = false;
      startBtn.textContent = "Start";
      return;
    } else {
      alert("ERROR: Keys do not match!\nAlice: " + aliceKey + "\nBob: " + bobKey);
      startBtn.disabled = false;
      startBtn.textContent = "Start";
      return;
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