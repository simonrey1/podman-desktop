FROM alpine AS base
RUN echo "hello"

FROM base AS builder
COPY . .
RUN build

FROM builder AS final
CMD ["sh"]
