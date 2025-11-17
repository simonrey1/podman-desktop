# This is a comment
FROM alpine AS stage1

  # Another comment with indentation
FROM stage1 AS stage2

RUN echo "test"
