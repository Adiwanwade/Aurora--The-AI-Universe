import express from "express";
import cors from "cors";
// import { pipeline } from '@huggingface/transformers';
import { pipeline, read_audio } from "@xenova/transformers";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import wavefile from 'wavefile';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer to store files temporarily
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "Access-Control-Allow-Credentials",
  ],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sentiment Analysis endpoint
app.post("/api/sentiment", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const sentiment = await pipeline("sentiment-analysis");
    const result = await sentiment(text);
    res.json(result);
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// url: https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav
// Speech Recognition endpoint
app.post("/api/asr", async (req, res) => {
  try {
    const { imageUrl } = req.body; // Change to imageUrl for clarity
    if (!imageUrl) {
      return res.status(400).json({ error: "No audio URL provided" });
    }

    // Fetch the audio data from the URL
    let buffer = Buffer.from(
      await fetch(imageUrl).then((x) => x.arrayBuffer())
    );

    // Read .wav file and convert it to required format
    let wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth("32f"); // Pipeline expects input as a Float32Array
    wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      if (audioData.length > 1) {
        const SCALING_FACTOR = Math.sqrt(2);

        // Merge channels (into first channel to save memory)
        for (let i = 0; i < audioData[0].length; ++i) {
          audioData[0][i] =
            (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
        }
      }

      // Select first channel
      audioData = audioData[0];
    } // Use read_audio to obtain audio data

    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small.en"
    );
    const result = await transcriber(audioData); // Pass the audio data directly

    res.json(result);
  } catch (error) {
    console.error("ASR error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Translation endpoint
app.post("/api/translation", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const translator = await pipeline(
      "translation",
      "Xenova/nllb-200-distilled-600M",
      { dtype: "q4", device: "webgpu" }
    );
    const result = await translator(
      text,
      {
        src_lang: "eng_Latn",
        tgt_lang: "hin_Deva",
      },
      { dtype: "q4" }
    );

    res.json(result);
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Text Generation endpoint
app.post("/api/text-generation", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const poet = await pipeline(
      "text2text-generation",
      "Xenova/LaMini-Flan-T5-783M",
      { dtype: "q4", device: "webgpu" }
    );
    const result = await poet(text, {
        max_new_tokens: 200,
        temperature: 0.9,
        repetition_penalty: 2.0,
        no_repeat_ngram_size: 3,
    });

    res.json(result);
  } catch (error) {
    console.error("Text generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Url: https://live.staticflickr.com/7046/6955145052_3e2fa1edbf_w.jpg
// Image Classification endpoint
app.post("/api/image-classification", async (req, res) => {
  try {
    const imageUrl = req.body.imageUrl;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    // Initialize the classifier
    const classifier = await pipeline(
      "image-classification",
      "Xenova/vit-base-patch16-224",
      { dtype: "q4", device: "webgpu" }
    );
    const result = await classifier(imageUrl);

    res.json(result);
  } catch (error) {
    console.error("Image classification error:", error);
    res.status(500).json({ error: error.message });
  }
});

// url:https://live.staticflickr.com/7046/6955145052_3e2fa1edbf_w.jpg

// Image to Text endpoint
app.post("/api/image-to-text",  async (req, res) => {
  try {
    const imageUrl = req.body.imageUrl;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    const captioner = await pipeline(
      "image-to-text",
      "Xenova/vit-gpt2-image-captioning",
      { dtype: "q4", device: "webgpu" }
    );
    const result = await captioner(imageUrl);

  

    res.json(result);
  } catch (error) {
    console.error("Image to text error:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Text to Speech endpoint
app.post("/api/text-to-speech", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const synthesizer = await pipeline(
      "text-to-speech",
      "Xenova/speecht5_tts",
      { quantized: false },
      { dtype: "q4", device: "webgpu" }
    );
    const speaker_embeddings =
      "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin";
    const result = await synthesizer(text, { speaker_embeddings });

    // Generate a temporary file path for the audio
    const audioFilePath = path.join(__dirname, "temp_audio.wav");

    // Write the audio data to a file
    fs.writeFileSync(audioFilePath, Buffer.from(result.audio));

    // Set headers to prompt a download
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="generated_audio.wav"'
    );
    res.setHeader("Content-Type", "audio/wav");

    // Stream the file to the client
    const fileStream = fs.createReadStream(audioFilePath);
    fileStream.pipe(res);

    // Clean up the file after sending
    fileStream.on("end", () => {
      fs.unlinkSync(audioFilePath);
    });
  } catch (error) {
    console.error("Text to speech error:", error);
    res.status(500).json({ error: error.message });
  }
});



app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
