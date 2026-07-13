FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    default-jdk \
    golang-go \
    rustc \
    ruby-full \
    php-cli \
    lua5.3 \
    perl \
    r-base \
    git curl wget unzip zip \
    net-tools iproute2 \
    && rm -rf /var/lib/apt/lists/*

RUN [ -e /usr/bin/lua ] || ln -s /usr/bin/lua5.3 /usr/bin/lua

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g tsx && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /frontend/dist ./static

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]