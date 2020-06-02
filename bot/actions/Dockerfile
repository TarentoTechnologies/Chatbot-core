FROM rasa/rasa:1.9.4-full as trainer
COPY . /app
RUN python -m spacy link en_core_web_sm en

FROM rasa/rasa:1.9.4-full
COPY --from=trainer /app .
CMD ["run", "actions"]