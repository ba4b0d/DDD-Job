FROM python:3.11-slim

# su-exec is a tiny setuid binary that drops privileges. Used by entrypoint
# to chown mounted volumes (created as root by an earlier container) and
# then re-exec the CMD as appuser.
RUN apt-get update && apt-get install -y --no-install-recommends su-exec \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create appuser and chown app dir at build time
RUN mkdir -p /app/data /app/uploads && \
    groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app

# Entrypoint: chown mounted volumes (so appuser can write), then drop privs.
COPY --chown=root:root entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

# Run as root so entrypoint can chown, then it su-execs to appuser.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

