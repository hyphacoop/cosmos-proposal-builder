# Dockerfile
FROM python:3.11
RUN mkdir /usr/src/app
COPY src/main.py /usr/src/app
COPY sample-text.md /usr/src/app
COPY requirements.txt /usr/src/app

WORKDIR /usr/src/app

RUN pip install -r requirements.txt

CMD ["python", "./main.py"]