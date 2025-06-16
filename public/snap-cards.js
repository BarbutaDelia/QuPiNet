// snap-cards.js
// This script enables scroll snap and active card highlighting for card-based sections.

document.addEventListener('DOMContentLoaded', function () {
    // AOS scroll animations (optional, only if AOS is loaded)
    if (window.AOS) {
        AOS.init({
            once: true,
            duration: 900,
            offset: 80
        });
    }

    const snapCards = document.querySelectorAll('.snap-card');
    const snapContainer = document.querySelector('.snap-container');
    // Optional: If you want to highlight the active card
    function setActiveCard() {
        let closest = null;
        let minDist = Infinity;
        const containerRect = snapContainer.getBoundingClientRect();
        snapCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const dist = Math.abs((rect.top + rect.bottom) / 2 - (containerRect.top + containerRect.bottom) / 2);
            if (dist < minDist) {
                minDist = dist;
                closest = card;
            }
        });
        snapCards.forEach(card => card.classList.remove('active'));
        if (closest) closest.classList.add('active');
    }
    if (snapContainer && snapCards.length > 0) {
        snapContainer.addEventListener('scroll', () => {
            window.requestAnimationFrame(setActiveCard);
        });
        window.addEventListener('resize', setActiveCard);
        setActiveCard();

        // Allow scrolling to next card only after reaching bottom of current card
        snapCards.forEach(card => {
            const cardBody = card.querySelector('.card-body');
            if (!cardBody) return;
            cardBody.addEventListener('wheel', function (e) {
                const atBottom = cardBody.scrollTop + cardBody.clientHeight >= cardBody.scrollHeight - 2;
                const atTop = cardBody.scrollTop === 0;
                if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) {
                    // Allow parent scroll
                } else {
                    // Prevent parent scroll
                    e.stopPropagation();
                }
            }, { passive: false });
        });
    }
});
