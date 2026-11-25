FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home --uid 10001 student
COPY --chown=student:student . .
RUN mkdir -p /app/artifacts && chown student:student /app/artifacts
USER student
EXPOSE 5055
CMD ["sh", "-c", "python -m pulsar.cli init-db && exec gunicorn --bind 0.0.0.0:5055 --workers 1 --threads 4 --timeout 180 'pulsar.web:create_app()'"]
