def filter_words(word_list, config):
    """
    Filter words based on a flexible configuration.
    
    Args:
        word_list: List of words to filter
        config: Dictionary containing filter criteria:
            - length: Required word length
            - letters_at_positions: Dict mapping positions to required letters
            - contains_letters: List of letters that must be in the word
            - not_contains_letters: List of letters that must not be in the word
            - not_at_positions: Dict mapping letters to positions they must not be at
    
    Returns:
        List of words matching all criteria
    """
    results = []
    
    for word in word_list:
        word = word.lower()  # Convert to lowercase for consistent comparison
        
        # Check word length
        if 'length' in config and len(word) != config['length']:
            continue
            
        # Check required letters at specific positions
        if 'letters_at_positions' in config:
            if not all(word[pos] == letter for pos, letter in config['letters_at_positions'].items()):
                continue
                
        # Check for required letters anywhere in the word
        if 'contains_letters' in config:
            if not all(letter in word for letter in config['contains_letters']):
                continue
        
        if 'not_contains_letters' in config:
            if any(letter in word for letter in config['not_contains_letters']):
                continue

        # Check for letters that should not be at specific positions
        if 'not_at_positions' in config:
            if any(word[pos] == letter for letter, positions in config['not_at_positions'].items() for pos in positions):
                continue
                
        results.append(word)
        
    return results

def load_words_from_txt(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read().lower()
        return [word.strip() for word in text.split("\n") if word.strip()]