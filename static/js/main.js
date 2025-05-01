const { createApp, ref, reactive, watch, onMounted, nextTick } = Vue;

const app = createApp({
    setup() {
        // 响应式状态
        const wordLength = ref(5);
        const guessRows = ref([]);
        const filteredWords = ref([]);
        const totalWords = ref(0);
        const currentStatus = ref('');
        
        // 配置对象
        const currentConfig = reactive({
            length: 5,
            letters_at_positions: {},
            contains_letters: [],
            not_contains_letters: [],
            not_at_positions: {}
        });
        
        // 生命周期钩子
        onMounted(() => {
            // 初始化
            generateGuessRow();
            
            // 监听猜测行变化
            // watch(guessRows, (newVal) => {
            //     console.log('guessRows 更新:', JSON.stringify(newVal));
            // }, { deep: true });
        });
        
        // 生成猜测行
        const generateGuessRow = () => {
            // 确保 wordLength 是有效的数字
            if (isNaN(wordLength.value) || wordLength.value < 2 || wordLength.value > 15) {
                alert('请输入2-15之间的单词长度');
                return;
            }
            
            // 重置配置
            currentConfig.length = wordLength.value;
            currentConfig.letters_at_positions = {};
            currentConfig.contains_letters = [];
            currentConfig.not_contains_letters = [];
            currentConfig.not_at_positions = {};
            
            // 清空猜测行
            guessRows.value = [];
            
            // 添加第一行猜测
            addGuessRow();
            
            // 获取指定长度的单词
            fetchWords(wordLength.value);
        };
        
        // 添加新的猜测行
        const addGuessRow = () => {
            const letters = [];
            
            for (let i = 0; i < wordLength.value; i++) {
                letters.push({
                    value: '',
                    status: '',
                    focused: false
                });
            }
            
            guessRows.value.push({
                letters: letters
            });
            
            // 聚焦到新行的第一个输入框
            nextTick(() => {
                const inputs = document.querySelectorAll('.guess-row:last-child input');
                if (inputs.length > 0) {
                    inputs[0].focus();
                }
            });
        };
        
        // 清空一行
        const clearRow = (rowIndex) => {
            const row = guessRows.value[rowIndex];
            row.letters.forEach(letter => {
                letter.value = '';
                letter.status = '';
            });
            
            // 确保在清空后重新计算配置并获取单词列表
            nextTick(() => {
                updateConfig();
            });
        };
        
        // 处理键盘导航
        const handleKeyNavigation = (event, rowIndex, letterIndex) => {
            if (event.key === 'ArrowRight' && letterIndex < wordLength.value - 1) {
                // 向右移动
                nextTick(() => {
                    const inputs = document.querySelectorAll(`.guess-row:nth-child(${rowIndex + 1}) input`);
                    if (inputs && inputs.length > letterIndex + 1) {
                        inputs[letterIndex + 1].focus();
                    }
                });
            } else if (event.key === 'ArrowLeft' && letterIndex > 0) {
                // 向左移动
                nextTick(() => {
                    const inputs = document.querySelectorAll(`.guess-row:nth-child(${rowIndex + 1}) input`);
                    if (inputs && inputs.length > letterIndex - 1) {
                        inputs[letterIndex - 1].focus();
                    }
                });
            }
        };
        
        // 处理输入事件
        const handleInput = (event, rowIndex, letterIndex) => {
            // 更新配置
            updateConfig();
            
            // 如果输入了一个字符并且不是最后一个输入框，自动移动到下一个
            if (event.target.value.length === 1 && letterIndex < wordLength.value - 1) {
                nextTick(() => {
                    const inputs = document.querySelectorAll(`.guess-row:nth-child(${rowIndex + 1}) input`);
                    if (inputs && inputs.length > letterIndex + 1) {
                        inputs[letterIndex + 1].focus();
                    }
                });
            }
        };
        
        // 更新配置
        const updateConfig = () => {
            // 重置部分配置
            currentConfig.letters_at_positions = {};
            currentConfig.contains_letters = [];
            currentConfig.not_contains_letters = [];
            currentConfig.not_at_positions = {};
            
            // 遍历所有猜测行
            guessRows.value.forEach((row, rowIndex) => {
                row.letters.forEach((letter, position) => {
                    const value = letter.value.toLowerCase();
                    
                    if (!value) return;
                    
                    // 根据状态更新配置
                    if (letter.status === 'correct') {
                        // 字母在正确位置
                        currentConfig.letters_at_positions[position] = value;
                        
                        // 确保该字母不在 not_contains_letters 中
                        if (currentConfig.not_contains_letters.includes(value)) {
                            currentConfig.not_contains_letters = currentConfig.not_contains_letters.filter(l => l !== value);
                        }
                        
                        // 添加到 contains_letters
                        if (!currentConfig.contains_letters.includes(value)) {
                            currentConfig.contains_letters.push(value);
                        }
                    } else if (letter.status === 'present') {
                        // 字母存在但位置错误
                        if (!currentConfig.not_at_positions[value]) {
                            currentConfig.not_at_positions[value] = [];
                        }
                        if (!currentConfig.not_at_positions[value].includes(position)) {
                            currentConfig.not_at_positions[value].push(position);
                        }
                        
                        // 添加到 contains_letters
                        if (!currentConfig.contains_letters.includes(value)) {
                            currentConfig.contains_letters.push(value);
                        }
                    } else {
                        // 未标记或标记为不存在，都视为不存在
                        if (!currentConfig.not_contains_letters.includes(value)) {
                            currentConfig.not_contains_letters.push(value);
                        }
                        
                        // 从 contains_letters 中移除
                        currentConfig.contains_letters = currentConfig.contains_letters.filter(l => l !== value);
                    }
                });
            });
            
            // 发送请求获取过滤后的单词
            fetchFilteredWords();
        };
        
        // 获取指定长度的单词
        const fetchWords = (length) => {
            axios.get(`/api/words?length=${length}`)
                .then(response => {
                    filteredWords.value = response.data.words;
                    totalWords.value = response.data.total;
                    console.log("获取到单词:", filteredWords.value.length);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('获取单词失败，请重试');
                });
        };
        
        // 获取过滤后的单词
        const fetchFilteredWords = () => {
            // 确保 currentConfig 中的位置索引是数字类型
            const config = JSON.parse(JSON.stringify(currentConfig));
            
            // 确保 letters_at_positions 中的键是数字
            const letters_at_positions = {};
            for (const [key, value] of Object.entries(config.letters_at_positions)) {
                letters_at_positions[parseInt(key)] = value;
            }
            config.letters_at_positions = letters_at_positions;
            
            // 确保 not_at_positions 中的位置是数字
            for (const letter in config.not_at_positions) {
                config.not_at_positions[letter] = config.not_at_positions[letter].map(pos => parseInt(pos));
            }
            
            axios.post('/api/filter', config)
                .then(response => {
                    filteredWords.value = response.data.words;
                    totalWords.value = response.data.total;
                    console.log("过滤后单词:", filteredWords.value.length);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('过滤单词失败，请重试');
                });
        };
        
        // 填充单词到最新的行
        const fillWord = (word) => {
            // 获取最后一行
            const lastRowIndex = guessRows.value.length - 1;
            const row = guessRows.value[lastRowIndex];
            
            // 填充单词
            for (let i = 0; i < word.length && i < wordLength.value; i++) {
                row.letters[i].value = word[i];
            }
            
            // 更新配置
            updateConfig();
        };
        
        // 设置输入框焦点状态
        const setFocused = (rowIndex, letterIndex, isFocused) => {
            console.log(`setFocused(${rowIndex}, ${letterIndex}, ${isFocused})`);
            // 关闭所有其他输入框的焦点状态
            if (isFocused) {
                guessRows.value.forEach((row, rIndex) => {
                    row.letters.forEach((letter, lIndex) => {
                        letter.focused = rIndex === rowIndex && lIndex === letterIndex;
                    });
                });
            } else {
                // 使用延时，以便能点击状态按钮
                setTimeout(() => {
                    // 检查是否点击了状态按钮
                    const activeElement = document.activeElement;
                    const isStatusButton = activeElement && activeElement.classList.contains('status-btn');
                    
                    if (!isStatusButton) {
                        const letter = guessRows.value[rowIndex].letters[letterIndex];
                        letter.focused = false;
                    }
                }, 100);
            }
        };
        
        // 设置字母状态
        const setLetterStatus = (rowIndex, letterIndex, status) => {
            console.log(`setLetterStatus(${rowIndex}, ${letterIndex}, ${status})`);
            
            // 直接修改状态，Vue 3 不需要 $set
            const letter = guessRows.value[rowIndex].letters[letterIndex];
            letter.status = status;
            letter.focused = false;
            
            updateConfig();
            
            // 聚焦回输入框，方便继续输入
            nextTick(() => {
                const inputs = document.querySelectorAll(`.guess-row:nth-child(${rowIndex + 1}) input`);
                if (inputs && inputs.length > letterIndex) {
                    inputs[letterIndex].focus();
                }
            });
        };
        
        // 返回模板需要的所有数据和方法
        return {
            wordLength,
            guessRows,
            filteredWords,
            totalWords,
            currentStatus,
            generateGuessRow,
            addGuessRow,
            clearRow,
            handleKeyNavigation,
            handleInput,
            fillWord,
            setFocused,
            setLetterStatus
        };
    }
});

// 挂载应用
app.mount('#app');