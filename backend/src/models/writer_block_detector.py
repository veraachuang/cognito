import time

def detect_writer_block(text, last_typing_time=0):
    """
    Simulates writer's block detection by checking if the user has paused.
    In a real app, this function would track keystrokes in real-time.
    """
    current_time = time.time()
    if current_time - last_typing_time > 5:  # If paused for 5+ seconds
        return True
    return False
