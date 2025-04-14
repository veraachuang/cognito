from datasets import load_dataset, concatenate_datasets
from typing import Dict, Any, List, Optional
import random

class BlogDatasetLoader:
    """Legacy class maintained for backward compatibility"""
    def __init__(self):
        self.dataset_name = "barilan/blog_authorship_corpus"
        self.dataset = None

    def load_dataset(self) -> None:
        """
        Load the Blog Authorship Corpus dataset from Hugging Face.
        The dataset contains blog posts with author metadata including age, gender, job, and horoscope.
        """
        try:
            self.dataset = load_dataset(self.dataset_name, trust_remote_code=True)
            print(f"Dataset loaded successfully. Train size: {len(self.dataset['train'])}")
            print(f"Validation size: {len(self.dataset['validation'])}")
        except Exception as e:
            print(f"Error loading dataset: {str(e)}")
            raise

    def get_sample(self, split: str = 'train', n: int = 5) -> list:
        """
        Get a sample of n entries from the specified split.
        
        Args:
            split (str): Dataset split ('train' or 'validation')
            n (int): Number of samples to return
            
        Returns:
            list: List of n samples from the dataset
        """
        if self.dataset is None:
            raise ValueError("Dataset not loaded. Call load_dataset() first.")
        
        samples = self.dataset[split].select(range(n))
        return [dict(sample) for sample in samples]

    def get_stats(self) -> Dict[str, Any]:
        """
        Get basic statistics about the dataset.
        
        Returns:
            Dict containing dataset statistics
        """
        if self.dataset is None:
            raise ValueError("Dataset not loaded. Call load_dataset() first.")
        
        train_data = self.dataset['train']
        stats = {
            "total_train_samples": len(train_data),
            "total_validation_samples": len(self.dataset['validation']),
            "fields": list(train_data.features.keys()),
            "age_groups": set(train_data['age']),
            "unique_jobs": set(train_data['job']),
        }
        return stats

