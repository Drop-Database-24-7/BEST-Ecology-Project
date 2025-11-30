
let itemCounter = 0; // Licznik do testowania

// Funkcja do komunikacji z background.js - bez zmian
function analyzeImage(brand, name, description, imageUrl, price, callback) {
    chrome.runtime.sendMessage(
        { action: "ANALYZE_IMAGE", brand: brand, name: name, description: description, url: imageUrl, price: price, },
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

        // Rozróżnienie między wykryciem marki w opisie a znalezionym linkiem
        if (foundUrl === 'brand_detected') {
            tooltip.textContent = 'Opis zawiera frazę';
        } else {
            tooltip.textContent = `Znaleziony link: ${foundUrl}`;
        }

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

        // Dodaj kliknięcie tylko jeśli to link, nie dla wykrycia marki
        if (foundUrl !== 'brand_detected') {
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(foundUrl, '_blank');
            });
        }
    } else {
        // --- Logika dla znacznika ZIELONEGO (NIE ZNALEZIONO) ---
        marker.classList.add('no-legit');
        marker.style.backgroundColor = 'green';
        tooltip.textContent = 'Produkt nie znaleziony';
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


// Upewnij się, że funkcja analyzeImage jest dostępna (została zdefiniowana wcześniej)
// function analyzeImage(brand, name, description, imageUrl, price, callback) { ... }

function processItem(item) {
    // Zabezpieczenie przed ponownym przetwarzaniem
    if (item.dataset.analysisProcessed) return;
    item.dataset.analysisProcessed = 'true';

    // Inicjalizacja obiektu do przechowywania wydobytych danych
    const productData = {
        imgUrl: null,
        name: null,
        description: null,
        price: null,
        brand: null // Dodany atrybut dla firmy
    };

    // 1. Pobieranie URL obrazu (img url)
    const imgElement = item.querySelector('.new-item-box__image img');
    if (imgElement) {
        productData.imgUrl = imgElement.getAttribute('src');
    }

    // 2. Pobieranie Nazwy (name)
    const overlayLink = item.querySelector('.new-item-box__overlay--clickable');
    if (overlayLink) {
        const fullTitle = overlayLink.getAttribute('title');
        const nameMatch = fullTitle.match(/^([^,]+)/);
        if (nameMatch) {
            productData.name = nameMatch[1].trim();
        } else {
            productData.name = fullTitle;
        }
    }

    // 3. Pobieranie Firmy/Marki (brand)
    const brandElement = item.querySelector('[data-testid$="--description-title"]');
    if (brandElement) {
        productData.brand = brandElement.textContent.trim();
    }

    // 4. Pobieranie Opisu (description)
    const descriptionSubtitleElement = item.querySelector('[data-testid$="--description-subtitle"]');
    if (descriptionSubtitleElement) {
        productData.description = descriptionSubtitleElement.textContent.trim();
    } else {
        productData.description = productData.brand;
    }

    // 5. Pobieranie Ceny (price)
    const priceElement = item.querySelector('[data-testid$="--price-text"]');
    if (priceElement) {
        productData.price = priceElement.textContent.trim().replace(/\s/g, ' ');
    } else {
        const finalPriceElement = item.querySelector('.web_ui__Text__subtitle');
        if (finalPriceElement) {
            productData.price = finalPriceElement.textContent.trim().replace(/\s/g, ' ');
        }
    }

    // Używamy productData.brand do dalszych kroków
    const extractedBrand = productData.brand;

    // --- GŁÓWNA LOGIKA ANALIZY ---

    if (!extractedBrand) {
        // Nie udało się wyodrębnić marki, pomiń dalszą analizę lub oznacz domyślnie
        addMarker(item, false, null);
        console.warn("Brak marki dla tego przedmiotu, pomijanie analizy.");
        return;
    }

    const brandForCheck = extractedBrand.toLowerCase();

    if (brandForCheck === 'shein') {
        // Jeśli marka to "Shein", od razu oznacz jako znalezione
        addMarker(item, true, 'https://shein.com/test-link');
        return;
    }
    else {
        // 1. Sprawdź zaufanie do marki (zakładając, że funkcja checkBrandTrust przyjmuje markę i callback)
        checkBrandTrust(extractedBrand, (response) => {
            if (response && response.isTrusted) {
                // Marka jest zaufana, więc analizujemy obrazek
                const img = item.querySelector('img.web_ui__Image__content');
                if (img) {

                    // Definicja funkcji analizującej z użyciem pełnych danych
                    const analyzeAndMark = (imageUrl) => {
                        // TUTAJ NASTĘPUJE ZMIANA: PRZEKAZUJEMY WSZYSTKIE ZEBRANE DANE
                        analyzeImage(
                            productData.brand,
                            productData.name,
                            productData.description,
                            imageUrl, // Używamy aktualnego URL obrazu
                            productData.price,
                            (analysisResult) => {
                                if (analysisResult) {
                                    addMarker(item, analysisResult.isShein, analysisResult.url);
                                } else {
                                    // Jeśli serwer nie odpowie, oznacz jako "nie znaleziono"
                                    addMarker(item, false, null);
                                }
                            }
                        );
                    };

                    // Sprawdź, czy obrazek jest już załadowany
                    if (img.complete) {
                        analyzeAndMark(img.src);
                    } else {
                        // Użyj productData.imgUrl jako fallback, jeśli img.src nie jest od razu dostępne
                        img.onload = () => analyzeAndMark(img.src || productData.imgUrl);
                    }
                }
            }
            else {
                // Marka nie jest zaufana (lub błąd w checkBrandTrust), więc oznaczamy jako "znalezione" (czerwony znacznik)
                addMarker(item, true, 'https://shein.com/test-link');
                return;
            }
        });
    }
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