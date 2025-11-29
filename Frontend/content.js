const HIGH_RES_THRESHOLD = 600; // px

function getDominantColor(imageUrl, callback) {
  chrome.runtime.sendMessage(
    { action: "EXTRACT_COLOR", url: imageUrl },
    (response) => {
      if (response && response.color) {
        callback(response.color);
      } else {
        callback(null);
      }
    }
  );
}

function checkImageResolution(imgElement) {
  const width = imgElement.naturalWidth;
  const height = imgElement.naturalHeight;
  const maxDim = Math.max(width, height);
  return maxDim >= HIGH_RES_THRESHOLD;
}

function addMarker(itemContainer, isHighRes, imgSrc) {
  if (itemContainer.querySelector('.vinted-res-marker')) return;

  const marker = document.createElement('div');
  marker.classList.add('vinted-res-marker');
  marker.classList.add(isHighRes ? 'high-res' : 'low-res');
  marker.title = isHighRes ? 'High Resolution' : 'Low Resolution';

  // Set dominant color
  if (imgSrc) {
    getDominantColor(imgSrc, (color) => {
      if (color) {
        marker.style.backgroundColor = color;
      }
    });
  }

  const relativeContainer = itemContainer.querySelector('.new-item-box__image-container') || itemContainer;
  relativeContainer.appendChild(marker);
}

function processItem(item) {
  const img = item.querySelector('img.web_ui__Image__content');

  if (img) {
    if (img.complete) {
      const isHighRes = checkImageResolution(img);
      addMarker(item, isHighRes, img.src);
    } else {
      img.onload = () => {
        const isHighRes = checkImageResolution(img);
        addMarker(item, isHighRes, img.src);
      };
    }
  }
}

function run() {
  const items = document.querySelectorAll('.feed-grid__item');
  items.forEach(processItem);
}

// Initial run
run();

// Observe for new items (infinite scroll)
const observer = new MutationObserver((mutations) => {
  let shouldRun = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      shouldRun = true;
      break;
    }
  }
  if (shouldRun) {
    run();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
