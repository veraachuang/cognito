from setuptools import setup, find_packages

setup(
    name="cognito",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask>=3.0.2",
        "datasets>=2.14.0",
        "transformers>=4.46.0",
        "spacy>=3.7.2",
        "flask-cors>=5.0.0",
        "python-dotenv>=1.0.0"
    ],
    python_requires=">=3.8",
) 