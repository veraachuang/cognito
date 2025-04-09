from setuptools import setup, find_packages

setup(
    name="writeai",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask>=3.0.2",
        "datasets>=3.3.2",
        "transformers>=4.49.0",
        "spacy>=3.8.4",
    ],
    python_requires=">=3.8",
) 