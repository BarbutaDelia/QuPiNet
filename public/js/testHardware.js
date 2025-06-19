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
    // No longer hiding the initial setup form.
    // document.querySelector('.container.mt-5').style.display = 'none';

    // Show the chat section
    const chatSection = document.getElementById('chat-section');
    chatSection.style.display = 'block';

    // Set the generated key in the UI
    document.getElementById('encryptionKey').textContent = key;

    // Smoothly scroll down to the new chat section
    chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // --- The rest of the send logic remains the same ---

    // Alice sends to her own URL, which then forwards to Bob
    document.getElementById('alice-send').onclick = async function() {
      const input = document.getElementById('alice-input');
      const text = input.value.trim();
      if (!text) return;

      addMessage(document.getElementById('alice-messages'), text, 'sent');
      input.value = '';

      // Step 1: Alice encrypts the message
      let ciphertext = '';
      try {
        const resp = await fetch(`${aliceUrl}/send_encrypted_message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key_handle: keyHandle, message: text })
        });
        const data = await resp.json();
        if (!resp.ok || data.error) throw new Error(data.error || "Failed to encrypt");
        ciphertext = data.ciphertext;
      } catch (e) {
        alert("Alice failed to encrypt message: " + e.message);
        return;
      }

      // Step 2: Display ciphertext and animate
      document.getElementById('encryptedMessage').textContent = ciphertext;
      setKeyBoxActive(true);

      animateEncryptedBox(
        document.getElementById('alice-chat'),
        function() { // Animation to center is complete
          setTimeout(() => {
            // The backend forwards the message to Bob. The frontend just needs to update the UI.
            // We use the original 'text' variable.
            animateEncryptedBoxDisappear(
              document.getElementById('bob-chat'),
              document.getElementById('alice-chat'),
              function() {
                setKeyBoxActive(false);
                addMessage(document.getElementById('bob-messages'), text, 'received');
                document.getElementById('encryptedMessage').textContent = '';
              }
            );
          }, 2000); // stays in center for 2s
        }
      );
    };

    // Bob sends to his own URL, which then forwards to Alice
    document.getElementById('bob-send').onclick = async function() {
      const input = document.getElementById('bob-input');
      const text = input.value.trim();
      if (!text) return;

      addMessage(document.getElementById('bob-messages'), text, 'sent');
      input.value = '';

      // Step 1: Bob encrypts the message
      let ciphertext = '';
      try {
        const resp = await fetch(`${bobUrl}/send_encrypted_message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key_handle: keyHandle, message: text })
        });
        const data = await resp.json();
        if (!resp.ok || data.error) throw new Error(data.error || "Failed to encrypt");
        ciphertext = data.ciphertext;
      } catch (e) {
        alert("Bob failed to encrypt message: " + e.message);
        return;
      }

      // Step 2: Display ciphertext and animate
      document.getElementById('encryptedMessage').textContent = ciphertext;
      setKeyBoxActive(true);

      animateEncryptedBox(
        document.getElementById('bob-chat'),
        function() { // Animation to center is complete
          setTimeout(() => {
            // The backend forwards the message to Alice. The frontend just needs to update the UI.
            animateEncryptedBoxDisappear(
              document.getElementById('alice-chat'),
              document.getElementById('bob-chat'),
              function() {
                setKeyBoxActive(false);
                addMessage(document.getElementById('alice-messages'), text, 'received');
                document.getElementById('encryptedMessage').textContent = '';
              }
            );
          }, 2000); // stays in center for 2s
        }
      );
    };
  }
});