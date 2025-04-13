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

print(f"API Key found: {api_key[:5]}...{api_key[-5:]}")  # Print first and last 5 chars for debugging

try:
    client = OpenAI(api_key=api_key)
    # Test the API key with a simple request
    print("Testing OpenAI API connection...")
    models = client.models.list()
    print("OpenAI API connection successful!")
    print(f"Available models: {[model.id for model in models.data]}")
except Exception as e:
    print(f"OpenAI API Error: {str(e)}")
    if "API key" in str(e) or "authentication" in str(e).lower():
        raise ValueError("OpenAI API key is invalid or expired. Please check your configuration.")
    raise

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
    try:
        # Extract key topics and structure
        topics = extract_key_topics(text, text_analysis)
        structure = analyze_text_structure(text)
        
        # Prepare style context if available
        style_context = ""
        if style_analysis and isinstance(style_analysis, dict):
            style_metrics = style_analysis.get("style_metrics", {})
            style_context = f"""
            Writing Style Guidelines:
            - Tone: {style_metrics.get("verb_tenses", "professional")}
            - Structure: {style_metrics.get("structure", "clear and logical")}
            - Average Sentence Length: {style_metrics.get("avg_sentence_length", "moderate")} words
            """
        
        # Generate outline using GPT
        prompt = f"""Based on the following text, create a detailed outline that captures its main ideas and structure.

Text to analyze: {text}

Key topics identified:
{', '.join([t['topic'] for t in topics[:3]])}

Requirements:
1. Create 3-5 main sections that directly relate to the text's content
2. Each section must include:
   - A descriptive title that reflects the actual content
   - A suggested word count range
   - 3-4 specific key points drawn from the text
3. Follow this EXACT format:

[Introduction] (Suggested Length: 150-200)
- [Specific point about introducing the topic]
- [Overview of the main themes found in the text]
- [Clear thesis statement based on the text]

[Main Section Title - Use actual topic] (Suggested Length: 300-400)
- [Specific point from the text]
- [Evidence or example mentioned]
- [Analysis or implication discussed]

[Conclusion] (Suggested Length: 150-200)
- [Summary of key findings]
- [Synthesis of main arguments]
- [Concluding thoughts or recommendations]

Important:
- Use actual topics and points from the text
- Make section titles descriptive and specific
- Ensure key points are detailed and directly related to the content
- Keep the exact format with brackets and parentheses"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert writing assistant that creates detailed, content-specific outlines. Focus on extracting and organizing the actual ideas present in the text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # Parse the generated outline
        outline_content = response.choices[0].message.content
        print("Raw outline content:", outline_content)  # Debug log
        sections = []
        current_section = None
        
        for line in outline_content.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Match section headers: [Title] (Suggested Length: X-Y)
            if line.startswith('[') and ']' in line and '(Suggested Length:' in line:
                if current_section:
                    sections.append(current_section)
                
                # Extract title and suggested length
                title = line[1:line.index(']')]
                length_str = line[line.index('(Suggested Length:')+18:].strip(')')
                # Clean up the length string and extract numbers
                length_range = [int(x.strip()) for x in length_str.split('-') if x.strip().isdigit()]
                if len(length_range) == 2:
                    suggested_length = f"{length_range[0]}-{length_range[1]}"
                else:
                    # Fallback length based on section type
                    suggested_length = "150-200" if "introduction" in title.lower() or "conclusion" in title.lower() else "300-400"
                
                current_section = {
                    'title': title,
                    'key_points': [],
                    'suggested_length': suggested_length
                }
            elif line.startswith('-') and current_section:
                point = line[1:].strip().strip('[]')  # Remove brackets if present
                if point:
                    current_section['key_points'].append(point)
        
        if current_section:
            sections.append(current_section)
        
        # Calculate total suggested length
        total_length = 0
        for section in sections:
            if section['suggested_length']:
                # Extract the minimum length from the range (e.g., "300-400" -> 300)
                min_length = int(section['suggested_length'].split('-')[0])
                total_length += min_length
        
        # If no valid outline was generated, create one based on extracted topics
        if not sections:
            sections = [{
                'title': 'Introduction',
                'key_points': [
                    f"Introduce the concept of {topics[0]['topic'] if topics else 'the main topic'}",
                    f"Provide context about {topics[1]['topic'] if len(topics) > 1 else 'key themes'}",
                    "Present the main objectives and scope"
                ],
                'suggested_length': '150-200'
            }]
            
            # Add sections for each major topic
            for topic in topics[:2]:  # Use top 2 topics for main sections
                sections.append({
                    'title': f"Analysis of {topic['topic'].title()}",
                    'key_points': [
                        f"Examine the key aspects of {topic['topic']}",
                        f"Present evidence and examples related to {topic['topic']}",
                        f"Discuss implications and significance of {topic['topic']}"
                    ],
                    'suggested_length': '300-400'
                })
            
            sections.append({
                'title': 'Conclusion',
                'key_points': [
                    "Synthesize the main findings",
                    f"Connect the implications of {topics[0]['topic'] if topics else 'the analysis'}",
                    "Propose recommendations or future directions"
                ],
                'suggested_length': '150-200'
            })
            
            total_length = 600
        
        return {
            'sections': sections,
            'total_suggested_length': total_length
        }
        
    except Exception as e:
        print(f"Error in generate_outline: {str(e)}")
        # Create a fallback outline based on extracted topics
        topics_fallback = extract_key_topics(text, text_analysis)
        main_topic = topics_fallback[0]['topic'] if topics_fallback else "the main topic"
        
        return {
            'sections': [{
                'title': 'Introduction',
                'key_points': [
                    f"Introduce {main_topic}",
                    "Present key themes and context",
                    "State the main objectives"
                ],
                'suggested_length': '150-200'
            }, {
                'title': f"Analysis of {main_topic.title()}",
                'key_points': [
                    f"Examine the key aspects of {main_topic}",
                    "Present supporting evidence",
                    "Discuss implications"
                ],
                'suggested_length': '300-400'
            }, {
                'title': 'Conclusion',
                'key_points': [
                    "Summarize main findings",
                    "Present synthesis of arguments",
                    "Suggest next steps"
                ],
                'suggested_length': '150-200'
            }],
            'total_suggested_length': 600
        } 