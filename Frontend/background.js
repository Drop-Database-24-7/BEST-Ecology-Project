chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ANALYZE_IMAGE") {
        fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ brand: request.brand, name: request.name, description: request.name, imageUrl: request.url, price: request.price })
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
    } else if (request.action === "CHECK_BRAND_TRUST") {
        console.log(`Background: Sprawdzam markę "${request.brand}"...`);

        fetch('http://localhost:3000/api/istrusted', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ brand: request.brand })
        })
            .then(response => response.json())
            .then(data => {
                sendResponse(data);
            })
            .catch(error => {
                console.error("Background: Błąd podczas sprawdzania marki", error);
                sendResponse(null);
            });

        return true;
    }
});

