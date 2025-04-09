from typing import Dict, List, Any
import spacy
from collections import Counter, defaultdict
import re
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Initialize OpenAI client
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

client = OpenAI(api_key=api_key)

def extract_key_topics(text: str, text_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract and rank key topics from the text"""
    # Use OpenAI to identify key topics
    prompt = f"""
    Analyze the following text and identify the 5 most important topics or themes.
    For each topic, provide:
    1. The topic name
    2. Its importance score (1-10)
    3. A relevant quote or context from the text

    Text: {text}

    Respond in a structured format that can be easily parsed.
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that analyzes text and identifies key topics."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )

    # Process the response to extract topics
    topics = []
    try:
        content = response.choices[0].message.content
        # Parse the content to extract topics (implementation depends on the response format)
        # For now, we'll also use spaCy as a backup
        doc = nlp(text)
        
        # Collect potential topics with their importance scores
        topic_dict = defaultdict(lambda: {"score": 0, "context": set()})
        
        for chunk in doc.noun_chunks:
            if not chunk.root.is_stop and len(chunk.text.split()) <= 3:
                position_score = 1 - (chunk.start / len(doc))
                topic_dict[chunk.text.lower()]["score"] += (1 + position_score)
                topic_dict[chunk.text.lower()]["context"].add(chunk.sent.text)
        
        topics = [
            {
                "topic": topic,
                "score": data["score"],
                "context": list(data["context"])
            }
            for topic, data in topic_dict.items()
        ]
        topics.sort(key=lambda x: x["score"], reverse=True)
        
    except Exception as e:
        print(f"Error processing OpenAI response: {e}")
    
    return topics[:5]

def analyze_text_structure(text: str) -> Dict[str, Any]:
    """Analyze the structure and flow of the text"""
    doc = nlp(text)
    
    # Analyze paragraphs
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    # Analyze sentence types
    sentence_types = {
        "statements": 0,
        "questions": 0,
        "complex": 0  # sentences with multiple clauses
    }
    
    transition_words = set([
        "however", "therefore", "furthermore", "moreover",
        "consequently", "meanwhile", "nevertheless", "although"
    ])
    
    transitions = 0
    
    for sent in doc.sents:
        # Count sentence types
        if "?" in sent.text:
            sentence_types["questions"] += 1
        elif len([token for token in sent if token.dep_ == "mark"]) > 0:
            sentence_types["complex"] += 1
        else:
            sentence_types["statements"] += 1
            
        # Count transition words
        if any(word.lower() in transition_words for word in sent.text.split()):
            transitions += 1
    
    return {
        "num_paragraphs": len(paragraphs),
        "avg_paragraph_length": sum(len(p.split()) for p in paragraphs) / len(paragraphs) if paragraphs else 0,
        "sentence_types": sentence_types,
        "transitions": transitions
    }

def generate_section_points(topic: Dict[str, Any], text_analysis: Dict[str, Any]) -> List[str]:
    """Generate specific points for a section based on the topic and its context"""
    prompt = f"""
    Create 3-4 specific discussion points for the topic: {topic['topic']}
    
    Context from the text:
    {' '.join(topic['context'])}
    
    Generate points that:
    1. Are specific and actionable
    2. Follow a logical progression
    3. Include analysis and examples
    4. Connect to the overall text
    
    Format each point as a clear, complete sentence.
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that creates detailed outline points."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )

    try:
        content = response.choices[0].message.content
        # Split the content into individual points and clean them up
        points = [point.strip() for point in content.split('\n') if point.strip()]
        return points[:3]  # Return top 3 points
    except Exception as e:
        print(f"Error generating section points: {e}")
        return [
            f"Analyze the key aspects of {topic['topic']}",
            f"Discuss the significance of {topic['topic']}",
            f"Provide examples related to {topic['topic']}"
        ]

def generate_outline(text: str, text_analysis: Dict[str, Any], style_analysis: Dict[str, Any], style_examples: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a structured outline based on text analysis and AI assistance.
    """
    # Extract key topics
    topics = extract_key_topics(text, text_analysis)
    
    # Create the main outline prompt
    outline_prompt = f"""
    Create a detailed document outline based on this text:
    {text}

    Key topics identified:
    {', '.join(t['topic'] for t in topics)}

    Writing style analysis:
    - Average sentence length: {style_analysis["style_metrics"]["avg_sentence_length"]} words
    - Preferred tense: {style_analysis["style_metrics"]["verb_tenses"]}

    Include:
    1. An introduction section
    2. Main body sections for each key topic
    3. A conclusion section
    4. Specific points under each section
    5. Writing style recommendations

    Format the response as a structured outline with clear sections and points.
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that creates detailed document outlines."},
            {"role": "user", "content": outline_prompt}
        ],
        temperature=0.7
    )

    try:
        # Process the AI-generated outline
        content = response.choices[0].message.content
        
        # Create sections array
        sections = []
        
        # Add introduction
        sections.append({
            "title": "Introduction",
            "key_points": [
                "Set context and background",
                f"Introduce main topics: {', '.join(t['topic'] for t in topics[:3])}",
                "State the purpose or thesis"
            ],
            "suggested_length": int(text_analysis["statistics"]["word_count"] * 0.15)
        })
        
        # Add main body sections
        for topic in topics:
            sections.append({
                "title": topic["topic"].title(),
                "key_points": generate_section_points(topic, text_analysis),
                "suggested_length": int(text_analysis["statistics"]["word_count"] * 0.15)
            })
        
        # Add conclusion
        sections.append({
            "title": "Conclusion",
            "key_points": [
                "Summarize key findings",
                "Synthesize main arguments",
                "Provide final thoughts or recommendations"
            ],
            "suggested_length": int(text_analysis["statistics"]["word_count"] * 0.1)
        })

        return {
            "title": "Document Outline",
            "sections": sections,
            "writing_style": {
                "sentence_length": style_analysis["style_metrics"]["avg_sentence_length"],
                "recommended_tense": max(style_analysis["style_metrics"]["verb_tenses"].items(), 
                                      key=lambda x: x[1])[0] if style_analysis["style_metrics"]["verb_tenses"] else "Present"
            }
        }

    except Exception as e:
        print(f"Error generating outline: {e}")
        # Fall back to the basic outline structure
        return {
            "title": "Document Outline",
            "sections": [
                {
                    "title": "Introduction",
                    "key_points": ["Set context", "Introduce topic", "State purpose"],
                    "suggested_length": int(text_analysis["statistics"]["word_count"] * 0.15)
                },
                *[{
                    "title": topic["topic"].title(),
                    "key_points": generate_section_points(topic, text_analysis),
                    "suggested_length": int(text_analysis["statistics"]["word_count"] * 0.15)
                } for topic in topics],
                {
                    "title": "Conclusion",
                    "key_points": ["Summarize findings", "Final thoughts", "Future implications"],
                    "suggested_length": int(text_analysis["statistics"]["word_count"] * 0.1)
                }
            ],
            "writing_style": {
                "sentence_length": style_analysis["style_metrics"]["avg_sentence_length"],
                "recommended_tense": "Present"
            }
        } 