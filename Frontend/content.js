
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
            // Domyślna szerokość dla krótkiego tekstu
            tooltip.classList.remove('wide');
        } else {
            // Skracanie linku
            let displayUrl = foundUrl;
            if (displayUrl.length > 30) {
                displayUrl = displayUrl.substring(0, 27) + '...';
            }
            tooltip.textContent = `Znaleziony link: ${displayUrl}`;

            // Szerszy dymek dla linków
            tooltip.classList.add('wide');
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
        // Domyślna szerokość
        tooltip.classList.remove('wide');
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

        // Zamiast ustawiać style bezpośrednio, dodajemy klasę 'visible'
        tooltip.classList.add('visible');
    });

    marker.addEventListener('mouseleave', () => {
        // Usuwamy klasę 'visible'
        tooltip.classList.remove('visible');
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

    // Inicjalizacja obiektu do przechowywania wydobytych danych
    const productData = {
        imgUrl: null,
        name: null,
        description: null,
        price: null,
        // Dodany atrybut dla firmy
        brand: null
    };

    // 1. Pobieranie URL obrazu (img url)
    const imgElement = item.querySelector('.new-item-box__image img');
    if (imgElement) {
        productData.imgUrl = imgElement.getAttribute('src');
    }

    // 2. Pobieranie Nazwy (name)
    // Pobieramy pełny tytuł z atrybutu 'title' linku-overlay, a następnie skracamy do samej nazwy produktu.
    const overlayLink = item.querySelector('.new-item-box__overlay--clickable');
    if (overlayLink) {
        const fullTitle = overlayLink.getAttribute('title');
        // Nazwa produktu to zazwyczaj część tytułu przed pierwszą przecinkiem z dodatkowymi szczegółami.
        const nameMatch = fullTitle.match(/^([^,]+)/);
        if (nameMatch) {
            productData.name = nameMatch[1].trim(); // "Sukienka Minoti nowa rozmiar 152 wysyłka Paczkomat"
        } else {
            productData.name = fullTitle;
        }
    }

    // 3. Pobieranie Firmy/Marki (brand)
    // Marka jest w elemencie z data-testid kończącym się na --description-title
    const brandElement = item.querySelector('[data-testid$="--description-title"]');
    if (brandElement) {
        productData.brand = brandElement.textContent.trim(); // "Minoti"
    }

    // 4. Pobieranie Opisu (description)
    // Opis to Rozmiar i Stan - pobieramy go z --description-subtitle
    const descriptionSubtitleElement = item.querySelector('[data-testid$="--description-subtitle"]');
    if (descriptionSubtitleElement) {
        // "152 cm / 12 lat · Nowy z metką" (Rozmiar i Stan)
        productData.description = descriptionSubtitleElement.textContent.trim();
    } else {
        // Jeśli nie ma podtytułu, używamy samej marki jako opisu (co jest mniej dokładne)
        productData.description = productData.brand;
    }

    // 5. Pobieranie Ceny (price)
    // Cena jest w elemencie z data-testid="...--price-text"
    const priceElement = item.querySelector('[data-testid$="--price-text"]');
    if (priceElement) {
        // Usuwamy &nbsp; i bierzemy tekst ceny bazowej, np. "35,00 zł"
        productData.price = priceElement.textContent.trim().replace(/\s/g, ' ');
    } else {
        // Alternatywnie, cena z Ochroną Kupujących
        const finalPriceElement = item.querySelector('.web_ui__Text__subtitle');
        if (finalPriceElement) {
            productData.price = finalPriceElement.textContent.trim().replace(/\s/g, ' ');
        }
    }

    // --- TYMCZASOWA LOGIKA TESTOWA ---


    const textSelector = 'p.web_ui__Text__text.web_ui__Text__caption.web_ui__Text__left.web_ui__Text__truncated';

    // 2. Znajdź ten element wewnątrz przetwarzanego ogłoszenia
    const textElement = item.querySelector(textSelector);

    // 3. Sprawdź, czy element został znaleziony i wyciągnij z niego tekst
    if (textElement) {
        // Pobierz tekst i "oczyść" go, usuwając znaki, które mogą powodować błędy w Firebase.
        // Zastępujemy wszystkie wystąpienia '/' pustym ciągiem.
        // Można tu dodać więcej znaków do usunięcia w przyszłości, np. /[\\/\[\]*?]/g
        const extractedText = textElement.textContent.trim().replace(/\//g, '');

        if (extractedText.toLowerCase() === 'shein' || extractedText.toLowerCase() === 'temu' || extractedText.toLowerCase() === 'aliexpress') {
            // Jeśli marka to "Shein", od razu oznacz jako znalezione
            addMarker(item, true, 'brand_detected');
            return;
        }
        else {
            checkBrandTrust(extractedText, (response) => {
                if (response) {
                    const isTrusted = response.isTrusted;

                    if (isTrusted) {
                        addMarker(item, false, null)
                    }
                    else {
                        // Marka jest zaufana, więc analizujemy obrazek
                        const img = item.querySelector('img.web_ui__Image__content');
                        if (img) {
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
                } else {
                    // Jeśli wystąpił błąd (np. backend nie odpowiedział), oznacz jako "nie znaleziono"
                    // To zapobiega wyświetlaniu "no trust", gdy serwer jest po prostu wyłączony.
                    addMarker(item, false, null);
                }
            });
        }
    }
    itemCounter++;
    console.log("Przetworzone dane produktu (z marką):", productData);
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
        console.log("Minęły 2 sekundy. Uruchamiam skanowanie...");
        run();
    }, 2000);
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