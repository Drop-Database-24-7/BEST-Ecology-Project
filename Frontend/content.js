// const HIGH_RES_THRESHOLD = 600; // px
// let itemCounter = 0;
//
// function analyzeImage(imageUrl, callback) {
//     chrome.runtime.sendMessage(
//         {action: "ANALYZE_IMAGE", url: imageUrl},
//         (response) => {
//             if (response && response.analysis) {
//                 callback(response.analysis);
//             } else {
//                 callback(null);
//             }
//         }
//     );
// }
//
// function betterMarker(itemContainer, isShein, foundUrl) {
//
//     if (itemContainer.querySelector('.vinted-res-marker')) return;
//
//     const marker = document.createElement('div');
//     marker.classList.add('vinted-res-marker');
//     marker.classList.add(isShein ? 'legit' : 'no-legit'); // Użyto "no-legit" dla spójności z CSS
//     marker.title = isShein ? 'legit' : 'no-legit';
//
//     const tooltip = document.createElement('span');
//     tooltip.className = 'vinted-tooltip-bubble';
//     if (isShein) {
//         tooltip.textContent = `Znaleziono na Shein! Link: ${foundUrl}`;
//     } else {
//         tooltip.textContent = 'Produkt nie znaleziony na Shein.';
//     }
//
//     marker.appendChild(tooltip);
//
//     const relativeContainer = itemContainer.querySelector('.new-item-box__image-container') || itemContainer;
//     relativeContainer.appendChild(marker);
// }
//
//
// function processItem(item) {
//     const img = item.querySelector('img.web_ui__Image__content');
//
//     if (img) {
//         if (img.complete) {
//             analyzeImage(img.src, (analysisResult) => { // <-- Poprawka 1: img.src
//                 if (analysisResult) { // Sprawdzamy tylko, czy serwer w ogóle odpowiedział
//                     const isShein = analysisResult.isShein; // Będzie true lub false
//                     const foundUrl = analysisResult.url;
//                     betterMarker(item, isShein, foundUrl);
//                 } else {
//                     // Opcjonalnie: jeśli serwer nie odpowie, też pokaż zielony znacznik
//                     betterMarker(item, false, null);
//                 }
//
//             });
//
//
//         } else {
//             img.onload = () => {
//                 analyzeImage(img.src, (analysisResult) => { // <-- Poprawka 1: img.src
//                     if (analysisResult) { // Sprawdzamy tylko, czy serwer w ogóle odpowiedział
//                         const isShein = analysisResult.isShein; // Będzie true lub false
//                         const foundUrl = analysisResult.url;
//                         betterMarker(item, isShein, foundUrl);
//                     } else {
//                         // Opcjonalnie: jeśli serwer nie odpowie, też pokaż zielony znacznik
//                         betterMarker(item, false, null);
//                     }
//                 });
//             };
//         }
//     }
// }
//
// function run() {
//     const items = document.querySelectorAll('.feed-grid__item');
//     console.log("start")
//     items.forEach(processItem);
//
//     console.log("Koniec")
// }
//
//
// let scanTimer;
// let previousUrl = '';
//
// // Ta funkcja planuje skanowanie strony. Anuluje poprzednie, jeśli
// // użytkownik szybko zmienia strony, i wykonuje się tylko raz.
// function scheduleScan() {
//     // Anuluj poprzedni timer, aby uniknąć wielokrotnych uruchomień
//     clearTimeout(scanTimer);
//
//     // Ustaw nowy timer na 3 sekundy
//     scanTimer = setTimeout(() => {
//         console.log("Minęły 1 sekundy. Uruchamiam skanowanie...");
//         run();
//     }, 1000); // Czekaj 3000ms = 3 sekundy
// }
//
// // Obserwator, który reaguje tylko na zmiany w adresie URL.
// // To jest główny mechanizm wykrywania zmiany strony.
// const urlObserver = new MutationObserver(() => {
//     if (window.location.href !== previousUrl) {
//         console.log(`Wykryto zmianę URL: ${window.location.href}`);
//         previousUrl = window.location.href;
//
//         // Zaplanuj skanowanie dla nowej strony
//         scheduleScan();
//     }
// });
//
// // Uruchomienie po raz pierwszy
// // Czekamy, aż cała strona się załaduje, a potem planujemy pierwsze skanowanie.
// window.addEventListener('load', () => {
//     previousUrl = window.location.href;
//     console.log("Strona w pełni załadowana. Planuję pierwsze skanowanie.");
//     scheduleScan();
//
//     // Uruchom obserwatora URL dopiero po załadowaniu strony
//     urlObserver.observe(document.body, {
//         childList: true,
//         subtree: true
//     });
// });
//
// // Uruchom skanowanie przy pierwszym załadowaniu strony
// // run();
//
// observer.observe(document.body, {childList: true, subtree: true});


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
    const isEven = itemCounter % 2 === 0;

    if (isEven) {
        // Co drugie ogłoszenie (parzyste) -> ZIELONY
        addMarker(item, false, null);
    } else {
        // Co drugie ogłoszenie (nieparzyste) -> CZERWONY
        addMarker(item, true, 'https://shein.com/test-link');
    }
    itemCounter++;
    console.log("Przetworzone dane produktu (z marką):", productData);
    // --- KONIEC LOGIKI TESTOWEJ ---
}



function run() {
    console.log("Skanowanie...");
    // Resetuj licznik przy każdym nowym skanowaniu, aby wzór się powtarzał
    itemCounter = 0;
    const items = document.querySelectorAll('.feed-grid__item');
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