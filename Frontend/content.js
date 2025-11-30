
let itemCounter = 0; // Licznik do testowania

// Funkcja do komunikacji z background.js - bez zmian
function analyzeImage(imageUrl, callback) {
    chrome.runtime.sendMessage(
        {action: "ANALYZE_IMAGE", url: imageUrl},
        (response) => {
            callback(response ? response.analysis : null);
        }
    );
}

// ULEPSZONA FUNKCJA DO TWORZENIA ZNACZNIKÓW
function addMarker(itemContainer, isFound, foundUrl) {
    if (itemContainer.querySelector('.vinted-res-marker')) return;

    const marker = document.createElement('div');
    const image = document.createElement('img');
    image.src = chrome.runtime.getURL("leaf.png");
    image.style.width = '100%';
    image.style.height = '100%';
    marker.classList.add('vinted-res-marker');
    marker.appendChild(image);


    const tooltip = document.createElement('span');
    tooltip.className = 'vinted-tooltip-bubble';

    if (isFound) {
        // --- Logika dla znacznika CZERWONEGO (ZNALEZIONO) ---
        marker.classList.add('legit');
        marker.style.backgroundColor = 'red';
        tooltip.textContent = `Testowy link: ${foundUrl}`;

        // Dodaj przekreśloną kreskę
        const crossLine = document.createElement('div');
        crossLine.style.position = 'absolute';
        crossLine.style.width = '100%';
        crossLine.style.height = '4px';
        crossLine.style.backgroundColor = 'red';
        crossLine.style.top = '50%';
        crossLine.style.left = '50%';
        crossLine.style.transform = 'translate(-50%, -50%) rotate(45deg)';
        crossLine.style.pointerEvents = 'none';
        marker.appendChild(crossLine);

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(foundUrl, '_blank');
        });
    } else {
        // --- Logika dla znacznika ZIELONEGO (NIE ZNALEZIONO) ---
        marker.classList.add('no-legit');
        marker.style.backgroundColor = 'green';
        tooltip.textContent = 'Test - Produkt nie znaleziony.';
    }

    // Dodaj tooltip do body zamiast do markera
    document.body.appendChild(tooltip);

    // Pozycjonowanie tooltipa dynamicznie
    marker.addEventListener('mouseenter', () => {
        const rect = marker.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '1';
    });

    marker.addEventListener('mouseleave', () => {
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
    });

    const relativeContainer = itemContainer.querySelector('.new-item-box__image-container') || itemContainer;
    relativeContainer.appendChild(marker);
}

function checkBrandTrust(brandName, callback) {
    chrome.runtime.sendMessage(
        { action: "CHECK_BRAND_TRUST", brand: brandName },
        (response) => {
            // Odbieramy odpowiedź (np. { isTrusted: true }) i przekazujemy dalej
            callback(response);
        }
    );
}



// TYMCZASOWO ZMIENIONA FUNKCJA processItem
function processItem(item) {
    // Zabezpieczenie przed ponownym przetwarzaniem
    if (item.dataset.analysisProcessed) return;
    item.dataset.analysisProcessed = 'true';

    const textSelector = 'p.web_ui__Text__text.web_ui__Text__caption.web_ui__Text__left.web_ui__Text__truncated';

    // 2. Znajdź ten element wewnątrz przetwarzanego ogłoszenia
    const textElement = item.querySelector(textSelector);

    // 3. Sprawdź, czy element został znaleziony i wyciągnij z niego tekst
    if (textElement) {
        // Pobierz tekst i "oczyść" go, usuwając znaki, które mogą powodować błędy w Firebase.
        // Zastępujemy wszystkie wystąpienia '/' pustym ciągiem.
        // Można tu dodać więcej znaków do usunięcia w przyszłości, np. /[\\/\[\]*?]/g
        const extractedText = textElement.textContent.trim().replace(/\//g, '');

        if(extractedText.toLowerCase() === 'shein')
        {
            // Jeśli marka to "Shein", od razu oznacz jako znalezione
            addMarker(item, true, 'https://shein.com/test-link');
            return;
        }
        else
        {
            checkBrandTrust(extractedText, (response) => {
                if (response) {
                    const isTrusted = response.isTrusted;

                    if(isTrusted)
                    {
                        // Marka jest zaufana, więc analizujemy obrazek
                        const img = item.querySelector('img.web_ui__Image__content');
                        if (img) {
                            const analyzeAndMark = (imageUrl) => {
                                analyzeImage(imageUrl, (analysisResult) => {
                                    if (analysisResult) {
                                        addMarker(item, analysisResult.isShein, analysisResult.url);
                                    } else {
                                        // Jeśli serwer nie odpowie, oznacz jako "nie znaleziono"
                                        addMarker(item, false, null);
                                    }
                                });
                            };

                            // Sprawdź, czy obrazek jest już załadowany
                            if (img.complete) {
                                analyzeAndMark(img.src);
                            } else {
                                img.onload = () => analyzeAndMark(img.src);
                            }
                        }
                    }
                    else
                    {
                        // Marka nie jest zaufana, więc oznaczamy jako "znalezione" (czerwony znacznik)
                        addMarker(item, true, 'https://shein.com/test-link');
                        return;
                    }
                }
            });
        }
    }




    // --- TYMCZASOWA LOGIKA TESTOWA ---
    // const isEven = itemCounter % 2 === 0;
    //
    // if (isEven) {
    //     // Co drugie ogłoszenie (parzyste) -> ZIELONY
    //     addMarker(item, false, null);
    // } else {
    //     // Co drugie ogłoszenie (nieparzyste) -> CZERWONY
    //     addMarker(item, true, 'https://shein.com/test-link');
    // }
    // itemCounter++;
    // --- KONIEC LOGIKI TESTOWEJ ---
}

function run() {
    console.log("Skanowanie...");
    // Resetuj licznik przy każdym nowym skanowaniu, aby wzór się powtarzał
    itemCounter = 0;

    //zmienił sie querry selecotr okokło 2:30 z '.feed-grid__item' na '.new-item-box__container'
    //testy A/B prawdopodobnie
    //stary link: https://www.vinted.pl/catalog?page=1&time=1764469466&search_text=sukienki&search_by_image_uuid=&catalog[]=1247
    //Uwaga na to
    const items = document.querySelectorAll('.new-item-box__container');
    items.forEach(processItem);
    console.log(`Przeskanowano ${items.length} elementów.`);
}

// --- NIEZAWODNY MECHANIZM URUCHAMIANIA ---
let scanTimer;
let previousUrl = '';

function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
        console.log("Minęły 1 sekundy. Uruchamiam skanowanie...");
        run();
    }, 1000);
}

const urlObserver = new MutationObserver(() => {
    if (window.location.href !== previousUrl) {
        console.log(`Wykryto zmianę URL.`);
        previousUrl = window.location.href;
        scheduleScan();
    }
});

window.addEventListener('load', () => {
    previousUrl = window.location.href;
    console.log("Strona załadowana. Planuję pierwsze skanowanie.");
    scheduleScan();

    urlObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
});