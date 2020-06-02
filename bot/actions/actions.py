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
import os.path 
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
        print('Grad', grade)
        print('Medium', medium)
        print('Board', board)
        board_url  = "?board=" + self.get_board_mapped(board.lower())
        medium_url = "&medium=" + self.get_medium_mapped(medium.lower())
        grade_url  = "&gradeLevel=" + self.get_grade_mapped(grade.lower()) 
        url = base_url + board_url + medium_url + grade_url

        dispatcher.utter_message(text="<span> Great! I understand that you are looking for content of "+ board + " board, class " + grade + ", " + medium + " medium .<br>" 
         "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>")
        return [SlotSet('board', None),SlotSet('grade', None), SlotSet('medium', None)]

     def get_board_mapped(self, board):
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/boards.json')
        with open(filename) as boards_values:
           data = json.load(boards_values)
        return data[board]

     def get_medium_mapped(self,medium):
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/mediums.json')
        with open(filename) as mediums_values:
           data = json.load(mediums_values)
        return data[medium]

     def get_grade_mapped(self, grade):
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/grades.json')
        with open(filename) as grades_values:
           data = json.load(grades_values)
        return data[grade]