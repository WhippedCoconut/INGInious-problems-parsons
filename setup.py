#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

setup(
    name="inginious-problems-parsons",
    version="0.1dev0",
    description="Plugin to add parsons problem type",
    packages=find_packages(),
    install_requires=["inginious>=0.5.dev0"],
    tests_require=[],
    extras_require={},
    scripts=[],
    include_package_data=True,
    author="Corentin Lengele",
    author_email="corentin.lengele@student.uclouvain.be",
    license="AGPL 3",
    url="https://github.com/WhippedCoconut/INGInious-problems-parsons"
)
