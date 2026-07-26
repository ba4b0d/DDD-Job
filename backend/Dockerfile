FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create appuser and chown app dir at build time
RUN mkdir -p /app/data /app/uploads && \
    groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app

# Entrypoint: chown mounted volumes (so appuser can write), then drop
# privileges via a small Python one-liner (avoids su-exec/gosu dep).
COPY --chown=root:root entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

# Container starts as root so entrypoint can chown the mounted volumes
# (which were created by an earlier root-running container), then drops
# to appuser before exec'ing the CMD.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