class EnhancedDatasetLoader:
    def __init__(self):
        self.datasets = {
            'blogs': {
                'name': "barilan/blog_authorship_corpus",
                'loaded': None
            },
            'reddit': {
                'name': "reddit/tifu",  # Today I Fucked Up subreddit - personal stories
                'loaded': None
            },
            'personal_stories': {
                'name': "reddit/AmItheAsshole",  # AITA subreddit - detailed personal situations
                'loaded': None
            },
            'writing_prompts': {
                'name': "reddit/WritingPrompts",  # Creative writing responses
                'loaded': None
            },
            'casual_conv': {
                'name': "daily_dialog",  # Casual conversation dataset
                'loaded': None
            },
            'arxiv': {
                'name': "arxiv_dataset",
                'loaded': None
            },
            'scientific': {
                'name': "pubmed_abstracts",
                'loaded': None
            },
            'news': {
                'name': "cnn_dailymail",
                'version': "3.0.0",
                'loaded': None
            },
            'medium': {
                'name': "medium_articles",
                'loaded': None
            }
        }
        self.combined_dataset = None
        # Adjust weights to favor casual content
        self.dataset_weights = {
            'blogs': 0.15,
            'reddit': 0.15,
            'personal_stories': 0.15,
            'writing_prompts': 0.1,
            'casual_conv': 0.1,
            'arxiv': 0.1,
            'scientific': 0.1,
            'news': 0.075,
            'medium': 0.075
        }

    def load_dataset(self, dataset_keys: Optional[List[str]] = None) -> None:
        """
        Load specified datasets or all datasets if none specified.
        
        Args:
            dataset_keys: Optional list of dataset keys to load. If None, loads all datasets.
        """
        if dataset_keys is None:
            dataset_keys = list(self.datasets.keys())

        for key in dataset_keys:
            if key not in self.datasets:
                print(f"Warning: Unknown dataset key '{key}'")
                continue

            try:
                dataset_info = self.datasets[key]
                if key == 'blogs':
                    dataset = load_dataset(dataset_info['name'], trust_remote_code=True)
                elif key == 'reddit':
                    dataset = load_dataset("reddit", "tifu", trust_remote_code=True)
                elif key == 'personal_stories':
                    dataset = load_dataset("reddit", "AmItheAsshole", trust_remote_code=True)
                elif key == 'writing_prompts':
                    dataset = load_dataset("reddit", "WritingPrompts", trust_remote_code=True)
                elif key == 'casual_conv':
                    dataset = load_dataset("daily_dialog", trust_remote_code=True)
                elif key == 'arxiv':
                    dataset = load_dataset("arxiv_dataset", trust_remote_code=True)
                elif key == 'scientific':
                    dataset = load_dataset("pubmed_abstracts", trust_remote_code=True)
                elif key == 'news':
                    dataset = load_dataset("cnn_dailymail", '3.0.0', trust_remote_code=True)
                elif key == 'medium':
                    dataset = load_dataset("medium_articles", trust_remote_code=True)

                self.datasets[key]['loaded'] = dataset
                print(f"Successfully loaded {key} dataset")
                print(f"Train size: {len(dataset['train'])}")
                if 'validation' in dataset:
                    print(f"Validation size: {len(dataset['validation'])}")

            except Exception as e:
                print(f"Error loading {key} dataset: {str(e)}")
                continue

        self._combine_datasets()

    def _combine_datasets(self) -> None:
        """Combine all loaded datasets with proper text field mapping"""
        combined_train = []
        combined_validation = []

        for key, dataset_info in self.datasets.items():
            if dataset_info['loaded'] is None:
                continue

            dataset = dataset_info['loaded']
            weight = self.dataset_weights[key]

            # Map different text fields to a common 'text' field
            if key == 'reddit':
                train_texts = [{'text': d['selftext'], 'source': 'reddit', 'title': d.get('title', '')} for d in dataset['train']]
            elif key == 'personal_stories':
                train_texts = [{'text': d['selftext'], 'source': 'personal_stories', 'title': d.get('title', '')} for d in dataset['train']]
            elif key == 'writing_prompts':
                train_texts = [{'text': d['response'], 'source': 'writing_prompts', 'prompt': d.get('prompt', '')} for d in dataset['train']]
            elif key == 'casual_conv':
                # Combine dialogue turns into a single text
                train_texts = [{'text': ' '.join(d['dialog']), 'source': 'casual_conv'} for d in dataset['train']]
            elif key == 'arxiv':
                train_texts = [{'text': d['abstract'], 'source': 'arxiv', 'title': d.get('title', '')} for d in dataset['train']]
            elif key == 'scientific':
                train_texts = [{'text': d['abstract'], 'source': 'scientific'} for d in dataset['train']]
            elif key == 'news':
                train_texts = [{'text': d['article'], 'source': 'news', 'summary': d.get('highlights', '')} for d in dataset['train']]
            elif key == 'medium':
                train_texts = [{'text': d['text'], 'source': 'medium'} for d in dataset['train']]
            else:  # blogs
                train_texts = [{'text': d['text'], 'source': 'blogs'} for d in dataset['train']]

            # Filter out empty or very short texts
            train_texts = [t for t in train_texts if len(t['text'].split()) > 50]

            # Sample based on weight
            sample_size = int(len(train_texts) * weight)
            combined_train.extend(random.sample(train_texts, min(sample_size, len(train_texts))))

            if 'validation' in dataset:
                # Apply the same mapping for validation data
                if key == 'reddit':
                    val_texts = [{'text': d['selftext'], 'source': 'reddit', 'title': d.get('title', '')} for d in dataset['validation']]
                elif key == 'personal_stories':
                    val_texts = [{'text': d['selftext'], 'source': 'personal_stories', 'title': d.get('title', '')} for d in dataset['validation']]
                elif key == 'writing_prompts':
                    val_texts = [{'text': d['response'], 'source': 'writing_prompts', 'prompt': d.get('prompt', '')} for d in dataset['validation']]
                elif key == 'casual_conv':
                    val_texts = [{'text': ' '.join(d['dialog']), 'source': 'casual_conv'} for d in dataset['validation']]
                elif key == 'arxiv':
                    val_texts = [{'text': d['abstract'], 'source': 'arxiv', 'title': d.get('title', '')} for d in dataset['validation']]
                elif key == 'scientific':
                    val_texts = [{'text': d['abstract'], 'source': 'scientific'} for d in dataset['validation']]
                elif key == 'news':
                    val_texts = [{'text': d['article'], 'source': 'news', 'summary': d.get('highlights', '')} for d in dataset['validation']]
                elif key == 'medium':
                    val_texts = [{'text': d['text'], 'source': 'medium'} for d in dataset['validation']]
                else:  # blogs
                    val_texts = [{'text': d['text'], 'source': 'blogs'} for d in dataset['validation']]
                
                # Filter out empty or very short texts
                val_texts = [t for t in val_texts if len(t['text'].split()) > 50]
                
                val_sample_size = int(len(val_texts) * weight)
                combined_validation.extend(random.sample(val_texts, min(val_sample_size, len(val_texts))))

        self.combined_dataset = {
            'train': combined_train,
            'validation': combined_validation
        }

    def get_sample(self, split: str = 'train', n: int = 5, source: Optional[str] = None) -> list:
        """
        Get a sample of n entries from the specified split and optionally from a specific source.
        
        Args:
            split (str): Dataset split ('train' or 'validation')
            n (int): Number of samples to return
            source (str, optional): Specific source to sample from ('blogs', 'arxiv', etc.)
            
        Returns:
            list: List of n samples from the dataset
        """
        if self.combined_dataset is None:
            raise ValueError("Dataset not loaded. Call load_dataset() first.")

        data = self.combined_dataset[split]
        
        if source:
            data = [d for d in data if d['source'] == source]
            if not data:
                raise ValueError(f"No samples found for source: {source}")

        return random.sample(data, min(n, len(data)))

    def get_stats(self) -> Dict[str, Any]:
        """
        Get basic statistics about the combined dataset.
        
        Returns:
            Dict containing dataset statistics
        """
        if self.combined_dataset is None:
            raise ValueError("Dataset not loaded. Call load_dataset() first.")

        stats = {
            "total_train_samples": len(self.combined_dataset['train']),
            "total_validation_samples": len(self.combined_dataset['validation']),
            "samples_per_source": {
                source: {
                    "train": len([d for d in self.combined_dataset['train'] if d['source'] == source]),
                    "validation": len([d for d in self.combined_dataset['validation'] if d['source'] == source])
                }
                for source in self.datasets.keys()
            }
        }
        return stats

if __name__ == "__main__":
    # Example usage
    loader = EnhancedDatasetLoader()
    loader.load_dataset()
    
    # Print some basic stats
    stats = loader.get_stats()
    print("\nDataset Statistics:")
    for key, value in stats.items():
        if key == "samples_per_source":
            print("\nSamples per source:")
            for source, counts in value.items():
                print(f"{source}: {counts}")
        else:
            print(f"{key}: {value}")
    
    # Get samples from different sources
    for source in loader.datasets.keys():
        print(f"\nSample from {source}:")
        try:
            samples = loader.get_sample(n=1, source=source)
            for sample in samples:
                print(f"\nText: {sample['text'][:200]}...")
        except ValueError as e:
            print(f"Could not get sample: {e}") 