from flask import Flask, render_template, request, jsonify
import json
from find_word import filter_words, load_words_from_txt
import re
from nltk.corpus import words
from nltk.stem import WordNetLemmatizer

app = Flask(__name__)

# 加载单词列表
word_list = load_words_from_txt("words.txt")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/filter', methods=['POST'])
def filter_words_api():
    # 获取前端发送的配置
    config = request.json

    # 确保 letters_at_positions 中的键是整数
    if 'letters_at_positions' in config:
        letters_at_positions = {}
        for key, value in config['letters_at_positions'].items():
            letters_at_positions[int(key)] = value
        config['letters_at_positions'] = letters_at_positions

    # 确保 not_at_positions 中的位置是整数
    if 'not_at_positions' in config:
        not_at_positions = {}
        for letter, positions in config['not_at_positions'].items():
            not_at_positions[letter] = [int(pos) for pos in positions]
        config['not_at_positions'] = not_at_positions

    # 使用 filter_words 函数过滤单词
    filtered_words = filter_words(word_list, config)

    # 返回过滤后的单词列表
    return jsonify({
        'words': filtered_words[:100],  # 限制返回数量，避免过多
        'total': len(filtered_words)
    })

@app.route('/api/words', methods=['GET'])
def get_words():
    # 获取指定长度的单词
    length = request.args.get('length', type=int)
    if not length:
        return jsonify({'error': '请指定单词长度'}), 400

    # 过滤指定长度的单词
    config = {'length': length}
    filtered_words = filter_words(word_list, config)

    # 返回过滤后的单词列表
    return jsonify({
        'words': filtered_words[:100],  # 限制返回数量，避免过多
        'total': len(filtered_words)
    })

@app.route('/api/check_word', methods=['POST'])
def check_word():
    data = request.json
    word = data.get('word', '').lower()
    config = data.get('config', {})

    # 检查单词是否符合配置
    reason = ""

    # 检查长度
    if 'length' in config and len(word) != config['length']:
        reason = f"长度不符，应为{config['length']}个字母"
        return jsonify({'valid': False, 'reason': reason})

    # 检查特定位置的字母
    if 'letters_at_positions' in config:
        for pos, letter in config['letters_at_positions'].items():
            pos = int(pos)
            if pos >= len(word) or word[pos] != letter:
                reason = f"位置{pos+1}应为字母'{letter}'"
                return jsonify({'valid': False, 'reason': reason})

    # 检查必须包含的字母
    if 'contains_letters' in config:
        for letter in config['contains_letters']:
            if letter not in word:
                reason = f"应包含字母'{letter}'"
                return jsonify({'valid': False, 'reason': reason})

    # 检查不能包含的字母
    if 'not_contains_letters' in config:
        for letter in config['not_contains_letters']:
            if letter in word:
                reason = f"不应包含字母'{letter}'"
                return jsonify({'valid': False, 'reason': reason})

    # 检查特定位置不能有的字母
    if 'not_at_positions' in config:
        for letter, positions in config['not_at_positions'].items():
            for pos in positions:
                pos = int(pos)
                if pos < len(word) and word[pos] == letter:
                    reason = f"位置{pos+1}不应为字母'{letter}'"
                    return jsonify({'valid': False, 'reason': reason})

    return jsonify({'valid': True})

@app.route('/api/update_article', methods=['POST'])
def update_article():
    # 获取前端发送的文章内容
    data = request.json
    article_content = data.get('article', '')

    # 保存文章内容到 article.txt
    with open('article.txt', 'w', encoding='utf-8') as f:
        f.write(article_content)

    # 处理文章内容，提取单词
    # 初始化词形还原器
    lemmatizer = WordNetLemmatizer()

    # 加载词典
    dictionary = set(words.words())

    # 提取单词
    words_list = re.findall(r'\w+', article_content.lower())

    # 处理单词：转换复数为单数，过滤长度为1的单词
    processed_words = set()
    for word in words_list:
        # 跳过长度为1的单词
        if len(word) <= 1:
            continue

        # 将复数形式转换为单数形式
        singular_form = lemmatizer.lemmatize(word, 'n')

        # 添加到处理后的单词集合
        if singular_form in dictionary:
            processed_words.add(singular_form)

    # 按字母顺序排序
    unique_words = sorted(processed_words)

    # 写入文件
    with open('words.txt', 'w', encoding='utf-8') as f:
        for word in unique_words:
            f.write(f"{word}\n")

    # 重新加载单词列表
    global word_list
    word_list = load_words_from_txt("words.txt")

    return jsonify({
        'success': True,
        'message': f'已处理 {len(words_list)} 个单词，去重并转换为单数形式后保存了 {len(unique_words)} 个单词',
        'word_count': len(unique_words)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')