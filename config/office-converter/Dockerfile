FROM debian:bookworm-slim@sha256:734a72b3d6142a71993b4bc580ca01d8ca687f77a2c422d96a961d3376b179bc
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-impress libgsf-bin \
    && rm -rf /var/lib/apt/lists/*
COPY convert.sh /usr/local/bin/convert-office
RUN sed -i 's/\r$//' /usr/local/bin/convert-office
USER 65534:65534
ENV HOME=/scratch
WORKDIR /scratch
ENTRYPOINT ["/usr/bin/timeout", "12s", "/bin/sh", "/usr/local/bin/convert-office"]
