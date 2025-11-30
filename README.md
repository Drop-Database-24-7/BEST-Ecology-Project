# Leaf Guard - Detektor Fast Fashion na Vinted

**Pierwsza wtyczka**, która w czasie rzeczywistym wykrywa ukryte produkty Fast Fashion (Shein, Temu, AliExpress itp.) na Vinted. Chronimy Cię przed greenwashingiem i przepłacaniem za plastik.

## Spis treści

- [Opis projektu](#opis-projektu)
- [Jak to działa](#jak-to-działa)
- [Architektura](#architektura)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Użycie](#użycie)
- [API Dokumentacja](#api-dokumentacja)
- [Technologie](#technologie)

---

## Opis projektu

Leaf Guard to rozszerzenie Chrome, które automatycznie skanuje produkty na Vinted i wykrywa, czy pochodzą z platform fast fashion (Shein, Temu, AliExpress). Projekt składa się z dwóch głównych komponentów:

1. **Frontend** - Rozszerzenie Chrome (Manifest V3)
2. **Backend** - API Node.js/Express z integracją Google Cloud Vision AI

### Funkcje

- **Automatyczne skanowanie** - Wykrywa produkty podczas przeglądania Vinted
- **Podwójne wykrywanie** - Analiza marki w opisie + analiza obrazu AI
- **Wizualne oznaczenia** - Zielone/czerwone markery z ikoną liścia
- **Tooltips informacyjne** - Szczegóły o wykryciu przy najechaniu
- **Multi-region** - Wspiera 20+ domen Vinted w Europie
- **Baza zaufanych marek** - Firebase Firestore
- **Optymalizacja API** - Sprawdzanie czy zdjęcie zostało już sprawdzone, by zmniejszyć obłożenie API

---

## Jak to działa

### Przepływ wykrywania produktu

```
1. Użytkownik otwiera stronę Vinted
   ↓
2. Extension skanuje produkty (.new-item-box__container)
   ↓
3. ŚCIEŻKA A: Wykrycie marki w opisie
   │ - Sprawdza nazwę marki (Shein/Temu/AliExpress)
   │ - Jeśli wykryto → CZERWONY marker ("Opis zawiera frazę")
   │
4. ŚCIEŻKA B: Sprawdzenie bazy zaufanych marek
   │ - Zapytanie do Firebase Firestore
   │ - Jeśli marka ZAUFANA → ZIELONY marker ("Produkt nie znaleziony")
   │ - Jeśli marka NIEZAUFANA → przejdź do kroku 5
   │
5. ŚCIEŻKA C: Analiza obrazu AI
   │ - Wysłanie obrazu do Google Cloud Vision API
   │ - Wyszukiwanie podobnych produktów w internecie
   │ - Sprawdzenie czy znajduje się na Shein/AliExpress/Romwe
   │ - Jeśli ZNALEZIONO → CZERWONY marker ("Znaleziony link: URL")
   │ - Jeśli NIE ZNALEZIONO → ZIELONY marker ("Produkt nie znaleziony")
```

### Wizualne oznaczenia

- **Zielony marker** - Produkt nie znaleziony na platformach fast fashion
- **Czerwony marker** - Produkt wykryty (z przekreślonym liściem)

---

## Architektura

### Frontend (Chrome Extension)

```
Frontend/
├── manifest.json       # Konfiguracja rozszerzenia (Manifest V3)
├── content.js          # Główna logika skanowania
├── background.js       # Service worker (komunikacja z API)
├── styles.css          # Stylowanie markerów i tooltipów
└── leaf.png           # Ikona rozszerzenia i markera
```

#### Kluczowe komponenty:

**content.js:**
- `run()` - Skanuje wszystkie produkty na stronie
- `processItem(item)` - Przetwarza pojedynczy produkt
- `addMarker(itemContainer, isFound, foundUrl)` - Dodaje wizualny marker
- `checkBrandTrust(brandName, callback)` - Sprawdza bazę zaufanych marek
- `analyzeImage(imageUrl, callback)` - Wysyła obraz do analizy AI

**background.js:**
- `ANALYZE_IMAGE` - Przekazuje obraz do backend API
- `CHECK_BRAND_TRUST` - Sprawdza markę w Firestore

**styles.css:**
- `.vinted-res-marker` - Okrągły marker (28px)
- `.vinted-tooltip-bubble` - Tooltip z position: fixed
- Ikony: `leaf.png` dla zielonego, `leaf.png + przekreślenie` dla czerwonego

### Backend (Node.js API)

```
Backend/
├── index.js           # Express server (port 3000)
├── package.json       # Zależności
├── .gitignore        # Ukrywa credentials JSON
└── readme            # Dokumentacja API
```

#### Endpointy API:

**POST /api/analyze**
- Analizuje obrazek produktu
- Wykorzystuje Google Cloud Vision API (Web Detection)
- Szuka dopasowań na Shein, AliExpress, Romwe
- Zwraca: `{ isShein: boolean, url: string }`

**POST /api/istrusted**
- Sprawdza czy marka jest w bazie zaufanych
- Firebase Firestore collection: `trusted_brands`
- Zwraca: `{ isTrusted: boolean }`

---

## Wymagania

### Backend

- Node.js (v14+)
- Google Cloud Vision API credentials (JSON)
- Firebase Admin SDK credentials (JSON)
- Dostęp do internetu

### Frontend

- Google Chrome (wersja 88+)
- Backend uruchomiony na `localhost:3000`

---

## Instalacja

### 1. Klonowanie repozytorium

```bash
git clone https://github.com/Drop-Database-24-7/BEST-Ecology-Project.git
cd BEST-Ecology-Project
```

### 2. Konfiguracja Backend

```bash
cd Backend
npm install
```

**Dodaj pliki credentials:**
- `google-cloud-vision-credentials.json` - Google Cloud Vision API
- `firebase-admin-credentials.json` - Firebase Admin SDK

**Uruchom serwer:**

```bash
node index.js
# Serwer działa na http://localhost:3000
```

### 3. Instalacja Extension

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz **Tryb programisty** (Developer mode)
3. Kliknij **Załaduj rozpakowane** (Load unpacked)
4. Wybierz folder `Frontend/`
5. Extension "Leaf Guard" pojawi się z ikoną liścia

---

## Użycie

1. **Uruchom backend:**
   ```bash
   cd Backend
   node index.js
   ```

2. **Otwórz Vinted** w Chrome (np. `vinted.pl`)

3. **Przeglądaj produkty** - Extension automatycznie:
   - Skanuje produkty co 1 sekundę po załadowaniu strony
   - Dodaje zielone/czerwone markery
   - Wyświetla tooltips przy najechaniu myszką

4. **Interakcja:**
   - Najedź na marker → Zobacz tooltip
   - Kliknij czerwony marker z linkiem → Otwórz źródło w nowej karcie

---

## API Dokumentacja

### POST /api/analyze

Analizuje obraz produktu i sprawdza czy znajduje się na platformach fast fashion.

**Request:**
```json
{
  "imageUrl": "https://example.com/product.jpg"
}
```

**Response:**
```json
{
  "isShein": true,
  "url": "https://shein.com/product/..."
}
```

**Proces:**
1. Google Vision API wykonuje Web Detection
2. Przeszukuje `pagesWithMatchingImages`, `partialMatchingImages`, `visuallySimilarImages`
3. Filtruje domeny: `shein.com`, `aliexpress.com`, `romwe.com`
4. Zwraca wynik + URL pierwszego dopasowania

---

### POST /api/istrusted

Sprawdza czy marka znajduje się w bazie zaufanych marek.

**Request:**
```json
{
  "brand": "Nike"
}
```

**Response:**
```json
{
  "isTrusted": true
}
```

**Proces:**
1. Normalizuje nazwę marki (lowercase)
2. Query do Firestore: `trusted_brands` collection
3. Zwraca status zaufania

---

## Technologie

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js v5.1.0** - Framework webowy
- **@google-cloud/vision v5.3.4** - AI do analizy obrazów
- **firebase-admin v13.6.0** - Baza danych NoSQL
- **cors v2.8.5** - Obsługa CORS

### Frontend
- **Chrome Extension API** - Manifest V3
- **Vanilla JavaScript** - Bez frameworków
- **CSS3** - Stylowanie z position: fixed
- **MutationObserver** - Wykrywanie zmian w DOM
- **Chrome Runtime API** - Komunikacja z backendem

### Usługi zewnętrzne
- **Google Cloud Vision API** - Web Detection
- **Firebase Firestore** - Baza zaufanych marek

---

## Struktura projektu

```
BEST-Ecology-Project/
│
├── Backend/
│   ├── index.js                    # Express API (141 linii)
│   ├── package.json                # Zależności
│   ├── package-lock.json
│   ├── readme                      # API docs
│   └── .gitignore                  # Ukrywa credentials
│
├── Frontend/
│   ├── manifest.json               # Extension config (58 linii)
│   ├── content.js                  # Logika skanowania (283 linie)
│   ├── background.js               # Service worker (47 linii)
│   ├── styles.css                  # CSS markerów (79 linii)
│   ├── leaf.png                    # Ikona (21KB)
│   ├── test.html                   # Lokalny test
│   └── public/
│       └── leaf.png                # Backup ikony
│
├── README.md                       # Ta dokumentacja
└── .gitignore                      # Git exclusions
```

---

## Szczegóły techniczne

### Wykrywanie produktów - Selektory DOM

```javascript
'.new-item-box__container'
'.new-item-box__image img'
'[data-testid$="--description-title"]'
'[data-testid$="--description-subtitle"]'
'[data-testid$="--price-text"]'
```

**Stare (przed testami A/B):**
```javascript
'.feed-grid__item'
```

### Mechanizm skanowania

1. **URL Observer** - Wykrywa zmiany URL (nawigacja SPA)
2. **Delayed Scan** - 1 sekunda po załadowaniu/zmianie strony
3. **Deduplication** - `dataset.analysisProcessed = 'true'`
4. **Dynamic Tooltips** - position: fixed + getBoundingClientRect()
5. **API Cache** - Sprawdzanie czy zdjęcie było już analizowane przed wysłaniem zapytania

### Wykrywanie Fast Fashion - Kryteria

**Marki w opisie:**
```javascript
['shein', 'temu', 'aliexpres']
```

**Domeny dla Web Detection:**
```javascript
['shein.com', 'aliexpress.com', 'romwe.com']
```

---

## Znane problemy

1. **Testy A/B Vinted** - Selektory DOM mogą się zmieniać
   - Rozwiązanie: Monitoruj query selector w console.log

2. **Tooltip poza kontenerem** - Position: fixed + body.appendChild()
   - Rozwiązanie: Dynamiczne pozycjonowanie przy mouseenter

3. **Duplikaty markerów** - Przy ponownym skanowaniu
   - Rozwiązanie: Sprawdzenie `querySelector('.vinted-res-marker')`

---

## Autorzy

**U mnie (nie)działa**

---
