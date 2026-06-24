FROM python:3.12-alpine AS base

WORKDIR /usr/src/app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/usr/src/app \
    PORT=3000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS test

COPY requirements-dev.txt pyproject.toml ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY src ./src
COPY tests ./tests

CMD ["sh", "-c", "ruff check src tests && pytest"]

FROM base AS runtime

COPY src ./src

EXPOSE 3000
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "src.app:app"]
