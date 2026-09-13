# Model weights aren't baked in, kept out of the image so builds stay fast;
# docker-entrypoint.sh pulls them into a named volume on first `docker run`.
FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl zstd python3 python3-venv python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

COPY Backend/package.json Backend/yarn.lock* ./Backend/
RUN cd Backend && yarn install --frozen-lockfile || yarn install

COPY Frontend/package.json Frontend/yarn.lock* ./Frontend/
RUN cd Frontend && yarn install --frozen-lockfile || yarn install

COPY Backend ./Backend
COPY Frontend ./Frontend

RUN cd Frontend && yarn build

RUN cd Backend && python3 -m venv whisper-venv \
    && ./whisper-venv/bin/pip install --no-cache-dir faster-whisper fastapi uvicorn python-multipart

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV LOCAL_MODEL=llama3.1:8b
EXPOSE 3000 4000 8000 11434

ENTRYPOINT ["/app/docker-entrypoint.sh"]
