import spacy
from typing import Dict, Any, List
from collections import Counter
from ..database.dataset_loader import BlogDatasetLoader


# Load the English language model
nlp = spacy.load("en_core_web_sm")

def preprocess_text(text: str) -> Dict[str, Any]:
    """
    Preprocess and analyze text, extracting various linguistic features.
    
    Args:
        text (str): Input text to analyze
        
    Returns:
        Dict containing various text analysis metrics
    """
    # Process the text with spaCy
    doc = nlp(text.lower())
    
    # Basic text statistics
    word_count = len([token for token in doc if not token.is_punct and not token.is_space])
    sentence_count = len(list(doc.sents))
    avg_word_length = sum(len(token.text) for token in doc if not token.is_punct) / word_count if word_count > 0 else 0
    
    # Extract lemmatized tokens (excluding stopwords and punctuation)
    tokens = [token.lemma_ for token in doc if not token.is_stop and token.is_alpha]
    
    # Get most common words
    word_freq = Counter(tokens).most_common(10)
    
    # Named Entity Recognition
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    
    # Part of speech analysis
    pos_counts = Counter([token.pos_ for token in doc])
    
    return {
        "preprocessed_text": " ".join(tokens),
        "statistics": {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "avg_word_length": round(avg_word_length, 2),
            "pos_distribution": dict(pos_counts)
        },
        "common_words": dict(word_freq),
        "named_entities": entities
    }

def analyze_writing_style(text: str) -> Dict[str, Any]:
    """
    Analyze the writing style of the text.
    
    Args:
        text (str): Input text to analyze
        
    Returns:
        Dict containing style metrics
    """
    doc = nlp(text)
    
    # Calculate sentence complexity
    sentence_lengths = [len([token for token in sent if not token.is_punct]) 
                       for sent in doc.sents]
    avg_sentence_length = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0
    
    # Analyze verb tenses
    verb_tenses = Counter([token.morph.get("Tense")[0] if token.morph.get("Tense") else "None" 
                          for token in doc if token.pos_ == "VERB"])
    
    # Count different types of punctuation
    punctuation = Counter([token.text for token in doc if token.is_punct])
    
    return {
        "style_metrics": {
            "avg_sentence_length": round(avg_sentence_length, 2),
            "verb_tenses": dict(verb_tenses),
            "punctuation_usage": dict(punctuation)
        }
    }

def batch_process_texts(texts: List[str], max_texts: int = 1000) -> List[Dict[str, Any]]:
    """
    Process multiple texts in batch.
    
    Args:
        texts (List[str]): List of texts to process
        max_texts (int): Maximum number of texts to process
        
    Returns:
        List of processed text analyses
    """
    results = []
    for text in texts[:max_texts]:
        analysis = preprocess_text(text)
        style = analyze_writing_style(text)
        results.append({**analysis, **style})
    return results

if __name__ == "__main__":
    # Test the preprocessing functions
    test_text = "The quick brown fox jumps over the lazy dog. It was a sunny day in the park. " \
                "John and Sarah went for a walk while their dog played fetch."
    
    # Test individual text processing
    analysis = preprocess_text(test_text)
    style = analyze_writing_style(test_text)
    
    print("\nText Analysis:")
    print(f"Preprocessed text: {analysis['preprocessed_text']}")
    print(f"Statistics: {analysis['statistics']}")
    print(f"Common words: {analysis['common_words']}")
    print(f"Named entities: {analysis['named_entities']}")
    print(f"Style metrics: {style['style_metrics']}")

# Load the dataset
loader = BlogDatasetLoader()
loader.load_dataset()

# Get some samples
samples = loader.get_sample(n=5)
texts = [sample['text'] for sample in samples]

# Process the texts
analyses = batch_process_texts(texts)

# Now you have detailed analysis of each text
for sample, analysis in zip(samples, analyses):
    print(f"Author: {sample['gender']}, Age: {sample['age']}")
    print(f"Text statistics: {analysis['statistics']}")
    print(f"Writing style: {analysis['style_metrics']}")
    print("---")