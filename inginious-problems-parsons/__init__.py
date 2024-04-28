# -*- coding: utf-8 -*-
import json
import os
import sys
import random

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
        self._length_feedback = True if "length_feedback" in content else False
        self._size = len(content["choices"]) if "choices" in content else None
        self._adaptive_params = content["adaptive-params"] if "adaptive" in content else None
        self._distractors = content["distractors"] if "distractors" in content else None

        self._choices = []
        if "choices" not in content or not isinstance(content['choices'], (list, tuple)):
            raise Exception(problemid + " does not have choices or choices are not an array")
        for choice in content["choices"]:
            data = {}
            if "fail_msg" in choice:
                data["fail_msg"] = choice["fail_msg"]
            if "success_msg" in choice:
                data["success_msg"] = choice["success_msg"]
            if "pair" in choice:
                data["pair"] = True
                data["distractor"] = choice["distractor"]
            data['content'] = choice['content']
            data["id"] = choice["id"]
            self._choices.append(data)

        #  problem inputs
        self.inputs_raw = content["inputs"]
        inputs = json.loads(self.inputs_raw)
        self._inputs_lines = inputs["lines"]
        self._inputs_indent = inputs["indent"]
        # convert the lines into a sequence for the grading
        self._inputs_sequence = [-1 for _ in range(self._size)]
        for i in range(self._size):
            if self._inputs_lines[i] == -1:
                del self._inputs_sequence[-1]
            else:
                self._inputs_sequence[self._inputs_lines[i]] = i

    @classmethod
    def get_type(cls):
        return "parsons"

    def input_is_consistent(self, task_input, default_allowed_extension, default_max_size):
        return self.get_id() in task_input

    def input_type(self):
        return str

    def split_pairs(self):
        choices = []
        pairs = {}
        for choice in self._choices:
            if "pair" in choice:
                if choice["distractor"] in pairs:
                    pairs[choice["distractor"]].append(choice)
                else:
                    pairs[choice["distractor"]] = [choice]
        for choice in self._choices:
            if choice["id"] in pairs:
                pairs[choice["id"]].append(choice)
            elif choice["id"] not in pairs and "pair" not in choice:
                choices.append(choice)
        random.shuffle(choices)
        return choices, list(pairs.values())

    def LIS(self, answer):
        all_subsequence = []
        # Find all subsequence
        for i in range(len(answer)):
            current_subsequence = [answer[i]]
            current_index = self._inputs_sequence.index(answer[i]) if answer[i] in self._inputs_sequence else float('inf')
            index_from_last_element_added = -1
            for j in range(i, len(answer)):
                subsequent = self._inputs_sequence.index(answer[j]) if answer[j] in self._inputs_sequence else -1
                if (subsequent > current_index) and (index_from_last_element_added < subsequent):
                    current_subsequence.append(answer[j])
                    index_from_last_element_added = subsequent
            all_subsequence.append(current_subsequence)
        # Find the longest one
        longest_len = -1
        longest_sequence = None
        for sequence in all_subsequence:
            if len(sequence) > longest_len:
                longest_sequence = sequence
                longest_len = len(sequence)
        return longest_sequence

    def check_answer(self, task_input, language):
        # if submission is reloaded by course admin, answer input is a tuple, not a string anymore
        if type(task_input[self.get_id()]) is tuple:
            answer = json.loads(task_input[self.get_id()][0])
        else:
            answer = json.loads(task_input[self.get_id()])

        # Adaptive: if there is no state, create one
        if not "state" in answer:
            answer["state"] = [0, [], []]

        # generate the sequence of the answer following the blocks placement
        answer["sequence"] = [-1 for _ in range(self._size)]
        for i in range(self._size):
            if answer["lines"][i] == -1:
                del answer["sequence"][-1]
            else:
                answer["sequence"][answer["lines"][i]] = i

        solution_size = len(answer["sequence"])
        block_msg = ""
        invalid_count = len(self._inputs_sequence)
        LIS_result = self.LIS(answer["sequence"])
        # one value for each item placed inside the solution
        items_feedback = [-1 for _ in range(solution_size)]

        if self._length_feedback and solution_size < len(self._inputs_sequence):
            block_msg += "\n  - (-) Solution is too short"
        if self._length_feedback and solution_size > len(self._inputs_sequence):
            block_msg += "\n  - (-) Solution is too long"

        for i in range(len(answer["sequence"])):
            line_index = answer["sequence"][i]
            items_feedback[i] = 4
            if int(self._indication) > 1 and self._inputs_lines[line_index] == answer["lines"][line_index]:  # Check exact placement
                items_feedback[i] = 0
            elif len(LIS_result) > 1 and answer["sequence"][i] in LIS_result:  # Check LIS validation
                items_feedback[i] = 2
            elif len(self._inputs_sequence) == 1 and self._inputs_lines[line_index] == answer["lines"][line_index]:  # One block solution case
                items_feedback[i] = 2

            # Check indent, incorrect indentation is indicated by any feedback values that are odd
            if self._inputs_indent[answer["sequence"][i]] != answer['indent'][answer["sequence"][i]] and self._inputs_lines[answer["sequence"][i]] != -1:
                items_feedback[i] += 1

            if items_feedback[i] == 0 or (items_feedback[i] == 2 and int(self._indication) < 2):
                invalid_count -= 1

            # if indication is complete and block placement is not the exact placement
            # OR if indication is partial and block placement is not in the LIS
            block_failed = ((int(self._indication) == 2 and items_feedback[i] > 0) or (int(self._indication) < 2 and items_feedback[i] != 2))
            if block_failed and ("fail_msg" in self._choices[answer["sequence"][i]]):
                block_msg += ("\n  - (-) " + self._choices[answer["sequence"][i]]["fail_msg"])
            elif not block_failed and ("success_msg" in self._choices[answer["sequence"][i]]):
                block_msg += ("\n  - (+) " + self._choices[answer["sequence"][i]]["success_msg"])

        # Retrieve the success message for unused distractors, which is the correct solution.
        for i in range(len(self._inputs_lines)):
            if self._inputs_lines[i] == -1 and answer["lines"][i] == -1 and "success_msg" in self._choices[i]:
                block_msg += ("\n  - (+) " + self._choices[i]["success_msg"])

        # Solution is correct
        if invalid_count == 0 and solution_size == len(self._inputs_sequence):
            answer["state"][0] = -1  # Adaptive: solution found, not more help needed
            msg = [self._indication, str(items_feedback), (self._success_msg + block_msg), json.dumps(answer["state"])]
            return True, None, msg, 0, ""

        # Solution is incorrect
        grade = ((len(self._inputs_sequence) - invalid_count) / (len(self._inputs_sequence)) * 100)
        answer["state"][0] = answer["state"][0]+1 if answer["state"][0] != -1 else -1
        next_hint = self.__next_hint_interval(answer["state"][0])
        # Adaptive: new hint
        if self._adaptive_params is not None and (answer["state"][0] == self._adaptive_params[0] or (answer["state"][0] > self._adaptive_params[0] and (answer["state"][0] - self._adaptive_params[0]) % self._adaptive_params[1] == 0)):
            if not self.__disable_next_distractor(answer["state"]):  # Adaptive: disable one distractor if possible
                if not self.__next_block_fusion(answer["state"]):
                    answer["state"][0] = -1
        if self._adaptive_params is not None and answer["state"][0] != -1:
            block_msg += f"\n\nYou tried {answer['state'][0]} times. The next hint will be available in {next_hint} attempt(s)."
        elif self._adaptive_params is not None:
            block_msg += "\n\nAdditional hints are no longer available."

        msg = [self._indication, str(items_feedback), (self._fail_msg + block_msg),
               ("Grade: %.2f%%" % grade if self._ranged_grading else ""), json.dumps(answer["state"])]
        return False, None, msg, 0, "STATE"

    def __disable_next_distractor(self, state):
        if self._distractors is None:
            return False
        for distractor in self._distractors:
            if distractor not in state[1]:
                state[1].append(distractor)
                return True  # len(state[1]) < len(self._distractors)
        return False  # No more distractors

    def __next_block_fusion(self, state):
        # find not fused blocks
        not_fuzed = self.__find_not_fused(state)
        if len(not_fuzed) > 0:
            return self.__fuse_with_best_neighbor([not_fuzed[0]], not_fuzed[1:], state)
        min_len = float("inf")
        min_fusion = None
        for fusion in state[2]:
            if len(fusion) < min_len:
                min_len = len(fusion)
                min_fusion = fusion
        return self.__fuse_with_best_neighbor(min_fusion, not_fuzed, state)

    def __find_not_fused(self, state):
        choices = []
        for choice_id in self._inputs_sequence:
            not_fused = True
            for fusion in state[2]:
                if choice_id in fusion:
                    not_fused = False
            if not_fused:
                choices.append(choice_id)
        return choices

    def __fuse_with_best_neighbor(self, elem_to_fuse, not_fused, state):
        prev_index = self._inputs_sequence.index(elem_to_fuse[0])
        next_index = self._inputs_sequence.index(elem_to_fuse[-1])
        prev_choice = self._inputs_sequence[prev_index - 1] if prev_index > 0 else None
        next_choice = self._inputs_sequence[next_index + 1] if next_index < len(self._inputs_sequence) - 1 else None
        if prev_choice in not_fused:
            state[2].append([prev_choice] + elem_to_fuse)
            return (len(not_fused) + len(state[2])) > self._adaptive_params[2]
        if next_choice in not_fused:
            state[2].append(elem_to_fuse + [next_choice])
            return (len(not_fused) + len(state[2])) > self._adaptive_params[2]
        prev_fusion_index = self.__find_fusion_index(prev_choice, state)
        next_fusion_index = self.__find_fusion_index(next_choice, state)
        if prev_fusion_index is not None and next_fusion_index is not None:
            if len(prev_fusion_index) <= len(next_fusion_index):
                state[2][prev_fusion_index] += elem_to_fuse
                del state[2][state[2].index(elem_to_fuse)]
                return (len(not_fused) + len(state[2])) > self._adaptive_params[2]
            state[2][next_fusion_index] = elem_to_fuse + state[2][next_fusion_index]
            del state[2][state[2].index(elem_to_fuse)]
            return (len(not_fused) + len(state[2])) > self._adaptive_params[2]
        if prev_fusion_index is not None:
            state[2][prev_fusion_index] += elem_to_fuse
            del state[2][state[2].index(elem_to_fuse)]
            return (len(not_fused) + len(state[2])) > self._adaptive_params[2]
        if next_fusion_index is not None:
            state[2][next_fusion_index] = elem_to_fuse + state[2][next_fusion_index]
            del state[2][state[2].index(elem_to_fuse)]
            return (len(not_fused) + len(state[2])) > self._adaptive_params[2]
        return False

    def __find_fusion_index(self, choice_id, state):
        if choice_id is None:
            return None
        for index, fusion in enumerate(state[2]):
            if choice_id in fusion:
                return index


    def __next_hint_interval(self, tries):
        if self._adaptive_params is None:
            return -1
        if tries < self._adaptive_params[0]:
            return self._adaptive_params[0] - tries
        else:
            return self._adaptive_params[1] - ((tries - self._adaptive_params[0]) % self._adaptive_params[1])

    @classmethod
    def parse_problem(self, problem_content):
        parsed_content = Problem.parse_problem(problem_content)
        parsed_content["distractors"] = []
        if "indentation" in parsed_content:
            parsed_content["indentation"] = True
        if "length_feedback" in parsed_content:
            parsed_content["length_feedback"] = True
        if "adaptive" in parsed_content:
            parsed_content["adaptive"] = True
            if parsed_content["adaptive-start"] == "":
                parsed_content["adaptive-start"] = 1
            if parsed_content["adaptive-interval"] == "":
                parsed_content["adaptive-interval"] = 1
            if parsed_content["adaptive-stop"] == "":
                parsed_content["adaptive-stop"] = 1
            parsed_content["adaptive-params"] = (int(parsed_content["adaptive-start"]), int(parsed_content["adaptive-interval"]), int(parsed_content["adaptive-stop"]))
            del parsed_content["adaptive-start"]
            del parsed_content["adaptive-interval"]
            del parsed_content["adaptive-stop"]

        if "choices" in parsed_content:
            parsed_content["choices"] = [val for _, val in
                                         sorted(iter(parsed_content["choices"].items()), key=lambda x: int(x[0]))]
            for choice in parsed_content["choices"]:
                if choice["success_msg"] == "":
                    del choice["success_msg"]
                if choice["fail_msg"] == "":
                    del choice["fail_msg"]
                if choice["distractor"] == "":
                    del choice["distractor"]
                if "distractor" in choice:
                    parsed_content["distractors"].append(int(choice["id"]))
                if "pair" in choice:
                    choice["pair"] = True
        if len(parsed_content["distractors"]) == 0:
            del parsed_content["distractors"]
        return parsed_content

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
        choices, pairs = self.split_pairs()
        return template_helper.render("parsons.html", template_folder=PATH_TO_TEMPLATES,
                                      inputId=self.get_id(), header=header, choices=choices,
                                      pairs=pairs, indentation=self._indentation)

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
    plugin_manager.add_hook("javascript_footer", lambda: "/plugins/parsons/static/lib/FileSaver/FileSaver.min.js")
    course_factory.get_task_factory().add_problem_type(DisplayableParsonsProblem)


def auto_check(task_input, choices):
    n = len(choices)
    sorted_indent = [-1 for _ in range(n)]
    block_items = []
    for i in range(n):
        if choices[i]["content"][-1] == ':':
            block_items.append(task_input["lines"][i])
        if task_input["lines"][i] != -1:
            sorted_indent[task_input["lines"][i]] = task_input["indent"][i]

    # check for wrong indentation
    for i in range(n - 1):
        if sorted_indent[i + 1] == -1:
            return None

        diff_indent = sorted_indent[i + 1] - sorted_indent[i]
        if i in block_items and diff_indent < 1:
            msg = ['0', "[ ]", "The program fails to compile: there is at least one empty loop or statement."]
            return False, None, msg, 0, ""
        if diff_indent > 1 or (i not in block_items and diff_indent > 0):
            msg = ['0', "[ ]", "The program fails to compile: the indentation is not correct."]
            return False, None, msg, 0, ""
