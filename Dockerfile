# Docker 版：不用在本機裝 ffmpeg、Chrome、語音，Mac / Windows / Linux 都一樣跑。
# 建置：npm run docker:build
# 使用（在專案根目錄）：
#   docker run --rm -v "$PWD/projects:/app/projects" offical-animation render projects/<名稱> --theme dark
#   docker run --rm -v "$PWD/projects:/app/projects" offical-animation record projects/<名稱>
#   docker run --rm -v "$PWD/projects:/app/projects" offical-animation voice projects/<名稱>
# Windows PowerShell 把 "$PWD/projects" 換成 "${PWD}\projects"
# 旁白在 Docker 裡用 tts-edge（微軟線上語音，需要網路）
FROM mcr.microsoft.com/playwright:v1.58.2-noble

ENV IN_DOCKER=1 \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3-pip fonts-noto-cjk fonts-noto-color-emoji \
 && pip3 install --no-cache-dir edge-tts \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
# Puppeteer 共用映像檔內建的 Playwright Chromium（Chrome 沒有 Linux ARM 版，Apple 晶片的 Mac 會抓不到）
RUN npm ci && ln -s "$(node -e "console.log(require('playwright').chromium.executablePath())")" /usr/local/bin/chromium
COPY . .

# 第一個參數是指令（render / record / voice / new / doctor），後面原樣交給它
ENTRYPOINT ["sh", "-c", "cmd=$1; shift; case $cmd in record|doctor) exec node $cmd.mjs \"$@\";; *) exec node $cmd.js \"$@\";; esac", "--"]
CMD ["doctor"]
