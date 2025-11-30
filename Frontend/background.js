// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_COLOR") {
        extractColor(request.url).then(color => {
            sendResponse({ color: color });
        });
        return true; // Keep the message channel open for async response
    }
    else if (request.action === "ANALYZE_IMAGE") {
        fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl: request.url })
        })
            .then(response => response.json())
            .then(data => {
                sendResponse({ analysis: data });
            })
            .catch(error => {
                console.error("Background: Błąd podczas analizy obrazka", error);
                sendResponse({ analysis: null });
            });

        return true;
    }else if (request.action === "CHECK_BRAND_TRUST") {
        console.log(`Background: Sprawdzam markę "${request.brand}"...`);

        fetch('http://localhost:3000/api/istrusted', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ brand: request.brand }) // Wysyłamy markę
        })
            .then(response => response.json())
            .then(data => {
                // Odsyłamy wynik z powrotem do content.js
                sendResponse(data); // Oczekiwany format: { isTrusted: true/false }
            })
            .catch(error => {
                console.error("Background: Błąd podczas sprawdzania marki", error);
                // W razie błędu, odsyłamy domyślną, bezpieczną odpowiedź
                sendResponse({ isTrusted: false });
            });

        return true; // WAŻNE: Utrzymuje kanał otwarty na odpowiedź
    }
});

async function extractColor(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, 1, 1);

        const p = ctx.getImageData(0, 0, 1, 1).data;
        return `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
    } catch (error) {
        console.error("Background: Error extracting color", error);
        return null;
    }
}
