let err_string = "";

// 文法符号种类
const Symbol_type = {
	Epsilon: 0,
	Terminal: 1,
	NonTerminal: 2,
	End: 3,
};

const err_code = {
	NO_ERROR: 0,
	FILE_OPEN_ERROE: 1,
	LEXICAL_ERROR_UNDEFINED_WORD: 2,
	GRAMMAR_ERROR: 3,
	GRAMMATICAL_ERROR_UNDEFINED_WORD: 4,
	GRAMMATICAL_ERROR_CANNOT_ANALYSIS: 5,
	SEMANTIC_ERROR_NO_MAIN: 6,
	SEMANTIC_ERROR_REDEFINED: 7,
	SEMANTIC_ERROR_UNDEFINED: 8,
	SEMANTIC_ERROR_PARAMETER_NUM: 9,
	SEMANTIC_ERROR_NO_RETURN: 10,
};

function split_postproc(arr) {
	for (let i = 0; i < arr.length; i++) {
		arr[i] = arr[i].trim();
	}
	return arr.filter((item) => item != "");
}

// 文法符号
class GrammarSymbol {
	constructor(type, token) {
		this.type = type;
		this.token = token;
		this.first_set = [];
		this.follow_set = [];
	}
}

// 文法中所有的项
class GrammarItem {
	constructor(left_symbol, right_symbol) {
		this.left_symbol = left_symbol;
		this.right_symbol = right_symbol;
	}
}

