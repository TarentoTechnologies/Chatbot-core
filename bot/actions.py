# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/core/actions/#custom-actions/

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import spacy
from rasa_core_sdk.forms import FormAction, REQUESTED_SLOT

#
#
nlp      = spacy.load('en_core_web_sm')


class ActionSubjectCourses(Action):
     def name(self) -> Text:
         return "action_subject_courses"

     def run(self, dispatcher: CollectingDispatcher,
             tracker: Tracker,
             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
         print('running action_subject_courses')
         dispatcher.utter_message(template="utter_fetching_data")
         print(tracker.latest_message.get('entities'))
         elements = [{"type":"subject_courses","entities":tracker.latest_message.get('entities'), "intent" : "subject_courses"}]
         dispatcher.utter_message(json_message=elements)
         #dispatcher.utter_custom_message(*elements)
         #dispatcher.utter_custom_json(elements)
         return []

class ContentForm(FormAction):

    def name(self):
        # type: () -> Text
        return "content_form"

    @staticmethod
    def required_slots(tracker: Tracker) -> List[Text]:

        return ["board", "subject", "grade"]
    def submit(self,
               dispatcher: CollectingDispatcher,
               tracker: Tracker,
               domain: Dict[Text, Any]) -> List[Dict]:
        # utter submit template
        print(tracker.get_slot("board"))
        print(tracker.get_slot("grade"))
        print(tracker.get_slot("subject"))
        dispatcher.utter_template('utter_submit', tracker)
        return []

class FallbackAction(Action):
   def name(self):
      return "fallback_action"

   def run(self, dispatcher, tracker, domain):
       if ('lockdown' in str(tracker.latest_message.get('text')).lower()) or  ('curfew' in str(tracker.latest_message.get('text')).lower()):
           dispatcher.utter_message(template="utter_lockdown")
       if ('covid' in str(tracker.latest_message.get('text')).lower()) or  ('corona' in str(tracker.latest_message.get('text')).lower()):
           dispatcher.utter_message(template="utter_covid")
       else:
           dispatcher.utter_message(template="utter_out_of_scope")

