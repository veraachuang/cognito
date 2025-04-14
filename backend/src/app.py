from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import tempfile
from dotenv import load_dotenv
from src.nlp_processing.preprocess import preprocess_text, analyze_writing_style, batch_process_texts
from src.models.outline_generator import generate_outline
from src.database.dataset_loader import BlogDatasetLoader

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure CORS with specific origin
CORS(app,
     resources={
         r"/api/*": {
             "origins": [
                 "chrome-extension://abahnimgbnbihioopdehkbkpabaooepe",
                 "http://localhost:5000",
                 "http://127.0.0.1:5000"
             ],
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": False,
             "max_age": 600
         }
     }
)

# Add OPTIONS method handling for all API routes
@app.after_request
def after_request(response):
    if request.method == "OPTIONS":
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

# Configure upload settings
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'doc', 'docx', 'pdf', 'txt'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# HTML template for the root page
API_DOCS = """
<!DOCTYPE html>
<html>
<head>
    <title>Cognito API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Cognito API Documentation</h1>
    
    <div class="endpoint">
        <h2>Health Check</h2>
        <p><code>GET /api/health</code></p>
        <p>Check if the API is running.</p>
    </div>

    <div class="endpoint">
        <h2>Upload Files</h2>
        <p><code>POST /api/upload</code></p>
        <p>Upload and analyze documents (supports .txt, .doc, .docx, .pdf)</p>
    </div>

    <div class="endpoint">
        <h2>Generate Outline</h2>
        <p><code>POST /api/generate-outline</code></p>
        <p>Generate an outline from provided text.</p>
    </div>
</body>
</html>
"""

@app.route('/')
def index():
    """Root endpoint - API documentation"""
    return render_template_string(API_DOCS)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize the dataset loader
blog_dataset = BlogDatasetLoader()
blog_dataset.load_dataset()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Handle file uploads and analyze writing style"""
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist('files')
    if not files:
        return jsonify({"error": "No files selected"}), 400

    analysis_results = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            try:
                # Extract text from file based on file type
                text = extract_text_from_file(filepath)
                
                # Analyze writing style
                analysis = analyze_writing_style(text)
                text_stats = preprocess_text(text)
                
                analysis_results.append({
                    "filename": filename,
                    "statistics": text_stats,
                    "style_metrics": analysis["style_metrics"]
                })

            except Exception as e:
                return jsonify({"error": f"Error processing file {filename}: {str(e)}"}), 500
            finally:
                # Clean up temporary file
                os.remove(filepath)

    return jsonify({
        "message": "Files processed successfully",
        "results": analysis_results
    })

@app.route('/api/generate-outline', methods=['POST'])
def create_outline():
    """Generate an outline from brain dump text"""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    text = data.get('text')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Analyze the input text
        text_analysis = preprocess_text(text)
        style_analysis = analyze_writing_style(text)

        # Get writing style examples from the dataset
        style_samples = blog_dataset.get_sample(n=5)
        processed_samples = batch_process_texts([sample['text'] for sample in style_samples])

        # Generate outline based on text analysis and style examples
        outline = generate_outline(
            text=text,
            text_analysis=text_analysis,
            style_analysis=style_analysis,
            style_examples=processed_samples
        )

        return jsonify({
            "outline": outline,
            "statistics": text_analysis,
            "style_metrics": style_analysis["style_metrics"]
        })

    except Exception as e:
        return jsonify({"error": f"Error generating outline: {str(e)}"}), 500

@app.route('/api/generate-outline', methods=['OPTIONS'])
def handle_preflight():
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', 'chrome-extension://abahnimgbnbihioopdehkbkpabaooepe')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response

def extract_text_from_file(filepath):
    """Extract text from various file formats"""
    ext = filepath.rsplit('.', 1)[1].lower()
    
    if ext == 'txt':
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    
    elif ext == 'pdf':
        # Use PyPDF2 for PDF extraction
        from PyPDF2 import PdfReader
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return text
    
    elif ext in ['doc', 'docx']:
        # Use python-docx for Word documents
        from docx import Document
        doc = Document(filepath)
        return '\n'.join([paragraph.text for paragraph in doc.paragraphs])

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000) 