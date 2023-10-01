# -*- coding: utf-8 -*-

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
        self._shuffle = True if 'shuffle' in content else False
        self._choices = []
        if "choices" not in content or not isinstance(content['choices'], (list, tuple)):
            raise Exception(problemid + " does not have choices or choices are not an array")
        for index, choice in enumerate(content["choices"]):
            data = {"index": index}
            if 'content' not in choice:
                raise Exception("A choice in " + problemid + " does not have content")
            data['content'] = choice['content']
            if 'conditions' not in choice:
                raise Exception("A choice in " + problemid + " does not have conditions")
            data['conditions'] = choice['conditions']
            if 'distractor' in choice:
                data['distractor'] = True
            if 'nested' in choice:
                data['nested'] = True
            self._choices.append(data)

    @classmethod
    def get_type(cls):
        return "parsons"

    def input_is_consistent(self, task_input, default_allowed_extension, default_max_size):
        return self.get_id() in task_input

    def input_type(self):
        return str

    def check_answer(self, task_input, language):
        return True, None, ["correct answer"], 0, ""

    @classmethod
    def parse_problem(self, problem_content):
        problem_content = Problem.parse_problem(problem_content)
        if "shuffle" in problem_content:
            problem_content["distractor"] = True

        if "choices" in problem_content:
            problem_content["choices"] = [val for _, val in
                                          sorted(iter(problem_content["choices"].items()), key=lambda x: int(x[0]))]
            for choice in problem_content["choices"]:
                if "distractor" in choice:
                    choice["distractor"] = True
                if "nested" in choice:
                    choice["nested"] = True
        return problem_content

    @classmethod
    def get_text_fields(cls):
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
                                      inputId=self.get_id(), header=header, choices=self._choices)

    @classmethod
    def show_editbox(cls, template_helper, key, language):
        return template_helper.render("parsons_edit.html", template_folder=PATH_TO_TEMPLATES, key=key)

    @classmethod
    def show_editbox_templates(cls, template_helper, key, language):
        return template_helper.render("parsons_edit_template.html", template_folder=PATH_TO_TEMPLATES, key=key)


def init(plugin_manager, course_factory, client, plugin_config):
    plugin_manager.add_page('/plugins/parsons/static/<path:path>', StaticMockPage.as_view("parsonsproblemstaticpage"))
    plugin_manager.add_hook("javascript_footer", lambda: "/plugins/parsons/static/lib/Sortable.min.js")
    plugin_manager.add_hook("javascript_footer", lambda: "/plugins/parsons/static/parsons.js")
    course_factory.get_task_factory().add_problem_type(DisplayableParsonsProblem)