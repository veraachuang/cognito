from transformers import pipeline

# Load an NLP model for sentiment & style analysis
classifier = pipeline("text-classification", model="distilbert-base-uncased")

def analyze_writing_style(text):
    sentiment = classifier(text)[0]['label']  # e.g., "POSITIVE", "NEGATIVE", etc.
    return sentiment
