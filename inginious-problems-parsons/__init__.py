# -*- coding: utf-8 -*-
import json
import os
import sys

from flask import send_from_directory

from inginious.common.tasks_problems import Problem
from inginious.frontend.pages.utils import INGIniousPage
from inginious.frontend.task_problems import DisplayableProblem
from inginious.frontend.parsable_text import ParsableText

__version__ = "0.1.dev0"

PATH_TO_PLUGIN = os.path.abspath(os.path.dirname(__file__))
PATH_TO_TEMPLATES = os.path.join(PATH_TO_PLUGIN, "templates")


class StaticMockPage(INGIniousPage):
    def GET(self, path):
        return send_from_directory(os.path.join(PATH_TO_PLUGIN, "static"), path)

    def POST(self, path):
        return self.GET(path)

class ParsonsProblem(Problem):
    def __init__(self, problemid, content, translations, taskfs):
        Problem.__init__(self, problemid, content, translations, taskfs)
        self._header = content['header'] if "header" in content else ""
        self._success_msg = content["success_msg"] if content["success_msg"] != "" else "Success."
        self._fail_msg = content["fail_msg"] if content["fail_msg"] != "" else "Failed."
        self._indication = content["indication"]
        self._indentation = True if "indentation" in content else False
        self._ranged_grading = True if "grading" in content else False

        self._choices = []
        if "choices" not in content or not isinstance(content['choices'], (list, tuple)):
            raise Exception(problemid + " does not have choices or choices are not an array")
        for index, choice in enumerate(content["choices"]):
            data = {"index": index}
            if 'content' not in choice:
                raise Exception("A choice in " + problemid + " does not have content")
            data['content'] = choice['content']
            self._choices.append(data)

        self._size = len(self._choices)

        self.inputs_raw = content["inputs"]
        inputs = json.loads(self.inputs_raw)
        self._inputs_lines = inputs["lines"]
        self._inputs_indent = inputs["indent"]

    @classmethod
    def get_type(cls):
        return "parsons"

    def input_is_consistent(self, task_input, default_allowed_extension, default_max_size):
        return self.get_id() in task_input

    def input_type(self):
        return str

    def check_answer(self, task_input, language):
        answer = json.loads(task_input[self.get_id()])

        invalid_count = 0
        # one value for each item, {0: ok, 1: wrong placement, 2: wrong indent}
        items_feedback = [0 for _ in range(self._size)]
        for i in range(self._size):
            if self._inputs_lines[i] != answer['lines'][i]:  # invalid placement
                items_feedback[i] = 1
                invalid_count += 1
            elif self._inputs_indent[i] != answer['indent'][i]:  # invalid indentation
                items_feedback[i] = 2
                invalid_count += 1

        if invalid_count > 0:
            grade = ((self._size - invalid_count) / self._size) * 100
            msg = [self._indication, str(items_feedback), self._fail_msg, ("Grade: %.2f%%" % grade if self._ranged_grading else "")]
            return False, None, msg, 0, ""
        else:
            msg = [self._indication, str(items_feedback), self._success_msg]
            return True, None, msg, 0, ""

    @classmethod
    def parse_problem(self, problem_content):
        parsed_content = Problem.parse_problem(problem_content)
        if "indentation" in parsed_content:
            parsed_content["indentation"] = True

        if "choices" in parsed_content:
            parsed_content["choices"] = [val for _, val in
                                         sorted(iter(parsed_content["choices"].items()), key=lambda x: int(x[0]))]
            for choice in parsed_content["choices"]:
                if "distractor" in choice:
                    choice["distractor"] = True
        print(parsed_content, sys.stdout)
        return parsed_content

    @classmethod
    def get_text_fields(cls):
        print("GET TEXT FIELD", sys.stdout)
        return Problem.get_text_fields()

class DisplayableParsonsProblem(ParsonsProblem, DisplayableProblem):
    def __init__(self, problemid, content, translations, taskfs):
        ParsonsProblem.__init__(self, problemid, content, translations, taskfs)

    @classmethod
    def get_type_name(self, language):
        return "parsons"

    def show_input(self, template_helper, language, seed):
        """ Show ParsonsProblem """
        header = ParsableText(self.gettext(language, self._header), "rst",
                              translation=self.get_translation_obj(language))
        return template_helper.render("parsons.html", template_folder=PATH_TO_TEMPLATES,
                                      inputId=self.get_id(), header=header, choices=self._choices, indentation=self._indentation)

    @classmethod
    def show_editbox(cls, template_helper, key, language):
        return template_helper.render("parsons_edit.html", template_folder=PATH_TO_TEMPLATES, key=key)

    @classmethod
    def show_editbox_templates(cls, template_helper, key, language):
        return template_helper.render("parsons_edit_template.html", template_folder=PATH_TO_TEMPLATES, key=key)


def init(plugin_manager, course_factory, client, plugin_config):
    plugin_manager.add_page('/plugins/parsons/static/<path:path>', StaticMockPage.as_view("parsonsproblemstaticpage"))
    plugin_manager.add_hook("javascript_footer", lambda: "/plugins/parsons/static/parsons.js")
    plugin_manager.add_hook("javascript_footer", lambda: "/plugins/parsons/static/parsons_drag_and_drop.js")
    course_factory.get_task_factory().add_problem_type(DisplayableParsonsProblem)