// 整个文法
class Grammar {
	constructor(grammar_file_content) {
		err_string = "";

		this.EpsilonToken = "@"; // Epsilon
		this.SplitToken = " | "; // 产生式右部分隔符
		this.ProToken = "::="; // 产生式左右部分隔符
		this.EndToken = "#"; // 尾token 终止符号
		this.StartToken = "Program"; // 文法起始符号
		this.ExtendStartToken = "S"; // 扩展文法起始符号
		this.AllTerminalToken = "%token"; //所有的终结符

		this.symbols = []; //文法的所有符号集合
		this.terminals = []; //终结符在symbols中的下标
		this.non_terminals = []; //非终结符在symbols中的下标
		this.productions = []; //所有的产生式
		this.start_production = 0; //起始产生式在productions中的位置

		if (grammar_file_content.length == 0) {
			return;
		}
		this.read_grammar(grammar_file_content);
		// 初始化所有Terminal的first集
		for (let ter = 0; ter < this.terminals.length; ++ter) {
			this.symbols[this.terminals[ter]].first_set.push(this.terminals[ter]);
		}
		// 初始化所有NonTerminal的first集
		this.get_first_of_non_terminal();
	}
	read_grammar(grammar_file_content) {
		//在symbols中加入EndToken #，由于其为终结符，在terminals中插入symbols.size() - 1
		this.symbols.push(new GrammarSymbol(Symbol_type.End, this.EndToken));
		this.terminals.push(this.symbols.length - 1);
		//加入EpsilonToken @
		this.symbols.push(
			new GrammarSymbol(Symbol_type.Epsilon, this.EpsilonToken)
		);

		// 记录读取位置指针
		let pointer = 0;

		//记录是第几个产生式
		let grammar_row_num = 0;

		//开始读取文法
		let line = "";

		while (pointer < grammar_file_content.length) {
			line = "";

			// 读入一行
			while (
				pointer < grammar_file_content.length &&
				grammar_file_content[pointer] != "\r" &&
				grammar_file_content[pointer] != "\n"
			) {
				line += grammar_file_content[pointer];
				pointer++;
			}

			while (
				pointer < grammar_file_content.length &&
				(grammar_file_content[pointer] == "\r" ||
					grammar_file_content[pointer] == "\n")
			) {
				pointer++;
			}
			grammar_row_num++;

			// 处理最开始和末尾的空格和注释
			if (line.indexOf("$") != -1) line = line.slice(0, line.indexOf("$"));
			line = line.trim();
			if (line.length == 0) continue;

			// 将产生式分为左右两个部分
			let production_left_and_right = line.split(this.ProToken);
			if (production_left_and_right.length != 2) {
				err_string =
					"第" +
					grammar_row_num +
					'行的产生式格式有误（每行应有且只有一个"' +
					this.ProToken +
					'"符号）';
				throw err_code.GRAMMAR_ERROR;
			}

			let production_left = production_left_and_right[0].trim(),
				production_right = production_left_and_right[1].trim();

			// 左边部分的index
			let left_symbol = -1;
			// 如果不是声明所有非终结符
			if (production_left != this.AllTerminalToken) {
				left_symbol = this.find_symbol_index_by_token(production_left);
				if (left_symbol == -1) {
					this.symbols.push(
						new GrammarSymbol(Symbol_type.NonTerminal, production_left)
					);
					left_symbol = this.symbols.length - 1;
					this.non_terminals.push(left_symbol);
				}
			}
			//此时如果是声明所有非终结符的grammar，则left_symbol=-1

			// 右边部分以“|”为界限分解
			let production_right_parts = split_postproc(production_right.split("|"));
			if (production_right_parts.length == 0) {
				err_string =
					"第" +
					grammar_row_num +
					"行的产生式格式有误（产生式右端没有文法符号）";
				console.log('t1', err_string);
				throw err_code.GRAMMAR_ERROR;
			}

			for (let i = 0; i < production_right_parts.length; i++) {
				// 如果是终结符声明
				if (left_symbol == -1) {
					this.symbols.push(
						new GrammarSymbol(Symbol_type.Terminal, production_right_parts[i])
					);
					this.terminals.push(this.symbols.length - 1);
				} else {
					// 将每一个产生式中的每个符号分解
					let right_symbol = [];
					let right_symbol_str = split_postproc(
						production_right_parts[i].split(/\s/)
					);
					for (let j = 0; j < right_symbol_str.length; j++) {
						let right_symbol_present = this.find_symbol_index_by_token(
							right_symbol_str[j]
						);
						if (right_symbol_present == -1) {
							this.symbols.push(
								new GrammarSymbol(Symbol_type.NonTerminal, right_symbol_str[j])
							);
							right_symbol_present = this.symbols.length - 1;
							this.non_terminals.push(right_symbol_present);
						}
						right_symbol.push(right_symbol_present);
					}
					// 加入production中
					this.productions.push(new GrammarItem(left_symbol, right_symbol));
					// 如果是起始产生式
					if (this.symbols[left_symbol].token == this.ExtendStartToken)
						this.start_production = this.productions.length - 1;
				}
			}
		}
	}
	//根据字符串找到其在symbols中的index，如果找到返回index，如果没有找到返回-1
	find_symbol_index_by_token(token) {
		for (let i = 0; i < this.symbols.length; ++i) {
			if (this.symbols[i].token == token) {
				return i;
			}
		}
		return -1;
	}
	get_first_of_non_terminal() {
		// 不断进行标记，直到所有集合不发生变化
		let changed;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			changed = false;
			// 遍历所有非终结符
			for (let i = 0; i < this.non_terminals.length; i++) {
				// 遍历所有产生式
				for (let j = 0; j < this.productions.length; j++) {
					// 如果左边不为nonTerminal则continue
					if (this.productions[j].left_symbol != this.non_terminals[i])
						continue;

					// 找到对应产生式，遍历产生式右部
					let it = 0;

					// 是终结符或空串则直接加入first集合并退出
					if (
						this.terminals.indexOf(this.productions[j].right_symbol[it]) !=
						-1 ||
						this.symbols[this.productions[j].right_symbol[it]].type ==
						Symbol_type.Epsilon
					) {
						if (
							this.symbols[this.non_terminals[i]].first_set.indexOf(
								this.productions[j].right_symbol[it]
							) == -1
						) {
							this.symbols[this.non_terminals[i]].first_set.push(
								this.productions[j].right_symbol[it]
							);
							changed = true;
						}
						continue;
					}
					// 右部以非终结符开始
					let flag = true;
					for (; it < this.productions[j].right_symbol.length; ++it) {
						// 如果是终结符，停止迭代
						if (
							this.terminals.indexOf(this.productions[j].right_symbol[it]) != -1
						) {
							changed =
								changed ||
								this.mergeSetExceptEmpty(
									this.symbols[this.non_terminals[i]].first_set,
									this.symbols[this.productions[j].right_symbol[it]].first_set,
									this.find_symbol_index_by_token(this.EpsilonToken)
								);
							flag = false;
							break;
						}

						changed =
							changed ||
							this.mergeSetExceptEmpty(
								this.symbols[this.non_terminals[i]].first_set,
								this.symbols[this.productions[j].right_symbol[it]].first_set,
								this.find_symbol_index_by_token(this.EpsilonToken)
							);

						// 若该非终结符可导出空串，则继续迭代
						flag =
							flag &&
							this.symbols[this.productions[j].right_symbol[it]].first_set.indexOf(
								this.find_symbol_index_by_token(this.EpsilonToken)
							) != -1;
						if (!flag) break;
					}
					// 如果该产生式的所有右部均为非终结符且均可导出空串，则将空串加入First集合
					if (flag && it == this.productions[j].right_symbol.length) {
						if (
							this.symbols[this.non_terminals[i]].first_set.indexOf(
								this.find_symbol_index_by_token(this.EpsilonToken)
							) != -1
						) {
							this.symbols[this.non_terminals[i]].first_set.push(
								this.find_symbol_index_by_token(this.EpsilonToken)
							);
							changed = true;
						}
					}
				}
			}
			if (!changed) break;
		}
	}
	// 返回一个符号串的First集
	get_first_of_string(str) {
		// First集
		let first_set = [];
		// str为空直接返回
		if (str.length == 0) {
			return first_set;
		}
		// epsilonIn用于判断空串是否需要加入
		let epsilonIn = true;

		for (let it = 0; it < str.length; it++) {
			// 如果是非终结符
			if (this.symbols[str[it]].type == Symbol_type.Terminal) {
				this.mergeSetExceptEmpty(
					first_set,
					this.symbols[str[it]].first_set,
					this.find_symbol_index_by_token(this.EpsilonToken)
				);
				epsilonIn = false;
				break;
			}
			// 是空串
			if (this.symbols[str[it]].type == Symbol_type.Epsilon) {
				first_set.push(str[it]);
				epsilonIn = false;
				break;
			}
			// 非终结符，合并First集合
			this.mergeSetExceptEmpty(
				first_set,
				this.symbols[str[it]].first_set,
				this.find_symbol_index_by_token(this.EpsilonToken)
			);
			// 如果当前非终结符可以导出空串，则继续循环
			epsilonIn =
				epsilonIn &&
				this.symbols[str[it]].first_set.indexOf(
					this.find_symbol_index_by_token(this.EpsilonToken)
				) != -1;
			if (!epsilonIn) break;
		}
		// 如果所有的都可以产生空串，first集加入空串
		if (epsilonIn)
			first_set.push(this.find_symbol_index_by_token(this.EpsilonToken));
		return first_set;
	}
	// 将非空src集插入dex（用于First集和Follow集的扩大
	mergeSetExceptEmpty(des, src, epsilon_index) {
		let changed = false;
		for (let i = 0; i < src.length; ++i) {
			if (src[i] != epsilon_index && des.indexOf(src[i]) == -1) {
				des.push(src[i]);
				changed = true;
			}
		}
		return changed;
	}
}

export { Symbol_type, err_code, err_string, Grammar }