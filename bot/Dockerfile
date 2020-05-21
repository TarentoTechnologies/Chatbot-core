FROM rasa/rasa:1.9.4-full as trainer
COPY . /app
RUN rasa train

# Copy any additional custom requirements, if necessary (uncomment next line)
# COPY actions/requirements-actions.txt ./

# Install extra requirements for actions code, if necessary (uncomment next line)
# RUN pip install -r requirements-actions.txt

FROM rasa/rasa:1.9.4-full
COPY --from=trainer /app .
EXPOSE 5005
CMD ["run", "--enable-api"]

# Copy actions folder to working directory
FROM rasa/rasa:1.9.4-full
COPY ./actions /app/actions
EXPOSE 5055
CMD ["run actions"]