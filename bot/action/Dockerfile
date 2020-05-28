FROM rasa/rasa:1.9.4-full as trainer
COPY . /app

FROM rasa/rasa:1.9.4-full
COPY --from=trainer /app .
CMD ["run", "actions"]
