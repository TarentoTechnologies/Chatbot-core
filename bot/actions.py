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
        medium_url = "&medium=" + self.get_medium_mapped(medium)
        grade_url  = "&gradeLevel=" + self.get_grade_mapped(grade) 
        url = base_url + board_url + medium_url + grade_url
        dispatcher.utter_message(text="Please visit <a href='" + url + "'> DIKSHA " + board + " Board</a>")
        return []

     def get_board_mapped(self, board):
        boards_values =  {
           "cbse": "CBSE",
           "tamil nadu": "State (Tamil Nadu)",
           "tamilnadu": "State (Tamil Nadu)",
           "tn": "State (Tamil Nadu)",
           "karnataka": "State (Karnataka)",
           "ka": "State (Karnataka)",
           "gujarat": "State (Gujarat)",
           "gj": "State (Gujarat)",
           "uttar pradesh": "State (Uttar Pradesh)",
           "uttarpradesh": "State (Uttar Pradesh)",
           "up": "State (Uttar Pradesh)",
           "punjab": "State (Punjab)",
           "pb": "State (Punjab)",
           "rajasthan": "State (Rajasthan)",
           "rj": "State (Rajasthan)",
           "manipur": "State (Manipur)",
           "mn": "State (Manipur)",
           "chhattisgarh": "State (Chhattisgarh)",
           "cg": "State (Chhattisgarh)",
           "maharashtra": "State (Maharashtra)",
           "mh": "State (Maharashtra)",
           "mitra": "State (Maharashtra)",
           "bihar": "State (Bihar)",
           "br": "State (Bihar)",
           "odisha": "State (Odisha)",
           "od": "State (Odisha)",
           "assam": "State (Assam)",
           "as": "State (Assam)",
           "madhya pradesh" : "State (Madhya Pradesh)",
           "madhyapradesh" : "State (Madhya Pradesh)",
           "mp" : "State (Madhya Pradesh)",
           "haryana": "State (Haryana)",
           "hr": "State (Haryana)",
           "nagaland": "State (Nagaland)",
           "ng": "State (Nagaland)",
           "goa": "State (Goa)",
           "ga": "State (Goa)",
           "telangana": "State (Telagana)",
           "ts": "State (Telagana)",
           "andhra pradesh": "State (Andhra Pradesh)",
           "andhrapradesh": "State (Andhra Pradesh)",
           "ap": "State (Andhra Pradesh)",
           "apex": "State (Andhra Pradesh)",
           "meghalaya": "State (Meghalaya)",
           "mg": "State (Meghalaya)",
           "jharkhand": "State (Jharkhand)",
           "jh": "State (Jharkhand)",
           "sikkim": "State (Sikkim)",
           "sk": "State (Sikkim)",
           "chandigarh": "State (Chandigarh)",
           "ch": "State (Chandigarh)",
           "igot-health": "iGOT-Health",
           "igot": "iGOT-Health",
           "igot health": "iGOT-Health"
        }
        return boards_values[board]

     def get_medium_mapped(self,medium):
        medium_values =  {
           "hindi":"Hindi",
           "sanskrit":"Sanskrit"
        }
        return medium_values[medium]

     def get_grade_mapped(self, grade):
        grade_values =  {
           "first":"Class 1",
           "1st"
           "second":"Class 2"
        }
        return grade_values[grade]