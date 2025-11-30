const vision = require("@google-cloud/vision");
const cors = require("cors");
const express = require("express");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const VISION_KEY_PATH = "./bhla-479720-4d29cb0d1b9f.json";
const FIREBASE_KEY_PATH = "./best-eco-project-fed20839e8f8.json";

const serviceAccount = require(FIREBASE_KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://best-eco-project-default-rtdb.europe-west1.firebasedatabase.app/",
});

const db = getFirestore();

app.use(cors());
app.use(express.json());

const client = new vision.ImageAnnotatorClient({
  keyFilename: VISION_KEY_PATH,
});

function hashString(str){
  return crypto.createHash('sha256').update(str).digest('hex'); 
}

async function isTrusted(marka) {
  if (!marka) return { isTrusted: false };

  const brand = marka.toLowerCase();

  try {
    const brandDoc = await db.collection("trusted_brands").doc(brand).get();

    return { isTrusted: brandDoc.exists };
  } catch (error) {
    console.log("Firebase error: ", error);
    return { isTrusted: false, error: error.message };
  }
}
async function saveItem(itemMeta) {
  try {
    // Sprawdzenie, czy itemMeta.name istnieje, aby użyć go jako nazwy dokumentu
    if (!itemMeta || !itemMeta.hash) {
      console.log(itemMeta)
      console.error("Błąd: Obiekt itemMeta lub jego pole 'hash' jest nieprawidłowe.");
      return;
    }

    // Używamy db.collection("nazwa_kolekcji").doc("ID_dokumentu").set(dane)
    const result = await db.collection("verified_items")
      .doc(itemMeta.hash) // Ustawienie nazwy dokumentu na itemMeta.name
    
    const docSnap = await result.get();

    if(docSnap.exists) {
      return;
    }

    await result.set(itemMeta);
   
    // Zwrócenie wyniku (opcjonalnie, w zależności od potrzeb)
    return result;

  } catch (error) {
    // Możesz tutaj rzucić błąd, aby obsłużyć go wyżej
    // throw error; 
  }
}
async function isFromShein(imagePath) {
  const imageHash = hashString(imagePath);
  const cacheRef = db.collection('verified_items').doc(imageHash);
  
  try {
    const cacheDoc = await cacheRef.get();

    if(cacheDoc.exists) {
      const data = cacheDoc.data();
      if(data.isShein !== undefined){
        console.log("pobrano z bazy")
        
        return {
          isShein: data.isShein,
          url: data.url
        };
      } else {
        console.log("przeanalizowano")
      }
    }

    const [result] = await client.webDetection(imagePath);
    const webDetection = result.webDetection;
    
    let finalResult = { isShein: false, url: null };
    if (webDetection) {
    
      const targetKeywords = ['shein','aliexpress','romwe', 'temu', 'joom'];
    
      const allItems = [
        ...(webDetection.pagesWithMatchingImages || []),
        ...(webDetection.partialMatchingImages || []),
        ...(webDetection.visuallySimilarImages || []),
      ];

      const foundItem = allItems.find((item) => {
        const url = item.url ? item.url.toLowerCase() : "";
        return targetKeywords.some((keyword) => url.includes(keyword));
      });

      if (foundItem) {
        finalResult = {
          isShein: true,
          url: foundItem.url,
        };
      }

      await cacheRef.set({
        ...finalResult,
        analyzedAt: new Date().toISOString()
      }, { merge: true })
  }

  return finalResult;
  
  } catch (error) {
    console.error("Błąd:", error);
    return { isShein: false, url: null, error: error.message };
  }
}

// Piotrek: Zapis do bazy danych metadanych
/* 
{
  brand: String,
  name: String,
  description: String,
  imgUrl: String,
  price: String
}
*/
app.post("/api/analyze", async (req, res) => {
  const { brand, name, description, imageUrl, price } = req.body;

  

  if (!imageUrl) {
    return res.status(400).json({
      error: "Missing field: imageUrl is required",
    });
  }

  const imageHash = hashString(imageUrl);

  let itemMeta = {
    hash: imageHash,
    brand: brand || "Unknown",
    name: name ? name.replace("/", " ") : "Unknown Item",
    description: description || "",
    imageUrl: imageUrl,
    price: price
  }

  // Save Item Meta 
  try {
    await saveItem(itemMeta);
    const result = await isFromShein(imageUrl);
    res.json(result);
  } 
  catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }

});

app.post("/api/istrusted", async (req, res) => {
  const { brand } = req.body;

  if (!brand) {
    return res.status(400).json({
      error: "Missing field: brand is required",
    });
  }

  try {
    const result = await isTrusted(brand);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

app.post("/api/save_item", async (req, res) => {
    const { name, img, description } = req.body;
    
    if(!name || !img || !description){
      return res.status(400).json({
        error: "Miising field",
      });
    }

    /*
    TODO

    Zapisz item do bazy danych
    ###############################################################3
    ###############################################################3
    ###############################################################3
    ###############################################################3
      TUTAJ BĘDZIE KOD
    ###############################################################3
    ###############################################################3
    ###############################################################3
    */
})

// Piotrek: Odczyt itemów z bazy danych  


//test

/*
(async () =>{
    //const res = await isFromShein("https://img.ltwebstatic.com/v4/j/pi/2025/10/17/83/17606916318bffa0b3bb502ed6272bed8987a928a4_thumbnail_900x.webp"); 
    //const res = await isFromShein("https://images1.vinted.net/t/06_02068_VodyJbvhSxjfFNiiKphNaAVQ/f800/1764447724.webp?s=762d1931660d5a467362879e6fcd339f3ff0d326");
    const res = await isTrusted('nike');
    
    console.log(res);

})();
*/
app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
