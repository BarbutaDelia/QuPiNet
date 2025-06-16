document.addEventListener('DOMContentLoaded', function() {
    // Define intense colors for our quantum states
    const BLUE = '#4d4dff';
    const GREEN = '#4dff4d';
    const RED = '#ff4d4d';
    
    // Define basis-value to color mapping (new logic)
    function getColorForBasisAndValue(basis, value) {
        if (basis === 0) { // + basis
            return value === 0 ? BLUE : GREEN;
        } else { // X basis
            return value === 0 ? BLUE : RED;
        }
    }
    
    // Get color name for display
    function getColorName(color) {
        if (color === BLUE) return 'blue';
        if (color === GREEN) return 'green';
        if (color === RED) return 'red';
        return 'unknown';
    }
    
    // Remove the old colors array and colorNames array since we're using functions now
    // const colors = ['#ff4d4d', '#4dff4d', '#4d4dff']; // Old approach
    // const colorNames = ['red', 'green', 'blue']; // Old approach
    
    const basisSymbols = ['|', 'X']; // Vertical and diagonal bases
    
    // Generate 8 random values (0 or 1 only now, not 0,1,2) for the simulation
    const quantumValues = Array.from({length: 8}, () => Math.floor(Math.random() * 2)); // Only 0 or 1
    
    // Generate random basis for Alice and Bob for each bit
    const aliceBases = Array.from({length: 8}, () => Math.floor(Math.random() * 2)); // Changed from 32 to 8
    const bobBases = Array.from({length: 8}, () => Math.floor(Math.random() * 2)); // Changed from 32 to 8
    
    // Store whether Bob correctly reads each value
    const bobReadings = Array(8).fill(null); // Changed from 32 to 8
    
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
    aliceBarrier.className = 'barrier alice-barrier plus-barrier'; // Change to plus-barrier
    quantumChannel.appendChild(aliceBarrier);
    
    const bobBarrier = document.createElement('div');
    bobBarrier.className = 'barrier bob-barrier plus-barrier'; // Change to plus-barrier
    quantumChannel.appendChild(bobBarrier);
    
    // Animation state
    let currentIndex = 0;
    let animationInProgress = false;
    let transmissionActive = false;
    let transmissionTimeoutId = null;
    
    // Initialize bit arrays display
    initBitArrays();
    
    // Event listeners
    startBtn.addEventListener('click', startTransmission);
    resetBtn.addEventListener('click', resetSimulation);
    speedSlider.addEventListener('input', updateSpeed);
    
    // Add to the existing DOM elements
    const speedRunBtn = document.getElementById('speed-run-btn');
    
    // Add to existing event listeners
    speedRunBtn.addEventListener('click', speedRun);
    
    // Add near the top with other state variables
    let basisMismatchPopupShown = false; // Track if we've shown the popup
    let qubitPassMismatchPopupShown = false; // Track if we've shown the second popup
    
    // Add this function to show the popup
    function showBasisMismatchPopup(callback) {
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        
        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'popup-container';
        
        // Add content
        popup.innerHTML = `
            <div class="popup-header">
                <h4>Measurement Bases Don't Match!</h4>
            </div>
            <div class="popup-body">
                <p>Oops! Alice and Bob have chosen different measurement bases for this qubit.</p>
                <p>When measurement bases don't match, quantum information cannot be reliably transmitted.</p>
                <p>This is a key concept in quantum key distribution: only matching bases produce reliable results!</p>
            </div>
            <div class="popup-footer">
                <button id="popup-ok-btn" class="btn btn-primary">OK, I understand</button>
            </div>
        `;
        
        // Add to DOM
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // Add event listener to OK button
        document.getElementById('popup-ok-btn').addEventListener('click', function() {
            // Remove popup
            document.body.removeChild(overlay);
            
            // Execute callback to resume animation
            if (callback) callback();
        });
    }
    
    // Add this function to show the second popup
    function showQubitPassMismatchPopup(callback) {
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        
        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'popup-container';
        
        // Add content
        popup.innerHTML = `
            <div class="popup-header">
                <h4>Qubit Survived Mismatched Bases!</h4>
            </div>
            <div class="popup-body">
                <p>Interesting! Even though Alice and Bob used different measurement bases, this qubit wasn't completely lost.</p>
                <p>When measurement bases don't match, quantum mechanics gives us a 50% chance that:</p>
                <ul>
                    <li>The qubit is completely lost (quantum state collapses unpredictably)</li>
                    <li>The qubit passes through but with an uncertain correlation to the original state (what we see here)</li>
                </ul>
                <p>This quantum uncertainty is fundamental to the security of quantum key distribution!</p>
            </div>
            <div class="popup-footer">
                <button id="popup-ok-btn" class="btn btn-primary">OK, I understand</button>
            </div>
        `;
        
        // Add to DOM
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // Add event listener to OK button
        document.getElementById('popup-ok-btn').addEventListener('click', function() {
            // Remove popup
            document.body.removeChild(overlay);
            
            // Execute callback to resume animation
            if (callback) callback();
        });
    }
    
    function initBitArrays() {
        // Clear previous bits
        aliceBits.innerHTML = '';
        bobBits.innerHTML = '';
        
        // Create bits for Alice - all white initially
        for (let i = 0; i < quantumValues.length; i++) {
            const bit = document.createElement('div');
            bit.className = 'bit';
            bit.id = `alice-bit-${i}`;
            bit.style.backgroundColor = '#fff'; // All bits start white
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
        // If a simulation has already completed, reset before starting a new one
        if (currentIndex >= quantumValues.length) {
            resetSimulation();
            // Small delay to ensure reset is complete before starting
            setTimeout(() => {
                transmissionActive = true;
                startBtn.disabled = true;
                transmitNextValue();
            }, 100);
            return;
        }
        
        // Don't start if a transmission is already active
        if (transmissionActive) {
            return;
        }
        
        transmissionActive = true;
        startBtn.disabled = true;
        
        // Start the transmission process
        transmitNextValue();
    }
    
    function transmitNextValue() {
        // Existing initial checks
        if (currentIndex >= quantumValues.length || !transmissionActive) {
            transmissionActive = false;
            startBtn.disabled = false;
            return;
        }
        
        console.log(`Starting animation for bit ${currentIndex}`);
        
        // Get current value to transmit
        const value = quantumValues[currentIndex];
        
        // Get current bases for Alice and Bob
        const aliceBasis = aliceBases[currentIndex];
        const bobBasis = bobBases[currentIndex];
        const baseMatch = aliceBasis === bobBasis;
        
        // Get color based on Alice's basis and value
        const aliceColor = getColorForBasisAndValue(aliceBasis, value);
        const aliceColorName = getColorName(aliceColor);
        
        // STEP 1: First update barriers to show the basis selection
        updateBarrier(aliceBarrier, aliceBasis);
        updateBarrier(bobBarrier, bobBasis);
        
        // Get animation speed
        const animSpeed = Math.max(1, speedSlider ? parseInt(speedSlider.value) : 5);
        
        // STEP 2: After a delay, reveal Alice's bit value
        setTimeout(() => {
            // Highlight current bit in Alice's array with the appropriate color
            const currentBit = document.getElementById(`alice-bit-${currentIndex}`);
            if (currentBit) {
                currentBit.style.backgroundColor = aliceColor;
            }
            
            // Update Alice's display with her selected value
            aliceValue.textContent = aliceColorName;
            aliceValue.style.color = aliceColor;
            
            // STEP 3: After another delay, send the photon
            setTimeout(() => {
                // Create the photon with Alice's color
                const photon = document.createElement('div');
                photon.className = 'photon';
                photon.style.backgroundColor = aliceColor;
                photon.dataset.originalColor = aliceColor;
                photon.dataset.value = value;
                photon.style.left = '0%'; // Start at the left edge of the channel
                quantumChannel.appendChild(photon);
                
                // Calculate animation duration based on speed
                const duration = 2000 / animSpeed;
                const aliceBarrierTime = Math.max(100, duration * 0.15); // Minimum 100ms
                const bobBarrierTime = Math.max(500, duration * 0.85);   // Minimum 500ms
                
                console.log(`Animation timing: duration=${duration}, alice=${aliceBarrierTime}, bob=${bobBarrierTime}`);
                
                // First step: Move from start to Alice's barrier with color visible
                setTimeout(() => {
                    photon.style.left = '15%';
                    photon.style.transition = `left ${aliceBarrierTime}ms linear`;
                    
                    // Second step: Move to Bob's barrier (encrypted)
                    setTimeout(() => {
                        photon.style.backgroundColor = '#444';
                        photon.style.left = '85%';
                        photon.style.transition = `left ${bobBarrierTime - aliceBarrierTime}ms linear`;
                        
                        // Check if we need to show the popup
                        const continueToMeasurement = () => {
                            // When bases don't match, 50% chance the qubit is completely lost
                            const qubitLost = !baseMatch && Math.random() < 0.5;
                            
                            if (!baseMatch && !qubitLost && !qubitPassMismatchPopupShown) {
                                // First time bases don't match but qubit passes through
                                qubitPassMismatchPopupShown = true;
                                
                                // Start the animation of qubit passing through
                                photon.style.backgroundColor = photon.dataset.originalColor;
                                photon.style.left = 'calc(100% - 12px)';
                                photon.style.transition = `left ${duration - bobBarrierTime}ms linear`;
                                
                                // After qubit reaches Bob, show the popup
                                setTimeout(() => {
                                    showQubitPassMismatchPopup(() => {
                                        // After popup is dismissed, complete the transmission
                                        console.log(`Completing transmission for bit ${currentIndex} - survived despite mismatched bases`);
                                        completeTransmission(value, false, baseMatch);
                                    });
                                }, Math.max(100, duration - bobBarrierTime));
                            }
                            else if (qubitLost) {
                                // Create dropping/fading animation for lost qubit
                                photon.style.backgroundColor = '#777';
                                photon.style.left = 'calc(100% - 50px)'; // Stop short of Bob
                                photon.style.transition = `left ${duration - bobBarrierTime}ms linear`;
                                
                                // After a short delay, start the dropping animation
                                setTimeout(() => {
                                    photon.style.opacity = '0';
                                    photon.style.transform = 'translateY(50px)';
                                    photon.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-in';
                                    
                                    // Add particle effect for dramatic quantum effect
                                    createQuantumParticles(photon);
                                    
                                    // Complete the transmission after animation
                                    setTimeout(() => {
                                        console.log(`Completing transmission - qubit lost due to basis mismatch`);
                                        completeTransmission(-2, false, baseMatch); // -2 indicates completely lost qubit
                                    }, 600);
                                }, Math.max(50, (duration - bobBarrierTime) / 2));
                            } 
                            else {
                                // Normal case - photon reaches Bob
                                photon.style.backgroundColor = photon.dataset.originalColor;
                                photon.style.left = 'calc(100% - 12px)';
                                photon.style.transition = `left ${duration - bobBarrierTime}ms linear`;
                                
                                // Complete the transmission
                                setTimeout(() => {
                                    console.log(`Completing transmission for bit ${currentIndex}`);
                                    if (baseMatch) {
                                        completeTransmission(value, true, baseMatch);
                                    } else {
                                        completeTransmission(value, false, baseMatch);
                                    }
                                }, Math.max(100, duration - bobBarrierTime));
                            }
                        };
                        
                        setTimeout(() => {
                            // Check if bases don't match and we haven't shown the popup yet
                            if (!baseMatch && !basisMismatchPopupShown) {
                                basisMismatchPopupShown = true;
                                showBasisMismatchPopup(continueToMeasurement);
                            } else {
                                continueToMeasurement();
                            }
                        }, Math.max(100, bobBarrierTime - aliceBarrierTime));
                        
                    }, Math.max(100, aliceBarrierTime));
                    
                }, 50); // Short delay to ensure the photon is visible at the start
                
            }, 800); // Wait 800ms after showing Alice's value before sending the photon
        }, 800); // Wait 800ms after showing bases before revealing Alice's value
    }
    
    // Function to update barrier appearance based on the basis
    function updateBarrier(barrier, basis) {
        if (basis === 0) { // Plus basis
            barrier.className = barrier.className.replace('x-barrier', 'plus-barrier');
        } else { // X basis
            barrier.className = barrier.className.replace('plus-barrier', 'x-barrier');
        }
    }
    
    // Create quantum particle effect function (add near other animation functions)
    function createQuantumParticles(photon) {
        // Get position of the photon
        const rect = photon.getBoundingClientRect();
        const channelRect = quantumChannel.getBoundingClientRect();
        
        // Create 8 particles that disperse in different directions
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'quantum-particle';
            document.body.appendChild(particle);
            
            // Position particle at photon's position
            particle.style.left = `${rect.left + rect.width/2}px`;
            particle.style.top = `${rect.top + rect.height/2}px`;
            
            // Calculate random direction
            const angle = (i / 8) * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            
            // Animate particle
            setTimeout(() => {
                particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
                particle.style.opacity = '0';
            }, 10);
            
            // Remove particle after animation
            setTimeout(() => {
                particle.remove();
            }, 600);
        }
    }
    
    // Update completeTransmission function to remove dashed borders
    function completeTransmission(receivedValue, isCorrect, baseMatch) {
        // Check if the function is called multiple times or out of range
        if (currentIndex >= quantumValues.length || !transmissionActive) {
            console.log("Transmission complete or inactive, stopping");
            return;
        }

        console.log(`Processing bit ${currentIndex} result`);

        // Get current values
        const value = quantumValues[currentIndex];
        const aliceBasis = aliceBases[currentIndex];
        const bobBasis = bobBases[currentIndex];
        
        // Update Bob's display
        if (receivedValue === -2) {
            // Completely lost qubit
            bobValue.textContent = 'lost';
            bobValue.style.color = '#ff6b6b'; // Different color for lost vs uncertain
        }
        else {
            // Show Alice's original color, even for mismatched bases
            const bobColor = getColorForBasisAndValue(aliceBasis, value);
            const bobColorName = getColorName(bobColor);
            bobValue.textContent = bobColorName;
            bobValue.style.color = bobColor;
        }
        
        // Update Bob's bit array
        const bobBit = document.getElementById(`bob-bit-${currentIndex}`);
        
        if (bobBit) {
            if (receivedValue === -2) {
                // Lost qubit - show as red with X (keep solid border)
                bobBit.style.backgroundColor = '#ffdddd';
                bobBit.style.border = "2px solid #ff6b6b"; // Keep solid border
                bobBit.innerHTML = '<span style="color:#ff6b6b; font-weight:bold;">✗</span>';
                bobBit.style.display = 'flex';
                bobBit.style.justifyContent = 'center';
                bobBit.style.alignItems = 'center';
            }
            else {
                // Always show Alice's original color in Bob's bit with solid border
                const aliceColor = getColorForBasisAndValue(aliceBasis, value);
                bobBit.style.backgroundColor = aliceColor;
                bobBit.style.border = "1px solid #333"; // CHANGED: Always use solid border
            }
            
            // REMOVED: No longer adding dashed borders for mismatched bases
        }
        
        // Remove the photon
        const photons = document.querySelectorAll('.photon');
        photons.forEach(photon => photon.remove());
        
        // Update counters
        currentIndex++;
        valuesSent.textContent = currentIndex;
        valuesReceived.textContent = currentIndex;
        
        console.log(`Completed bit ${currentIndex-1}, moving to next bit`);
        
        // Schedule next transmission with a clean, reliable approach
        if (currentIndex < quantumValues.length && transmissionActive) {
            // Clear any existing timeouts to prevent duplicate calls
            if (transmissionTimeoutId) {
                clearTimeout(transmissionTimeoutId);
            }
            
            // Use a fixed delay for reliability
            const delayTime = 1000;
            console.log(`Scheduling next bit in ${delayTime}ms`);
            
            transmissionTimeoutId = setTimeout(() => {
                if (transmissionActive) {
                    console.log(`Starting transmission for bit ${currentIndex}`);
                    transmitNextValue();
                }
            }, delayTime);
        } else {
            // All values transmitted
            console.log("All bits transmitted, finishing up");
            transmissionActive = false;
            startBtn.disabled = false;
            speedRunBtn.disabled = false;
            
            // Show summary
            const baseMatches = aliceBases.map((basis, i) => basis === bobBases[i]).filter(Boolean).length;
            console.log(`Transmission complete: ${baseMatches} bits had matching bases (${Math.round(baseMatches/quantumValues.length*100)}%)`);
            
            // Start key composition animation after a short delay
            setTimeout(() => {
                showKeyComposition();
            }, 1000);
        }
}
    
    // Add the key composition animation function
    function showKeyComposition() {
        // Make sure we start with a clean slate
        resetKeyCompositionContainer();
        
        // Show the key composition container
        const keyCompositionContainer = document.getElementById('key-composition-container');
        keyCompositionContainer.style.display = 'block';
        
        // Get containers
        const aliceFinalBits = document.getElementById('alice-final-bits');
        const aliceFinalBases = document.getElementById('alice-final-bases');
        const bobFinalBases = document.getElementById('bob-final-bases');
        const finalKeyBits = document.getElementById('final-key-bits');
        
        const finalKey = [];
        
        // Clear previous contents to ensure clean start
        aliceFinalBits.innerHTML = '';
        aliceFinalBases.innerHTML = '';
        bobFinalBases.innerHTML = '';
        finalKeyBits.innerHTML = '';
        
        // Create a 4x2 grid of placeholders in each container
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                const i = row * 4 + col; // Convert 2D position to 1D index
                
                // Create placeholders with explicit grid positioning
                const alicePlaceholder = document.createElement('div');
                alicePlaceholder.className = 'bit-placeholder';
                alicePlaceholder.dataset.index = i;
                alicePlaceholder.style.gridRow = row + 1;
                alicePlaceholder.style.gridColumn = col + 1;
                aliceFinalBits.appendChild(alicePlaceholder);
                
                const aliceBasisPlaceholder = document.createElement('div');
                aliceBasisPlaceholder.className = 'bit-placeholder';
                aliceBasisPlaceholder.dataset.index = i;
                aliceBasisPlaceholder.style.gridRow = row + 1;
                aliceBasisPlaceholder.style.gridColumn = col + 1;
                aliceFinalBases.appendChild(aliceBasisPlaceholder);
                
                const bobBasisPlaceholder = document.createElement('div');
                bobBasisPlaceholder.className = 'bit-placeholder';
                bobBasisPlaceholder.dataset.index = i;
                bobBasisPlaceholder.style.gridRow = row + 1;
                bobBasisPlaceholder.style.gridColumn = col + 1;
                bobFinalBases.appendChild(bobBasisPlaceholder);
                
                const keyPlaceholder = document.createElement('div');
                keyPlaceholder.className = 'bit-placeholder';
                keyPlaceholder.dataset.index = i;
                keyPlaceholder.style.gridRow = row + 1;
                keyPlaceholder.style.gridColumn = col + 1;
                finalKeyBits.appendChild(keyPlaceholder);
            }
        }
        
        // Process all bits one by one with animation - increase the delay
        for (let i = 0; i < quantumValues.length; i++) {
            const index = i; // Store the current index
            
            // Use setTimeout to create a sequential animation with longer delay
            setTimeout(() => {
                // Get the value and bases
                const value = quantumValues[index];
                const aliceBasis = aliceBases[index];
                const bobBasis = bobBases[index];
                
                // Get Alice's color based on her basis and value
                const aliceColor = getColorForBasisAndValue(aliceBasis, value);
                
                // Get placeholders
                const alicePlaceholder = aliceFinalBits.querySelector(`[data-index="${index}"]`);
                const aliceBasisPlaceholder = aliceFinalBases.querySelector(`[data-index="${index}"]`);
                const bobBasisPlaceholder = bobFinalBases.querySelector(`[data-index="${index}"]`);
                const keyPlaceholder = finalKeyBits.querySelector(`[data-index="${index}"]`);
                
                // Create Alice's bit (value) with the correct color
                const aliceBit = document.createElement('div');
                aliceBit.className = 'bit bit-appear';
                aliceBit.style.backgroundColor = aliceColor;
                if (alicePlaceholder) alicePlaceholder.appendChild(aliceBit);
                
                // Create basis representations
                const aliceBasisDiv = document.createElement('div');
                aliceBasisDiv.className = 'basis-symbol bit-appear';
                
                const bobBasisDiv = document.createElement('div');
                bobBasisDiv.className = 'basis-symbol bit-appear';
                
                // Check if bases match
                const baseMatch = aliceBasis === bobBasis;
                
                // Add basis symbols without colored backgrounds
                if (aliceBasis === 0) {
                    // Plus symbol for basis 0
                    aliceBasisDiv.innerHTML = '<span class="plus-symbol">+</span>';
                } else {
                    // X symbol for basis 1
                    aliceBasisDiv.innerHTML = '<span class="x-symbol">✕</span>';
                }
                
                if (bobBasis === 0) {
                    // Plus symbol for basis 0
                    bobBasisDiv.innerHTML = '<span class="plus-symbol">+</span>';
                } else {
                    // X symbol for basis 1
                    bobBasisDiv.innerHTML = '<span class="x-symbol">✕</span>';
                }
                
                // Add borders to indicate match/mismatch
                if (baseMatch) {
                    // For matched bases, use a green border
                    aliceBasisDiv.style.borderColor = '#4caf50';
                    bobBasisDiv.style.borderColor = '#4caf50';
                    
                    // For matching bases, add to final key with Alice's color
                    const keyBit = document.createElement('div');
                    keyBit.className = 'bit';
                    keyBit.style.backgroundColor = aliceColor;
                    
                    // Add to final key array
                    finalKey.push(value);
                    
                    // Delay adding final key bit for visual effect
                    setTimeout(() => {
                        keyBit.classList.add('bit-appear', 'bit-highlight');
                        if (keyPlaceholder) keyPlaceholder.appendChild(keyBit);
                    }, 300);
                } else {
                    // For mismatched bases, use a red border
                    aliceBasisDiv.style.borderColor = '#f44336';
                    bobBasisDiv.style.borderColor = '#f44336';
                    
                    // Add discarded bit marker in final key
                    setTimeout(() => {
                        const keyBit = document.createElement('div');
                        keyBit.className = 'bit bit-appear';
                        keyBit.style.backgroundColor = '#eee'; // Light gray
                        keyBit.style.border = '1px dashed #999';
                        keyBit.innerHTML = '✕';
                        keyBit.style.color = '#999';
                        keyBit.style.textAlign = 'center';
                        keyBit.style.lineHeight = '30px'; // Match the height
                        if (keyPlaceholder) keyPlaceholder.appendChild(keyBit);
                    }, 300);
                }
                
                // Add the bits to their containers
                if (aliceBasisPlaceholder) aliceBasisPlaceholder.appendChild(aliceBasisDiv);
                if (bobBasisPlaceholder) bobBasisPlaceholder.appendChild(bobBasisDiv);
                
            }, i * 500); 
        }
        
        // Show the final key after all bits have been processed
        setTimeout(() => {
            showFinalKey(finalKey);
        }, quantumValues.length * 500); 
    }
    
    function showFinalKey(finalKey) {
        // Convert the key to a readable format
        const keyString = finalKey.join('');
        const secureKeyElement = document.getElementById('secure-key');
        
        // Display key characters one by one
        let displayedChars = 0;
        const keyInterval = setInterval(() => {
            if (displayedChars >= keyString.length) {
                clearInterval(keyInterval);
                
                // Add completion message
                const keySuccessDiv = document.createElement('div');
                keySuccessDiv.className = 'alert alert-success mt-3';
                keySuccessDiv.innerHTML = `
                    <strong>Secure Key Established!</strong> 
                    <p>Alice and Bob now share a ${keyString.length}-value secret key.</p>
                    <p>This key is secure because any eavesdropper would disturb the quantum states during measurement.</p>
                `;
                document.getElementById('key-composition-container').appendChild(keySuccessDiv);
                return;
            }
            
            secureKeyElement.textContent = keyString.substring(0, displayedChars + 1);
            displayedChars++;
        }, 150);
    }
    
    function resetSimulation() {
        basisMismatchPopupShown = false; // Reset first popup flag
        qubitPassMismatchPopupShown = false; // Reset second popup flag
        
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
        
        // Reset barriers to plus
        aliceBarrier.className = 'barrier alice-barrier plus-barrier';
        bobBarrier.className = 'barrier bob-barrier plus-barrier';
        
        // Regenerate random values and bases
        for (let i = 0; i < quantumValues.length; i++) {
            quantumValues[i] = Math.floor(Math.random() * 2); // Now 0 or 1 only
            aliceBases[i] = Math.floor(Math.random() * 2);
            bobBases[i] = Math.floor(Math.random() * 2);
            bobReadings[i] = null;
        }
        
        // Remove any photons in the channel
        const photons = document.querySelectorAll('.photon');
        photons.forEach(photon => photon.remove());
        
        // Reset bit arrays
        initBitArrays();
        
        // Enable start button
        startBtn.disabled = false;
        speedRunBtn.disabled = false;
        
        // Reset the key composition container
        resetKeyCompositionContainer();
    }
    
    function resetKeyCompositionContainer() {
        // Get the key composition container
        const keyCompositionContainer = document.getElementById('key-composition-container');
        
        // Hide the container
        keyCompositionContainer.style.display = 'none';
        
        // Clear all child elements
        keyCompositionContainer.innerHTML = `
            <h3 class="text-center mb-3">Key Composition</h3>
            <div class="row">
                <div class="col-md-12">
                    <div class="alert alert-info mb-3">
                        <strong>Key Composition:</strong> Only bits where Alice and Bob used the same measurement basis contribute to the final secure key.
                    </div>
                </div>
            </div>
            <div class="row text-center">
                <div class="col-md-3">
                    <h5>Alice's Values</h5>
                    <div class="bit-array d-flex justify-content-center" id="alice-final-bits"></div>
                </div>
                <div class="col-md-3">
                    <h5>Alice's Bases</h5>
                    <div class="bit-array d-flex justify-content-center" id="alice-final-bases"></div>
                </div>
                <div class="col-md-3">
                    <h5>Bob's Bases</h5>
                    <div class="bit-array d-flex justify-content-center" id="bob-final-bases"></div>
                </div>
                <div class="col-md-3">
                    <h5>Final Key</h5>
                    <div class="bit-array d-flex justify-content-center" id="final-key-bits"></div>
                </div>
            </div>
            <div class="text-center mt-4">
                <h5>Secure Key: <span id="secure-key" class="monospace"></span></h5>
                <p class="mt-3">This key can now be used for secure encryption between Alice and Bob.</p>
            </div>
        `;
        
        // Remove any alerts or additional messages
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => alert.remove());
    }
    
    // Update the speedRun function to properly reset messages
    function speedRun() {
        if (transmissionActive) {
            return;
        }
        
        // Reset if needed
        if (currentIndex > 0) {
            resetSimulation();
        } else {
            // Make sure messages are reset even if we don't need a full reset
            resetKeyCompositionContainer();
        }
        
        transmissionActive = true;
        startBtn.disabled = true;
        speedRunBtn.disabled = true;
        
        // Skip animations and process all transmissions quickly
        processAllTransmissionsQuickly();
    }
    
    function processAllTransmissionsQuickly() {
        // Process all bits at once
        for (let i = 0; i < quantumValues.length; i++) {
            const value = quantumValues[i];
            const aliceBasis = aliceBases[i];
            const bobBasis = bobBases[i];
            const baseMatch = aliceBasis === bobBasis;
            
            // Update barriers visually
            if (i === quantumValues.length - 1) {
                updateBarrier(aliceBarrier, aliceBasis);
                updateBarrier(bobBarrier, bobBasis);
            }
            
            // Update Alice's bit
            const aliceBit = document.getElementById(`alice-bit-${i}`);
            const aliceColor = getColorForBasisAndValue(aliceBasis, value);
            aliceBit.style.backgroundColor = aliceColor;
            aliceBit.style.border = "1px solid #333"; // ADDED: Ensure solid border
            
            // Update Bob's bit based on the basis match
            const bobBit = document.getElementById(`bob-bit-${i}`);
            
            if (baseMatch) {
                // Base match - Bob reads correctly
                bobBit.style.backgroundColor = aliceColor;
                bobBit.style.border = "1px solid #333"; // ADDED: Ensure solid border
            } else {
                // Base mismatch - Bob either gets uncertain value or loses qubit entirely
                const qubitLost = Math.random() < 0.5;
                
                if (qubitLost) {
                    // Lost qubit - show as red with X
                    bobBit.style.backgroundColor = '#ffdddd';
                    bobBit.style.border = "2px solid #ff6b6b"; // CHANGED: Keep solid border
                    bobBit.innerHTML = '<span style="color:#ff6b6b; font-weight:bold;">✗</span>';
                    bobBit.style.display = 'flex';
                    bobBit.style.justifyContent = 'center';
                    bobBit.style.alignItems = 'center';
                } else {
                    // Show Alice's original color instead of gray for uncertain values
                    bobBit.style.backgroundColor = aliceColor;
                    bobBit.style.border = "1px solid #333"; // CHANGED: Use solid border instead of dashed
                    // REMOVED: No longer adding dashed border to Alice's bit
                }
            }
        }
        
        // Update currentIndex to reflect all bits have been processed
        currentIndex = quantumValues.length;
        
        // Update the counters
        valuesSent.textContent = currentIndex;
        valuesReceived.textContent = currentIndex;
        
        // Update final display values
        const lastIndex = currentIndex-1;
        const aliceColor = getColorForBasisAndValue(aliceBases[lastIndex], quantumValues[lastIndex]);
        aliceValue.textContent = getColorName(aliceColor);
        aliceValue.style.color = aliceColor;
        
        if (aliceBases[lastIndex] === bobBases[lastIndex]) {
            bobValue.textContent = getColorName(aliceColor);
            bobValue.style.color = aliceColor;
        } else {
            // Show Alice's original color for bob's display
            bobValue.textContent = getColorName(aliceColor);
            bobValue.style.color = aliceColor;
        }
        
        // End transmission
        transmissionActive = false;
        startBtn.disabled = false;
        speedRunBtn.disabled = false;
        
        // Show summary
        const baseMatches = aliceBases.map((basis, i) => basis === bobBases[i]).filter(Boolean).length;
        console.log(`Speed run complete: ${baseMatches} bits had matching bases (${Math.round(baseMatches/quantumValues.length*100)}%)`);
        
        // Start key composition animation after a short delay
        setTimeout(() => {
            showKeyComposition();
        }, 500);
    }
    
    // Add CSS for the popup
    const style = document.createElement('style');
    style.textContent = `
        .popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .popup-container {
            background-color: #fff;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            animation: popup-appear 0.3s ease-out;
        }
        
        @keyframes popup-appear {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        .popup-header {
            background-color: #007bff;
            color: white;
            padding: 15px;
            text-align: center;
        }
        
        .popup-header h4 {
            margin: 0;
            font-size: 1.2rem;
        }
        
        .popup-body {
            padding: 20px;
            line-height: 1.5;
        }
        
        .popup-footer {
            padding: 15px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .popup-footer button {
            min-width: 120px;
        }
    `;
    document.head.appendChild(style);
});