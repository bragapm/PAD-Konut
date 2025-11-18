FROM ghcr.io/osgeo/gdal:ubuntu-full-3.9.3

# Install Poetry
ENV POETRY_HOME=/opt/poetry \
    POETRY_NO_INTERACTION=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_OPTIONS_SYSTEM_SITE_PACKAGES=1
RUN wget -O - https://install.python-poetry.org | python3 - --version 1.8.4
ENV PATH=$POETRY_HOME/bin:$PATH

WORKDIR /app

COPY pyproject.toml poetry.lock ./
RUN poetry install --without=dev --no-root && rm -rf $POETRY_CACHE_DIR

COPY . .
ENTRYPOINT ["poetry", "run", "dramatiq"]
CMD ["-p", "1", "-t", "1", "main"]
# T3 Micro has 2 vCPU ~ 2 processes
# T3 Micro has 1GB RAM ~ 2-4 threads is considered safe

