# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/core/actions/#custom-actions/

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.forms import FormAction
from rasa_sdk.events import SlotSet
import spacy
import json
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


class FallbackAction(Action):
   def name(self):
      return "fallback_action"

   def run(self, dispatcher, tracker, domain):
      intent_ranking = tracker.latest_message.get('intent_ranking', [])
      doc = nlp(tracker.latest_message.get('text'))
      nouns = []
      adjs  = []
      for token in doc:
          if token.pos_ == 'NOUN':
               nouns.append(token.text)
          if token.pos_ == 'ADJ':
               adjs.append(token.text)
      if len(intent_ranking) > 0 :
            elements = [{"type":"low_confidence","entities":nouns, "adj":adjs, "intent" : "low_confidence"}]
            dispatcher.utter_message(json_message=elements)
      else :
         elements = [{"type":"low_confidence","entities":nouns, "adj":adjs, "intent" : "low_confidence"}]
         dispatcher.utter_message(json_message=elements)

class ActionContentForm(FormAction):
     def name(self) -> Text:
        return "content_form"

     @staticmethod
     def required_slots(tracker: Tracker) -> List[Text]:
        return ["board","grade", "medium"]

     def submit(self, dispatcher: CollectingDispatcher,
             tracker: Tracker,
             domain: Dict[Text, Any]) -> List[Dict]:
        base_url   = "https://diksha.gov.in/explore"

        board  = tracker.get_slot('board')
        grade  = tracker.get_slot('grade')
        medium = tracker.get_slot('medium')

        board_url  = "?board=" + self.get_board_mapped(board.lower())
        medium_url = "&medium=" + self.get_medium_mapped(medium.lower())
        grade_url  = "&gradeLevel=" + self.get_grade_mapped(grade) 
        url = base_url + board_url + medium_url + grade_url
        dispatcher.utter_message(text="Please visit <a href='" + url + "'> DIKSHA " + board + " Board</a>")
        return [SlotSet('board', None),SlotSet('grade', None), SlotSet('medium', None)]

     def get_board_mapped(self, board):
        data = ''
        with open('boards.json') as boards_values:
           data = json.load(boards_values)
        return data[board]

     def get_medium_mapped(self,medium):
        medium_values =  {
           "hindi":"Hindi",
           "sanskrit":"Sanskrit"
        }
        return medium_values[medium]

     def get_grade_mapped(self, grade):
        grade_values =  {
           "first":"Class 1",
           "1st":"Class 1",
           "1":"Class 1",
           "second":"Class 2",
           "2nd":"Class 2",
           "2":"Class 2"
        }
        return grade_values[grade]