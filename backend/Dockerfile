FROM python:3.12-alpine

WORKDIR /usr/src/app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=3000

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

EXPOSE 3000
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "src.app:app"]
