import { Symbol_type, err_code, Grammar } from './grammar'

let err_string_2 = "";

// 分析过程中的动作
const Action = {
	ShiftIn: 0,	// 移入
	Reduce: 1,	// 归约
	Accept: 2,	// 接受
	Error: 3,	// 错误
}

// 具体的动作信息
class ActionInfo {
	constructor(action, info) {
		this.action = action
		this.info = info
	}
}

// function times(str, num) {
// 	if (num <= 0)
// 		return "";
// 	return num > 1 ? str += times(str, --num) : str;
// }

// 一个LR1的项
class LR1_item {
	constructor(left_symbol, right_symbol, index, dot_position, lookahead_symbol) {
		this.left_symbol = left_symbol;
		this.right_symbol = right_symbol;
		this.index = index;
		this.dot_position = dot_position;
		this.lookahead_symbol = lookahead_symbol;
	}
	equal(another_LR1_item) {
		return this.left_symbol == another_LR1_item.left_symbol &&
			this.right_symbol == another_LR1_item.right_symbol &&
			this.index == another_LR1_item.index &&
			this.dot_position == another_LR1_item.dot_position &&
			this.lookahead_symbol == another_LR1_item.lookahead_symbol;
	}
}

class LR1_closure {
	constructor() {
		this.lr1_closure = [];
	}
	equal(another_LR1_closure) {
		if (this.lr1_closure.length != another_LR1_closure.lr1_closure.length) return false;
		let count = 0;
		for (let i = 0; i < this.lr1_closure.length; ++i) {
			for (let j = 0; j < another_LR1_closure.lr1_closure.length; ++j) {
				if (this.lr1_closure[i].equal(another_LR1_closure.lr1_closure[j])) {
					++count;
					break;
				}
			}
		}
		return count == this.lr1_closure.length;
	}
}

