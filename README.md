# NoTeeline: Supporting Real-Time, Personalized Notetaking with LLM-Enhanced Micronotes

<p align = "center">
    <img src="Assets/summary.png" alt="NoTeeline Summary" width="800px">
    <br>
    <b>Write, Organize, Review, and Summarize Personalized Notes</b>
</p>

<p align = "center">
    <a target = "_blank" href = "https://noteeline.vercel.app/">Website</a> •
    <a target = "_blank" href = "https://doi.org/10.1145/3708359.3712086">Doi</a> •
    <a target = "_blank" href = "https://arxiv.org/abs/2409.16493">Arxiv</a> •
    <a target = "_blank" href = "https://huggingface.co/papers/2409.16493">Huggingface</a>
</p>

## ✨ Teaser

https://github.com/user-attachments/assets/9ab7edcc-3d8a-4030-a01f-6c076db3605e

You can also find the long preview in <a target = "_blank" href = "https://www.youtube.com/watch?v=UUWTUbET86I">YouTube</a> for a better quality.

## 📰 News
- `[13-09-2026]` This fork now runs fully self-hosted: it transcribes a live in-person lecture from your microphone with a local Whisper model instead of pulling a YouTube transcript, and expands micronotes with a local Ollama model instead of the OpenAI API. Nothing leaves your machine, and no API key is needed.
- `[13-09-2026]` The whole thing runs from one command with Docker — see **Running it (Docker)** below.
- `[28-01-2025]` The micronotes can be expanded using the OpenAI API which produces streamlined real-time output
- `[28-01-2025]` A personal OpenAI API key is to be provided on the landing page of NoTeeline for the app to work
- `[28-01-2025]` NoTeeline got featured in Huggingface, [link](https://huggingface.co/papers/2409.16493)

## 🐳 Running it (Docker)
This is the easiest way to run the app — one command starts the frontend, backend, a local Whisper
transcription server, and a local Ollama LLM together:
```
$ docker compose up -d
```
Then open `http://localhost:3000`. The first run pulls the LLM and Whisper models in the background
(a few GB total), so give it a few minutes the first time — the app itself is usable immediately
while that finishes. Everything after that is instant, since the models are cached in Docker volumes.

Click **Start Recording Lecture**, let it listen, and type short keypoints as you go — they'll be
expanded into full notes using your local model and the live transcript around the moment you typed
them.

## 🛠️ Local Development
If you'd rather run the pieces yourself instead of through Docker:
 - Clone the repo using the following command:
	`$ git clone https://github.com/Xopher00/NoTeeline.git`
- If *npm* is the desired package manager, then just replace the command:
	- `yarn` with the command `npm install`
	- `yarn dev` with the command `npm run dev`

You'll also need [Ollama](https://ollama.com) running locally with a model pulled (e.g.
`ollama pull llama3.1:8b`), and a local Whisper server (`Backend/whisper_server.py`, a small FastAPI
app built on `faster-whisper`) running on port 8000.

### 💻 Frontend
- `cd` into the folder **Frontend** Run `yarn` to install all the necessary packages
- While the current working directory is **Frontend**, run the command `yarn dev` to start the frontend

### ⚙️ Backend
- To start the server, `cd` into the **Backend** folder and run `yarn` to install all the necessary packages for the backend server
- While in the **Backend** directory, run the command `node index.js` to start the server at port 4000
- In a separate terminal, set up a Python virtual environment in **Backend** and install
  `faster-whisper fastapi uvicorn python-multipart`, then run
  `uvicorn whisper_server:app --host 0.0.0.0 --port 8000` to start the transcription server

## 📜 Citation
If you use the NoTeeline code or data, please cite our paper:
```
@inproceedings{faria2025noteeline,
  author = {Faria Huq, Abdus Samee, David Chuan-En Lin, Alice Xiaodi Tang, and Jeffrey P Bigham},
  title = {NoTeeline: Supporting Real-Time, Personalized Notetaking with LLM-Enhanced Micronotes},
  year = {2025},
  publisher = {Association for Computing Machinery},
  address = {New York, NY, USA},
  booktitle = {Proceedings of the 30th International Conference on Intelligent User Interfaces},
  numpages = {18},
  location = {Cagliari, Italy}
}
```
<br/>

## 🌟 Questions?
Please feel free to email Faria (fhuq@cs.cmu.edu)/ Samee (abdussamee16@gmail.com). Alternatively, you can open a <a target = "_blank" href = "https://github.com/oaishi/NoTeeline/issues">new issue over github</a>!
