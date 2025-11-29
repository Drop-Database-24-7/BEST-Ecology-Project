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
    marker.classList.add('vinted-res-marker');

    const tooltip = document.createElement('span');
    tooltip.className = 'vinted-tooltip-bubble';

    if (isFound) {
        // --- Logika dla znacznika CZERWONEGO (ZNALEZIONO) ---
        marker.classList.add('legit');
        marker.style.backgroundColor = 'red';
        marker.title = 'Test - Znaleziono';
        tooltip.textContent = `Testowy link: ${foundUrl}`;

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(foundUrl, '_blank');
        });
    } else {
        // --- Logika dla znacznika ZIELONEGO (NIE ZNALEZIONO) ---
        marker.classList.add('no-legit');
        marker.style.backgroundColor = 'green';
        marker.title = 'Test - Nie znaleziono';
        tooltip.textContent = 'Test - Produkt nie znaleziony.';
    }

    marker.appendChild(tooltip);

    const relativeContainer = itemContainer.querySelector('.new-item-box__image-container') || itemContainer;
    relativeContainer.appendChild(marker);
}

// TYMCZASOWO ZMIENIONA FUNKCJA processItem
function processItem(item) {
    // Zabezpieczenie przed ponownym przetwarzaniem
    if (item.dataset.analysisProcessed) return;
    item.dataset.analysisProcessed = 'true';

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