// LR1文法
class LR1 extends Grammar {
	constructor(grammar_file_content) {
		super(grammar_file_content);
		if (grammar_file_content.length == 0) {
			return;
		}
		// 整个项集族
		this.lr1_cluster = [];
		// goto信息记录表，映射关系为：{当前closure在lr1_cluster中的标号，当前符号在symbols中标号} -> 转移到的closure在lr1_cluster中的标号
		this.goto_info = new Map();
		// GOTO表，GOTO[i,A]=j，只用到Action Error(表示未定义)和ShiftIn(表示转移)
		this.goto_table = new Map();
		//ACTION表，ACTION[i, A] = "移入/规约/接受"
		this.action_table = new Map();
		// 语法树节点列表
		this.node_list = [];
		// 生成LR1项集，存储在lr1_closure中
		this.generateCluster();
		// 生成Table
		this.generateTable();
	}
	// 生成LR1项集
	generateCluster() {
		// 初始化lr1_cluster({S → ·Program, $})
		let initial_item = new LR1_item(this.find_symbol_index_by_token(this.ExtendStartToken), [this.find_symbol_index_by_token(this.StartToken)], this.start_production, 0, this.find_symbol_index_by_token(this.EndToken));
		let initial_closure = new LR1_closure();
		initial_closure.lr1_closure.push(initial_item);

		// 放进cluster中
		this.lr1_cluster.push(this.generateClosure(initial_closure));

		// 遍历lr1_cluster中的每一项
		for (let i = 0; i < this.lr1_cluster.length; ++i) {
			// 遍历所有文法符号
			for (let s = 0; s < this.symbols.length; ++s) {
				// 只有为终结符或非终结符才进行下一步
				if (this.symbols[s].type != Symbol_type.NonTerminal && this.symbols[s].type != Symbol_type.Terminal) continue;
				// 得到输入符号s会到达的closure
				let to_closure = this.generateGOTO(this.lr1_cluster[i], s);
				// 如果为空，则continue
				if (to_closure.lr1_closure.length == 0) continue;
				// 如果已经存在，则记录编号
				let exist_index = -1;
				for (let j = 0; j < this.lr1_cluster.length; j++) {
					if (this.lr1_cluster[j].equal(to_closure)) {
						exist_index = j;
						break;
					}
				}
				if (exist_index != -1) this.goto_info.set(String(i) + " " + String(s), exist_index);
				else {
					// 不存在，则加入lr1_cluster
					this.lr1_cluster.push(to_closure);
					// 记录转移关系
					this.goto_info.set(String(i) + " " + String(s), this.lr1_cluster.length - 1);
				}
			}
		}
	}
	// 生成Table
	generateTable() {
		for (let closure_index = 0; closure_index < this.lr1_cluster.length; ++closure_index) {
			for (let lr1_item_index = 0; lr1_item_index < this.lr1_cluster[closure_index].lr1_closure.length; ++lr1_item_index) {
				let present_lr1_item = this.lr1_cluster[closure_index].lr1_closure[lr1_item_index];
				// 如果·已在末尾
				if (present_lr1_item.dot_position >= present_lr1_item.right_symbol.length) {
					// 如果不为扩展开始符号，则进行规约
					console.log("this.symbols: ", this.symbols);
					console.log("present_lr1_item.left_symbol", present_lr1_item.left_symbol);
					console.log("this.symbols[present_lr1_item.left_symbol]", this.symbols[present_lr1_item.left_symbol]);
					if (this.symbols[present_lr1_item.left_symbol].token != this.ExtendStartToken) {
						// 如果不为扩展开始符号，则进行规约
						this.action_table.set(String(closure_index) + " " + String(present_lr1_item.lookahead_symbol), new ActionInfo(Action.Reduce, present_lr1_item.index));
					}
					else {
						// 否则为接受
						this.action_table.set(String(closure_index) + " " + String(present_lr1_item.lookahead_symbol), new ActionInfo(Action.Accept, -1));
					}
				}
				else {
					// 如果·不在末尾
					let next_symbol = present_lr1_item.right_symbol[present_lr1_item.dot_position];
					// 如果不是终结符，则在goto表中标出
					if (this.symbols[next_symbol].type == Symbol_type.NonTerminal) {
						// 在goto表中寻找
						let it = this.goto_info.get(String(closure_index) + " " + String(next_symbol));
						// 如果找到，进行移进
						if (it != undefined) {
							this.goto_table.set(String(closure_index) + " " + String(next_symbol), new ActionInfo(Action.ShiftIn, it));
						}
					}
					// 否则在action表中标出
					else if (this.symbols[next_symbol].type == Symbol_type.Terminal) {
						// 在goto表中寻找
						let it = this.goto_info.get(String(closure_index) + " " + String(next_symbol));
						// 如果找到，进行移进
						if (it != undefined) {
							this.action_table.set(String(closure_index) + " " + String(next_symbol), new ActionInfo(Action.ShiftIn, it));
						}
					}
				}
			}
		}
	}
	// 生成闭包
	generateClosure(initial_closure) {
		for (let i = 0; i < initial_closure.lr1_closure.length; ++i) {
			let present_lr1_item = initial_closure.lr1_closure[i];
			// ·在最后一个位置，则其后继没有非终结符
			if (present_lr1_item.dot_position >= present_lr1_item.right_symbol.length) continue;
			// ·后的符号
			let next_symbol_index = present_lr1_item.right_symbol[present_lr1_item.dot_position];
			let next_symbol = this.symbols[next_symbol_index];
			// 如果·后的符号为终结符
			if (next_symbol.type == Symbol_type.Terminal) continue;
			// 如果·后的符号为ε，则 -> ·ε 直接变为 -> ε·
			if (next_symbol.type == Symbol_type.Epsilon) {
				initial_closure.lr1_closure.dot_position++;
				continue;
			}
			// 其他情况，·后符号为非终结符
			// 得到first集（A->α·Bβ, a 则求βa的first集）
			let BetaA = present_lr1_item.right_symbol.slice(present_lr1_item.dot_position + 1, present_lr1_item.right_symbol.length);
			BetaA.push(present_lr1_item.lookahead_symbol);
			let BetaAFirstSet = this.get_first_of_string(BetaA);
			// 查找以next_symbol_index开始的production
			for (let j = 0; j < this.productions.length; ++j) {
				let present_production = this.productions[j];
				if (present_production.left_symbol != next_symbol_index) continue;
				// 查找到以next_symbol_index开始的production，开始加入initial_closure
				for (let it = 0; it < BetaAFirstSet.length; ++it) {
					let tmp = 0;
					// 如果是ε产生式，则直接加入->ε·项，从而不引出ε转移边
					if (this.symbols[present_production.right_symbol[0]].type == Symbol_type.Epsilon) {
						// 确保当前不含这一项再加入
						for (tmp = 0; tmp < initial_closure.lr1_closure.length; ++tmp) {
							if (initial_closure.lr1_closure[tmp].equal(new LR1_item(present_production.left_symbol, present_production.right_symbol, j, 1, BetaAFirstSet[it]))) break;
						}
						if (tmp == initial_closure.lr1_closure.length)
							initial_closure.lr1_closure.push(new LR1_item(present_production.left_symbol, present_production.right_symbol, j, 1, BetaAFirstSet[it]));
					}
					else {
						// 确保当前不含这一项再加入
						for (tmp = 0; tmp < initial_closure.lr1_closure.length; ++tmp) {
							if (initial_closure.lr1_closure[tmp].equal(new LR1_item(present_production.left_symbol, present_production.right_symbol, j, 0, BetaAFirstSet[it]))) break;
						}
						if (tmp == initial_closure.lr1_closure.length)
							initial_closure.lr1_closure.push(new LR1_item(present_production.left_symbol, present_production.right_symbol, j, 0, BetaAFirstSet[it]));
					}
				}
			}
		}
		return initial_closure;
	}
	// 生成GOTO的closure
	generateGOTO(from_closure, present_symbol) {
		let to_closure = new LR1_closure();
		// 判断一下present_symbol是不是非终结符或终结符（虽然按理来说应该已经判断过了），如果不合要求返回空
		if (this.symbols[present_symbol].type != Symbol_type.NonTerminal && this.symbols[present_symbol].type != Symbol_type.Terminal)
			return to_closure;
		for (let lr1_item_it = 0; lr1_item_it < from_closure.lr1_closure.length; ++lr1_item_it) {
			// 如果dot在最后
			if (from_closure.lr1_closure[lr1_item_it].dot_position >= from_closure.lr1_closure[lr1_item_it].right_symbol.length)
				continue;
			// 如果后面一个字符不是present_symbol
			if (from_closure.lr1_closure[lr1_item_it].right_symbol[from_closure.lr1_closure[lr1_item_it].dot_position] != present_symbol)
				continue;
			// 后面一个字符就是present_symbol
			to_closure.lr1_closure.push(new LR1_item(from_closure.lr1_closure[lr1_item_it].left_symbol, from_closure.lr1_closure[lr1_item_it].right_symbol, from_closure.lr1_closure[lr1_item_it].index, from_closure.lr1_closure[lr1_item_it].dot_position + 1, from_closure.lr1_closure[lr1_item_it].lookahead_symbol));
		}
		return this.generateClosure(to_closure);
	}
	// 打印Table
	generateTableArray() {
		let table_array = [], tmp_array = [];
		let err_msg = " ";

		tmp_array.push("STATUS");

		for (let ter = 0; ter < this.terminals.length; ++ter) {
			tmp_array.push(this.symbols[this.terminals[ter]].token);
		}
		for (let non_ter = 0; non_ter < this.non_terminals.length; ++non_ter) {
			if (this.symbols[this.non_terminals[non_ter]].token == this.ExtendStartToken) {
				continue;
			}
			tmp_array.push(this.symbols[this.non_terminals[non_ter]].token);
		}

		table_array.push(tmp_array);
		tmp_array = [];

		for (let i = 0; i < this.lr1_cluster.length; ++i) {

			tmp_array.push(i);

			for (let ter = 0; ter < this.terminals.length; ++ter) {
				let iter = this.action_table.get(String(i) + " " + String(this.terminals[ter]));
				if (iter == undefined) {
					tmp_array.push(err_msg);
				}
				else {
					let out_msg = "";
					if (iter.action == Action.Accept) {
						out_msg += "acc";
					}
					else if (iter.action == Action.Reduce) {
						out_msg += "r" + String(iter.info);
					}
					else if (iter.action == Action.ShiftIn) {
						out_msg += "s" + String(iter.info)
					}
					tmp_array.push(out_msg);
				}
			}

			for (let non_ter = 0; non_ter < this.non_terminals.length; ++non_ter) {
				if (this.symbols[this.non_terminals[non_ter]].token == this.ExtendStartToken) {
					continue;
				}
				let iter = this.goto_table.get(String(i) + " " + String(this.non_terminals[non_ter]));
				if (iter == undefined) {
					tmp_array.push(err_msg);
				}
				else {
					tmp_array.push(iter.info);
				}
			}
			table_array.push(tmp_array);
			tmp_array = [];
		}
		return table_array;
	}
	// 进行语法分析
	parser(token_stream, id_list, const_list) {
		// let out_string = "";
		let parse_array = [], tmp_array = [];
		let tmp = 0;
		this.node_list = [];

		// 在token_stream的末尾添加EndToken
		token_stream.push({ type: this.EndToken, prop: this.EndToken, row: -1, col: -1 });
		// 定义符号栈
		let symbol_stack = [];
		// 定义状态栈
		let status_stack = [];
		// 记录步骤
		let step = 1;
		// 记录树节点
		let tmp_stack = [];

		// 用于输出的格式化
		// let step_len = 5, status_len = 200, symbol_len = 300, input_len = 200, production_len = 60;
		// 输出一行的函数
		let print_line = (i, production_index) => {
			// 输出第几步
			tmp_array.push(step++);
			// out_string += times(" ", step_len - String(step).length) + String(step++);
			// 状态栈的string
			let status_stack_str = "";
			for (let status = 0; status < status_stack.length; ++status) {
				status_stack_str += " " + String(status_stack[status]);
			}
			tmp_array.push(status_stack_str);
			// out_string += times(" ", status_len - status_stack_str.length) + status_stack_str;
			// 符号栈的string
			let symbol_stack_str = "";
			for (let symbol = 0; symbol < symbol_stack.length; ++symbol) {
				symbol_stack_str += "(" + String(symbol_stack[symbol]) + "," + this.symbols[symbol_stack[symbol]].token + ")";
			}
			tmp_array.push(symbol_stack_str);
			// out_string += times(" ", symbol_len - symbol_stack_str.length) + symbol_stack_str;
			// 输入串的string
			let input_str = "";
			for (let token = i; token < token_stream.length; ++token) {
				input_str += token_stream[token].type;
			}
			tmp_array.push(input_str);
			// out_string += times(" ", input_len - input_str.length) + input_str;
			// 产生式的string
			if (production_index != -1) {
				let production_str = "";
				production_str += this.symbols[this.productions[production_index].left_symbol].token;
				production_str += " ::= ";
				for (let production_right_symbol = 0; production_right_symbol < this.productions[production_index].right_symbol.length; ++production_right_symbol) {
					production_str += this.symbols[this.productions[production_index].right_symbol[production_right_symbol]].token + " ";
				}
				tmp_array.push(production_str);
				// out_string += times(" ", production_len - production_str.length) + production_str;
			}
			parse_array.push(tmp_array);
			tmp_array = [];
			// out_string += "\n";
		};

		// 输出
		// out_string += times(" ", step_len - 4) + "步骤" + times(" ", status_len - 4) + "状态" + times(" ", symbol_len - 4) + "符号" + times(" ", input_len - 4) + "输入串" + times(" ", production_len - 6) + "产生式" + "\n";

		// 初始化栈
		symbol_stack.push(this.find_symbol_index_by_token(this.EndToken));
		status_stack.push(0);

		// 输出
		print_line(0, -1);

		// 对token_stream中的每一个符号进行遍历
		for (let i = 0; i < token_stream.length; ++i) {
			let current_state = status_stack[status_stack.length - 1];
			let current_token_index = this.find_symbol_index_by_token(token_stream[i].type);
			// 如果找不到这一符号
			if (current_token_index == -1) {
				err_string_2 = "待分析字符流中出现了未在文法中进行定义的终结符";
				console.log(err_string_2);
				throw (err_code.GRAMMATICAL_ERROR_UNDEFINED_WORD);
			}
			let current_action_iter = this.action_table.get(String(current_state) + " " + String(current_token_index));
			// 如果没有找到，进行报错
			if (current_action_iter == undefined) {
				err_string_2 = "语法分析过程中在（第" + token_stream[i].row + "行，第" + token_stream[i].col + "列）发现错误";
				console.log(err_string_2)
				throw (err_code.GRAMMATICAL_ERROR_CANNOT_ANALYSIS)
			}
			// 当前ActionInfo
			let current_actioninfo = current_action_iter;
			// 根据ActionInfo的类别进行相应的动作
			switch (current_actioninfo.action) {
				// 移进
				case Action.ShiftIn: {
					symbol_stack.push(current_token_index);
					status_stack.push(current_actioninfo.info);
					tmp_stack.push(tmp);
					if (token_stream[i].type == "<ID>") {
						this.node_list.push({ name: id_list[token_stream[i].prop - 1].value, children: [] })
					}
					else if (token_stream[i].type == "<INT>") {
						console.log("test: ", const_list[token_stream[i].prop])
						this.node_list.push({ name: const_list[token_stream[i].prop - 1].value, children: [] })
					}
					else {
						this.node_list.push({ name: token_stream[i].type, children: [] })
					}
					++tmp;
					print_line(i + 1, -1);
					break;
				}
				// 规约
				case Action.Reduce: {
					// 规约使用的production
					let production_index = current_actioninfo.info;
					let production = this.productions[production_index];
					let tmp_left = [];
					// 非空串需要出栈 空串由于右部为空不需要出栈(直接push空串对应产生式左部非终结符即可)
					if (this.symbols[production.right_symbol[0]].type != Symbol_type.Epsilon) {
						let count = production.right_symbol.length;
						while (count--) {
							symbol_stack.pop();
							status_stack.pop();
							tmp_left.push(tmp_stack.pop());
						}
					}
					// 在goto表中寻找
					let current_goto_iter = this.goto_table.get(String(status_stack[status_stack.length - 1]) + " " + String(production.left_symbol));
					// 找不到则报错
					if (current_goto_iter == undefined) {
						err_string_2 = "语法分析过程中在（第" + token_stream[i].row + "行，第" + token_stream[i].col + "列）发现错误";
						throw (err_code.GRAMMATICAL_ERROR_CANNOT_ANALYSIS);
					}
					// 移入符号栈和状态栈
					symbol_stack.push(production.left_symbol);
					status_stack.push(current_goto_iter.info);

					tmp_stack.push(tmp);
					this.node_list.push({ name: this.symbols[production.left_symbol].token, children: [] });
					++tmp;

					// 进行输出
					print_line(i, production_index);

					if (tmp_left.length != 0) {
						for (let j = 0; j < tmp_left.length; ++j) {
							this.node_list[tmp - 1].children.splice(0, 0, this.node_list[tmp_left[j]]);
						}
					}
					else {
						// 空串
						this.node_list[tmp - 1].children.splice(0, 0, { name: "@" })
					}

					// 此时i不加1
					--i;
					break;
				}
				// 接受
				case Action.Accept: {
					// 输出acc
					tmp_array.push(step++);
					tmp_array.push("acc!");
					parse_array.push(tmp_array);
					tmp_array = [];
					// out_string += times(" ", step_len - String(step).length) + String(step++) + times(" ", status_len - 4) + "acc!\n";
					return parse_array;
				}
				// 错误
				case Action.Error: {
					return parse_array;
				}
			}
		}
	}
}

export { LR1, err_string_2 }