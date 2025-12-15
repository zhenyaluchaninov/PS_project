FROM golang:latest
WORKDIR /app
RUN apt-get update && apt-get install -yq
COPY . ./
ENTRYPOINT ["make", "build", "run"]
EXPOSE 8080