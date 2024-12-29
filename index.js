import dotenv from "dotenv";
dotenv.config();
import express from "express";
import axios from "axios";


const app = express();
app.use(express.json());


// D-ID API credentials
const DID_BASE_URL = "https://api.d-id.com";
const DID_API_KEY = process.env.DID_API_KEY;


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


app.get("/generate-avatar", async (req, res) => {
    const { input_text, source_url } = req.query;

    if (!input_text) {
        return res.status(400).json({ error: "Input text is required" });
    }

    try {
        
        const createTalkPayload = {
            "source_url": source_url || "https://i.ibb.co/cLxgCgk/avatar-image.png",
            "script": {
                "type": "text",
                "subtitles": "false",
                "provider": {
                    "type": "microsoft",
                    "voice_id": "Sara"
                },
                "input": input_text || "Making videos is easy with D-ID"
            },
            "config": {
                "fluent": "false",
                "pad_audio": "0.0"
            }
        }

        const headers = {
            "Content-Type": "application/json",
            "Authorization": "Basic d2kyMjM0ODhAZ21haWwuY29t:k9850n2drmLXuA7CsAFZR"
        }

        const createResponse = await axios.post(
            `${DID_BASE_URL}/talks`,
            createTalkPayload,
            {
                headers: headers
            }
        );

        const videoId = createResponse.data.id;

        
        let videoUrl = null;
        for (let attempt = 0; attempt < 15; attempt++) {
            const statusResponse = await axios.get(
                `${DID_BASE_URL}/talks/${videoId}`,
                {
                    headers: headers
                }
            );

            const res = statusResponse.data;

            if (res.status === "done") {
                videoUrl = res?.result_url;
                break;
            }

            
            await sleep(5000);
        }

        if (!videoUrl) {
            return res.status(500).json({ error: "Video generation timed out." });
        }


       
        const videoResponse = await axios.get(videoUrl, {
            responseType: "stream", 
        });

      
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Transfer-Encoding", "chunked");

        
        videoResponse.data.pipe(res);

        
        videoResponse.data.on("error", (err) => {
            console.error("Error while streaming video:", err.message);
            res.end();
        });
    } catch (error) {
        console.error("Error in /generate-avatar:", error.response?.data);
        res.status(500).json({ error: "Failed to generate avatar." });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});