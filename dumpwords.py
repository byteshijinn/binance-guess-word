import re
from nltk.corpus import words
from nltk.stem import WordNetLemmatizer
# 初始化词形还原器
lemmatizer = WordNetLemmatizer()

# 加载词典
dictionary = set(words.words())

with open('article.txt', 'r', encoding='utf-8') as f:
    text = f.read().lower()

# 提取单词
words_list = re.findall(r'\w+', text)

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

print(f"已处理 {len(words_list)} 个单词，去重并转换为单数形式后保存了 {len(unique_words)} 个单词")

