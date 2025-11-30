
// let itemCounter = 0;

function analyzeImage(brand, name, description, imageUrl, price, callback) {
    chrome.runtime.sendMessage(
        { action: "ANALYZE_IMAGE", brand: brand, name: name, description: description, url: imageUrl, price: price, },
        (response) => {
            callback(response ? response.analysis : null);
        }
    );
}

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
        marker.classList.add('legit');
        marker.style.backgroundColor = 'red';

        if (foundUrl === 'brand_detected') {
            tooltip.textContent = 'Opis zawiera frazę';
            tooltip.classList.remove('wide');
        } else {
            let displayUrl = foundUrl;
            if (displayUrl.length > 30) {
                displayUrl = displayUrl.substring(0, 27) + '...';
            }
            tooltip.textContent = `Znaleziony link: ${displayUrl}`;

            tooltip.classList.add('wide');
        }

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

        if (foundUrl !== 'brand_detected') {
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(foundUrl, '_blank');
            });
        }
    } else {
        marker.classList.add('no-legit');
        marker.style.backgroundColor = 'green';
        tooltip.textContent = 'Produkt nie znaleziony';
        tooltip.classList.remove('wide');
    }

    document.body.appendChild(tooltip);

    marker.addEventListener('mouseenter', () => {
        const rect = marker.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';

        tooltip.classList.add('visible');
    });

    marker.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
    });

    const relativeContainer = itemContainer.querySelector('.new-item-box__image-container') || itemContainer;
    relativeContainer.appendChild(marker);
}

function checkBrandTrust(brandName, callback) {
    chrome.runtime.sendMessage(
        { action: "CHECK_BRAND_TRUST", brand: brandName },
        (response) => {
            callback(response);
        }
    );
}

function processItem(item) {
    if (item.dataset.analysisProcessed) return;
    item.dataset.analysisProcessed = 'true';

    const productData = {
        imgUrl: null,
        name: null,
        description: null,
        price: null,
        brand: null
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

    const textSelector = 'p.web_ui__Text__text.web_ui__Text__caption.web_ui__Text__left.web_ui__Text__truncated';

    // 2. Znajdź ten element wewnątrz przetwarzanego ogłoszenia
    const textElement = item.querySelector(textSelector);

    // 3. Sprawdź, czy element został znaleziony i wyciągnij z niego tekst
    if (textElement) {
        const extractedText = textElement.textContent.trim().replace(/\//g, '');

        if (extractedText.toLowerCase() === 'shein' || extractedText.toLowerCase() === 'temu' || extractedText.toLowerCase() === 'aliexpress') {
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
                        const img = item.querySelector('img.web_ui__Image__content');
                        if (img) {
                            const analyzeAndMark = (imageUrl) => {
                                analyzeImage(
                                    productData.brand,
                                    productData.name,
                                    productData.description,
                                    imageUrl,
                                    productData.price,
                                    (analysisResult) => {
                                        if (analysisResult) {
                                            addMarker(item, analysisResult.isShein, analysisResult.url);
                                        } else {
                                            addMarker(item, false, null);
                                        }
                                    });
                            };

                            if (img.complete) {
                                analyzeAndMark(img.src);
                            } else {
                                img.onload = () => analyzeAndMark(img.src);
                            }
                        }
                    }
                } else {
                    addMarker(item, false, null);
                }
            });
        }
    } else {
        addMarker(item, false, null);
    }
    // itemCounter++;
    console.log("Przetworzone dane produktu (z marką):", productData);
}

function run() {
    console.log("Skanowanie...");
    // itemCounter = 0;

    //zmienił sie querry selecotr okokło 2:30 z '.feed-grid__item' na '.new-item-box__container'
    //testy A/B prawdopodobnie

    const items = document.querySelectorAll('.new-item-box__container');
    items.forEach(processItem);
    console.log(`Przeskanowano ${items.length} elementów.`);
}

let isScanning = false;
let scanPending = false;
let previousUrl = '';

function scheduleScan() {
    if (isScanning) {
        console.log("Skanowanie w toku lub w okresie karencji. Oznaczono jako oczekujące.");
        scanPending = true;
        return;
    }

    isScanning = true;
    run();

    setTimeout(() => {
        console.log("Koniec okresu karencji (2s).");
        isScanning = false;
        if (scanPending) {
            scanPending = false;
            console.log("Znaleziono oczekujące skanowanie. Uruchamiam ponownie.");
            scheduleScan();
        }
    }, 2000);
}

const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldScan = true;
            break;
        }
    }

    if (shouldScan) {
        console.log("Wykryto nowe elementy w DOM.");
        scheduleScan();
    }
});

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

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    urlObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
});