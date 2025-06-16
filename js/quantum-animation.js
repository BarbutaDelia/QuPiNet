document.addEventListener('DOMContentLoaded', function() {
    // Define colors for values 0, 1 (only red and green now)
    const colors = ['#ff9999', '#90EE90']; // Light Red, Light Green
    const colorNames = ['red', 'green'];
    
    // Generate 32 random values (0 or 1) for the simulation - binary only
    const quantumValues = Array.from({length: 32}, () => Math.floor(Math.random() * 2));
    
    // Store whether Bob correctly reads each value
    const bobReadings = Array(32).fill(null);
    
    // DOM elements
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const speedSlider = document.getElementById('speed-slider');
    const aliceValue = document.getElementById('alice-value');
    const bobValue = document.getElementById('bob-value');
    const valuesSent = document.getElementById('values-sent');
    const valuesReceived = document.getElementById('values-received');
    const aliceBits = document.getElementById('alice-bits');
    const bobBits = document.getElementById('bob-bits');
    const quantumChannel = document.querySelector('.quantum-channel');
    
    // Add barriers to the quantum channel
    const aliceBarrier = document.createElement('div');
    aliceBarrier.className = 'barrier alice-barrier';
    quantumChannel.appendChild(aliceBarrier);
    
    const bobBarrier = document.createElement('div');
    bobBarrier.className = 'barrier bob-barrier';
    quantumChannel.appendChild(bobBarrier);
    
    // Animation state
    let currentIndex = 0;
    let animationInProgress = false;
    let animationSpeed = 5;
    let transmissionActive = false;
    let transmissionTimeoutId = null;
    
    // Initialize bit arrays display
    initBitArrays();
    
    // Event listeners
    startBtn.addEventListener('click', startTransmission);
    resetBtn.addEventListener('click', resetSimulation);
    speedSlider.addEventListener('input', updateSpeed);
    
    function initBitArrays() {
        // Clear previous bits
        aliceBits.innerHTML = '';
        bobBits.innerHTML = '';
        
        // Create bits for Alice
        for (let i = 0; i < quantumValues.length; i++) {
            const bit = document.createElement('div');
            bit.className = 'bit';
            bit.id = `alice-bit-${i}`;
            bit.style.backgroundColor = i === 0 ? colors[quantumValues[i]] : '#fff';
            aliceBits.appendChild(bit);
        }
        
        // Create placeholder bits for Bob
        for (let i = 0; i < quantumValues.length; i++) {
            const bit = document.createElement('div');
            bit.className = 'bit';
            bit.id = `bob-bit-${i}`;
            bobBits.appendChild(bit);
        }
    }
    
    function updateSpeed() {
        animationSpeed = parseInt(speedSlider.value);
    }
    
    function startTransmission() {
        if (currentIndex >= quantumValues.length || transmissionActive) {
            return;
        }
        
        transmissionActive = true;
        startBtn.disabled = true;
        
        // Start the transmission process
        transmitNextValue();
    }
    
    function transmitNextValue() {
        if (currentIndex >= quantumValues.length || !transmissionActive) {
            transmissionActive = false;
            return;
        }
        
        // Get current value to transmit
        const value = quantumValues[currentIndex];
        
        // Update Alice's display
        aliceValue.textContent = `${value} (${colorNames[value]})`;
        aliceValue.style.color = colors[value];
        
        // Create the photon
        const photon = document.createElement('div');
        photon.className = 'photon';
        photon.style.backgroundColor = colors[value];
        photon.dataset.originalColor = colors[value];
        photon.dataset.value = value;
        quantumChannel.appendChild(photon);
        
        // Calculate animation duration based on speed
        const duration = 2000 / animationSpeed;
        const aliceBarrierTime = duration * 0.15; // 15% of total duration to reach Alice's barrier
        const bobBarrierTime = duration * 0.85;   // 85% of total duration to reach Bob's barrier
        
        // First animation - from Alice to Alice's barrier
        setTimeout(() => {
            photon.style.left = '15%';
            photon.style.transition = `left ${aliceBarrierTime}ms linear`;
            
            // Second animation - from Alice's barrier to Bob's barrier (encrypted - gray)
            setTimeout(() => {
                photon.style.backgroundColor = '#888'; // Gray for encrypted transmission
                photon.style.left = '85%';
                photon.style.transition = `left ${bobBarrierTime - aliceBarrierTime}ms linear`;
                
                // Third animation - from Bob's barrier to Bob
                setTimeout(() => {
                    // Determine if Bob reads the value correctly (80% chance)
                    const bobReadsCorrectly = Math.random() > 0.2;
                    bobReadings[currentIndex] = bobReadsCorrectly;
                    
                    if (bobReadsCorrectly) {
                        // Bob reads correctly
                        photon.style.backgroundColor = photon.dataset.originalColor;
                        photon.style.left = 'calc(100% - 12px)';
                        photon.style.transition = `left ${duration - bobBarrierTime}ms linear`;
                        
                        setTimeout(() => {
                            completeTransmission(value, true);
                        }, duration - bobBarrierTime + 50);
                    } else {
                        // Bob reads incorrectly - flip the bit (0->1 or 1->0)
                        const incorrectValue = 1 - parseInt(photon.dataset.value); // Flips 0 to 1 or 1 to 0
                        
                        photon.style.backgroundColor = colors[incorrectValue];
                        photon.style.left = 'calc(100% - 12px)';
                        photon.style.transition = `left ${duration - bobBarrierTime}ms linear`;
                        
                        setTimeout(() => {
                            completeTransmission(incorrectValue, false);
                        }, duration - bobBarrierTime + 50);
                    }
                }, bobBarrierTime - aliceBarrierTime + 50);
            }, aliceBarrierTime + 50);
        }, 100);
    }
    
    function completeTransmission(receivedValue, isCorrect) {
        // Update Bob's display
        bobValue.textContent = `${receivedValue} (${colorNames[receivedValue]})`;
        bobValue.style.color = colors[receivedValue];
        
        // Update Bob's bit array
        const bobBit = document.getElementById(`bob-bit-${currentIndex}`);
        bobBit.style.backgroundColor = colors[receivedValue];
        
        // If Bob misread, add the X indicator
        if (!isCorrect) {
            bobBit.classList.add('misread');
        }
        
        // Remove the photon
        const photons = document.querySelectorAll('.photon');
        photons.forEach(photon => photon.remove());
        
        // Update counters
        currentIndex++;
        valuesSent.textContent = currentIndex;
        valuesReceived.textContent = currentIndex;
        
        // Highlight next bit to send
        if (currentIndex < quantumValues.length) {
            const nextBit = document.getElementById(`alice-bit-${currentIndex}`);
            nextBit.style.backgroundColor = colors[quantumValues[currentIndex]];
            
            // Schedule next transmission with 1-second delay (adjusted by speed)
            const delayTime = 1000 / (animationSpeed / 5);
            transmissionTimeoutId = setTimeout(transmitNextValue, delayTime);
        } else {
            // All values transmitted
            transmissionActive = false;
            startBtn.disabled = false;
            
            // Show summary
            console.log(`Transmission complete: Bob correctly read ${bobReadings.filter(Boolean).length}/${quantumValues.length} values`);
        }
    }
    
    function resetSimulation() {
        // Stop any ongoing transmission
        transmissionActive = false;
        if (transmissionTimeoutId) {
            clearTimeout(transmissionTimeoutId);
            transmissionTimeoutId = null;
        }
        
        // Reset counters and state
        currentIndex = 0;
        animationInProgress = false;
        
        // Reset displays
        aliceValue.textContent = '-';
        aliceValue.style.color = 'initial';
        bobValue.textContent = '-';
        bobValue.style.color = 'initial';
        valuesSent.textContent = '0';
        valuesReceived.textContent = '0';
        
        // Reset readings
        for (let i = 0; i < bobReadings.length; i++) {
            bobReadings[i] = null;
        }
        
        // Remove any photons in the channel
        const photons = document.querySelectorAll('.photon');
        photons.forEach(photon => photon.remove());
        
        // Reset bit arrays
        initBitArrays();
        
        // Enable start button
        startBtn.disabled = false;
    }
});