FROM python:3.11-slim

WORKDIR /app

# 依存パッケージのインストール
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 依存パッケージをインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY app.py .
COPY templates/ templates/
COPY static/ static/

# ポート5000を公開
EXPOSE 5000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/login || exit 1

# Gunicorn で起動
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000", "--workers", "3", "--threads", "4", "--timeout", "300", "--keep-alive", "5", "--log-level", "info"]
