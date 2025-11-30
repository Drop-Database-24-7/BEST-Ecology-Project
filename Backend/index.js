const vision = require("@google-cloud/vision");
const cors = require("cors");
const express = require("express");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

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

async function isFromShein(imagePath) {
  try {
    const [result] = await client.webDetection(imagePath);
    const webDetection = result.webDetection;

    if (!webDetection) {
      return { isShein: false, url: null };
    }
    
    const targetKeywords = ['shein','aliexpress','romwe', 'temu', 'wish', 'joom'];
    
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
      return {
        isShein: true,
        url: foundItem.url,
      };
    }

    return { isShein: false, url: null };
  } catch (error) {
    console.error("Błąd:", error);
    return { isShein: false, url: null, error: error.message };
  }
}

app.post("/api/analyze", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      error: "Missing field: imageUrl is required",
    });
  }

  try {
    const result = await isFromShein(imageUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
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
      details: error.message,
    });
  }
});

// Piotrek: Zapis do bazy danych metadanych
/* 
{
  img: bytes[],
  name: String,
  description: String,
}
*/

app.post("/api/save_item", async (req, res) => {
    const { name, img, description } = req.body;
    
    if(!name || !img || !description){
      return res.status(400).json({
        error: "Miising field",
      });
    }
    console.log(name)
    console.log(img)
    console.log(description)

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
