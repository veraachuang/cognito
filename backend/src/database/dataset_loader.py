from datasets import load_dataset
from typing import Dict, Any

class BlogDatasetLoader:
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

if __name__ == "__main__":
    # Example usage
    loader = BlogDatasetLoader()
    loader.load_dataset()
    
    # Print some basic stats
    stats = loader.get_stats()
    print("\nDataset Statistics:")
    for key, value in stats.items():
        print(f"{key}: {value}")
    
    # Get a sample
    print("\nSample entries:")
    samples = loader.get_sample(n=2)
    for sample in samples:
        print(f"\nBlog post: {sample['text'][:200]}...")
        print(f"Author: {sample['gender']}, Age: {sample['age']}, Job: {sample['job']}") 